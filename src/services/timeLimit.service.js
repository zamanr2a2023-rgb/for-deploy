// src/services/timeLimit.service.js
import { prisma } from '../prisma.js';

// Configuration - Can be moved to environment variables
const RESPONSE_TIME_MINUTES = 100; // 30 minutes to respond
const WARNING_TIME_MINUTES = 5;   // Warning 5 minutes before expiry

// In-memory storage for work order deadlines
const workOrderDeadlines = new Map();
const pendingTimeouts = new Map();

/**
 * Set response deadline for work order when assigned
 */
export const setResponseDeadline = async (woId, customMinutes = RESPONSE_TIME_MINUTES) => {
  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + customMinutes);
  
  // Store deadline in memory
  workOrderDeadlines.set(woId, {
    deadline,
    warningTime: new Date(deadline.getTime() - (WARNING_TIME_MINUTES * 60 * 1000)),
    isExpired: false
  });
  
  // Schedule warning notification
  scheduleWarningNotification(woId, customMinutes - WARNING_TIME_MINUTES);
  
  // Schedule expiry check
  scheduleExpiryCheck(woId, customMinutes);
  
  console.log(`⏰ Set ${customMinutes}min deadline for WO ${woId}, expires at ${deadline.toLocaleTimeString()}`);
  return deadline;
};

/**
 * Clear deadline when technician responds
 */
export const clearResponseDeadline = (woId) => {
  workOrderDeadlines.delete(woId);
  
  // Clear pending timeouts
  if (pendingTimeouts.has(`warning_${woId}`)) {
    clearTimeout(pendingTimeouts.get(`warning_${woId}`));
    pendingTimeouts.delete(`warning_${woId}`);
  }
  
  if (pendingTimeouts.has(`expiry_${woId}`)) {
    clearTimeout(pendingTimeouts.get(`expiry_${woId}`)); 
    pendingTimeouts.delete(`expiry_${woId}`);
  }
  
  console.log(`✅ Cleared deadline for WO ${woId} - technician responded in time`);
};

/**
 * Check if work order response has expired
 */
export const isWorkOrderExpired = (woId) => {
  const deadlineData = workOrderDeadlines.get(woId);
  if (!deadlineData) return false;
  
  const now = new Date();
  return now > deadlineData.deadline;
};

/**
 * Get remaining time for work order response
 */
export const getRemainingTime = (woId) => {
  const deadlineData = workOrderDeadlines.get(woId);
  if (!deadlineData) return null;
  
  const now = new Date();
  const remainingMs = deadlineData.deadline.getTime() - now.getTime();
  
  if (remainingMs <= 0) {
    return { expired: true, minutes: 0, formatted: 'Expired' };
  }
  
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  
  return {
    expired: false,
    minutes: remainingMinutes,
    formatted: `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} remaining`,
    deadline: deadlineData.deadline
  };
};

/**
 * Handle expired work order
 */
const handleExpiredWorkOrder = async (woId) => {
  try {
    const wo = await prisma.workOrder.findUnique({
      where: { id: woId },
      include: {
        technician: { select: { id: true, name: true, phone: true } },
        dispatcher: { select: { id: true, name: true } }
      }
    });
    
    if (!wo || wo.status !== 'ASSIGNED') {
      console.log(`⏭️ WO ${woId} already handled or not assigned`);
      return null;
    }
    
    // Mark deadline as expired in memory
    const deadlineData = workOrderDeadlines.get(woId);
    if (deadlineData) {
      deadlineData.isExpired = true;
    }
    
    // Unassign technician and mark as unassigned
    const updated = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: 'UNASSIGNED',
        technicianId: null,
        cancelReason: 'Response timeout - technician did not respond within time limit'
      }
    });
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: wo.technicianId || 1, // Fallback to admin user
        action: 'WO_RESPONSE_EXPIRED',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        metadataJson: JSON.stringify({
          originalTechnicianId: wo.technicianId,
          expiredAt: new Date(),
          timeoutMinutes: RESPONSE_TIME_MINUTES
        })
      }
    });
    
    // Create notification for dispatcher
    if (wo.dispatcherId) {
      await prisma.notification.create({
        data: {
          userId: wo.dispatcherId,
          type: 'WO_EXPIRED',
          title: 'Work Order Response Timeout',
          message: `Work order ${wo.woNumber} expired - technician ${wo.technician?.name || 'Unknown'} did not respond within ${RESPONSE_TIME_MINUTES} minutes`,
          metadataJson: JSON.stringify({ woId: wo.id, woNumber: wo.woNumber })
        }
      });
    }
    
    // Clean up memory
    clearResponseDeadline(woId);
    
    console.log(`🕐 Work Order ${wo.woNumber} expired and unassigned from technician ${wo.technician?.name}`);
    
    return updated;
  } catch (error) {
    console.error(`Error handling expired work order ${woId}:`, error);
    return null;
  }
};

/**
 * Schedule warning notification (5 minutes before expiry)
 */
const scheduleWarningNotification = (woId, delayMinutes) => {
  if (delayMinutes <= 0) return; // No warning if less than warning time
  
  const timeoutId = setTimeout(async () => {
    try {
      const wo = await prisma.workOrder.findUnique({
        where: { id: woId },
        include: { technician: { select: { id: true, name: true } } }
      });
      
      if (wo && wo.status === 'ASSIGNED' && wo.technicianId) {
        const remaining = getRemainingTime(woId);
        
        await prisma.notification.create({
          data: {
            userId: wo.technicianId,
            type: 'WO_TIMEOUT_WARNING',
            title: 'Response Time Warning',
            message: `Work order ${wo.woNumber} requires response in ${remaining?.minutes || WARNING_TIME_MINUTES} minutes or it will be automatically unassigned`,
            metadataJson: JSON.stringify({ 
              woId: wo.id, 
              woNumber: wo.woNumber,
              remainingMinutes: remaining?.minutes || WARNING_TIME_MINUTES
            })
          }
        });
        
        console.log(`⚠️ Sent timeout warning for WO ${wo.woNumber} to technician ${wo.technician?.name}`);
      }
      
      pendingTimeouts.delete(`warning_${woId}`);
    } catch (error) {
      console.error(`Error sending warning for WO ${woId}:`, error);
    }
  }, delayMinutes * 60 * 1000);
  
  pendingTimeouts.set(`warning_${woId}`, timeoutId);
};

/**
 * Schedule expiry check
 */
const scheduleExpiryCheck = (woId, delayMinutes) => {
  const timeoutId = setTimeout(async () => {
    await handleExpiredWorkOrder(woId);
    pendingTimeouts.delete(`expiry_${woId}`);
  }, delayMinutes * 60 * 1000);
  
  pendingTimeouts.set(`expiry_${woId}`, timeoutId);
};

/**
 * Get all active deadlines (for monitoring)
 */
export const getActiveDeadlines = () => {
  const active = [];
  const now = new Date();
  
  for (const [woId, deadlineData] of workOrderDeadlines.entries()) {
    const remaining = deadlineData.deadline.getTime() - now.getTime();
    active.push({
      woId,
      deadline: deadlineData.deadline,
      remainingMs: remaining,
      expired: remaining <= 0,
      isExpired: deadlineData.isExpired
    });
  }
  
  return active;
};

/**
 * Manual cleanup of expired work orders (can be called via API or cron)
 */
export const checkAndCleanupExpiredWorkOrders = async () => {
  const active = getActiveDeadlines();
  const expired = active.filter(item => item.expired && !item.isExpired);
  
  console.log(`🧹 Checking ${active.length} active deadlines, found ${expired.length} expired`);
  
  for (const item of expired) {
    await handleExpiredWorkOrder(item.woId);
  }
  
  return expired;
};

// Export configuration for external use
export const TIME_CONFIG = {
  RESPONSE_TIME_MINUTES,
  WARNING_TIME_MINUTES
};