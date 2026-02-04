/** @format */

// src/controllers/wo.controller.js
import { prisma } from "../prisma.js";
import {
  notifyWOAssignment,
  notifyWOAccepted,
  notifyWOCompleted,
} from "../services/notification.service.js";
import {
  setResponseDeadline,
  clearResponseDeadline,
  isWorkOrderExpired,
  getRemainingTime,
  TIME_CONFIG,
} from "../services/timeLimit.service.js";

const generateWONumber = () => "WO-" + Date.now();

export const getWOById = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    // Find WO by either numeric ID or woNumber
    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const workOrder = await prisma.workOrder.findFirst({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        technician: {
          select: { id: true, name: true, phone: true, role: true },
        },
        dispatcher: {
          select: { id: true, name: true, phone: true },
        },
        category: {
          select: { id: true, name: true, description: true },
        },
        service: {
          select: { id: true, name: true, description: true },
        },
        subservice: {
          select: { id: true, name: true, description: true, baseRate: true },
        },
        serviceRequest: {
          select: {
            id: true,
            srNumber: true,
            description: true,
            priority: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true,
          },
        },
        commissions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!workOrder) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    // Check access permissions
    if (userRole === "CUSTOMER" && workOrder.customerId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Technicians can only view work orders assigned to them or unassigned ones they might accept
    if (
      (userRole === "TECH_INTERNAL" || userRole === "TECH_FREELANCER") &&
      workOrder.technicianId &&
      workOrder.technicianId !== userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Admin, dispatcher, and call center can view all work orders
    // No restriction needed for these roles

    return res.json(workOrder);
  } catch (err) {
    next(err);
  }
};

export const getAllWorkOrders = async (req, res, next) => {
  try {
    const {
      status,
      technicianId,
      customerId,
      priority,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (technicianId) where.technicianId = Number(technicianId);
    if (customerId) where.customerId = Number(customerId);
    if (priority) where.priority = priority;

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          customer: {
            // select: { id: true, firstName: true, lastName: true, phone: true }
          },
          technician: {
            // select: { id: true, firstName: true, lastName: true, phone: true }
          },
          dispatcher: {
            // select: { id: true, firstName: true, lastName: true }
          },
          category: {
            select: { id: true, name: true },
          },
          service: {
            select: { id: true, name: true },
          },
          subservice: {
            select: { id: true, name: true, baseRate: true },
          },
          serviceRequest: {
            select: { id: true, srNumber: true },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              status: true,
              proofUrl: true,
              createdAt: true,
            },
          },
          commissions: {
            select: {
              id: true,
              type: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: Number(offset),
        take: Number(limit),
      }),
      prisma.workOrder.count({ where }),
    ]);

    return res.json({
      workOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createWOFromSR = async (req, res, next) => {
  try {
    // Validate srId parameter
    const srIdParam = req.params.srId;
    if (!srIdParam || isNaN(srIdParam)) {
      return res.status(400).json({
        message: "Valid Service Request ID is required",
        error: "INVALID_SR_ID",
      });
    }

    const srId = Number(srIdParam);
    const { technicianId, scheduledAt, notes, estimatedDuration } = req.body;
    const dispatcherId = req.user.id;

    // Validate dispatcher exists
    const dispatcher = await prisma.user.findUnique({
      where: { id: dispatcherId },
      select: { id: true, role: true, name: true },
    });

    if (!dispatcher) {
      return res.status(404).json({
        message: "Dispatcher/Admin user not found",
        error: "DISPATCHER_NOT_FOUND",
        details: `User ID ${dispatcherId} does not exist in database`,
      });
    }

    if (!["DISPATCHER", "ADMIN"].includes(dispatcher.role)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        error: "INVALID_DISPATCHER_ROLE",
        details: `User role: ${dispatcher.role}`,
      });
    }

    // Additional validation for technicianId if provided
    if (technicianId && isNaN(technicianId)) {
      return res.status(400).json({
        message: "Valid Technician ID is required",
        error: "INVALID_TECHNICIAN_ID",
      });
    }

    // Validate technician exists and has valid role
    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: Number(technicianId) },
        select: {
          id: true,
          role: true,
          isBlocked: true,
          name: true
        },
      });

      if (!technician) {
        return res.status(404).json({
          message: "Technician not found",
          error: "TECHNICIAN_NOT_FOUND"
        });
      }

      if (!["TECH_INTERNAL", "TECH_FREELANCER"].includes(technician.role)) {
        return res.status(400).json({
          message: "User is not a technician",
          error: "INVALID_TECHNICIAN_ROLE",
          details: `User role: ${technician.role}`
        });
      }

      if (technician.isBlocked) {
        return res.status(400).json({
          message: "Technician is blocked",
          error: "TECHNICIAN_BLOCKED"
        });
      }
    }

    const sr = await prisma.serviceRequest.findUnique({
      where: { id: srId },
    });

    if (!sr) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    if (sr.status === "CONVERTED_TO_WO") {
      return res.status(400).json({ message: "SR already converted to WO" });
    }

    const wo = await prisma.workOrder.create({
      data: {
        woNumber: generateWONumber(),
        srId: sr.id,
        customerId: sr.customerId,
        technicianId: technicianId ? Number(technicianId) : null,
        dispatcherId,
        categoryId: sr.categoryId,
        subserviceId: sr.subserviceId,
        serviceId: sr.serviceId,
        address: sr.address,
        latitude: sr.latitude,
        longitude: sr.longitude,
        estimatedDuration: estimatedDuration ? Number(estimatedDuration) : null,
        paymentType: sr.paymentType,
        priority: sr.priority,
        status: technicianId ? "ASSIGNED" : "UNASSIGNED",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || null,
      },
    });

    await prisma.serviceRequest.update({
      where: { id: sr.id },
      data: { status: "CONVERTED_TO_WO" },
    });

    await prisma.auditLog.create({
      data: {
        userId: dispatcherId,
        action: "WO_CREATED_FROM_SR",
        entityType: "WORK_ORDER",
        entityId: wo.id,
      },
    });

    // Send notifications
    if (technicianId) {
      await notifyWOAssignment(Number(technicianId), wo);

      // Notify customer that SR has been assigned
      const { notifySRAssigned } = await import(
        "../services/notification.service.js"
      );
      const technician = await prisma.user.findUnique({
        where: { id: Number(technicianId) },
        select: { name: true },
      });
      if (technician) {
        await notifySRAssigned(sr, wo, technician);
      }
    }

    // Real-time notification removed - notifications stored in database only
    console.log(`📋 Work Order created: ${wo.woNumber}`);

    return res.status(201).json(wo);
  } catch (err) {
    next(err);
  }
};

export const assignWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({ message: "technicianId is required" });
    }

    const tech = await prisma.user.findUnique({
      where: { id: Number(technicianId) },
    });

    if (!tech) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (tech.isBlocked) {
      return res.status(400).json({ message: "Technician is blocked" });
    }

    // Find WO by either numeric ID or woNumber
    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const wo = await prisma.workOrder.update({
      where: whereClause,
      data: {
        technicianId: Number(technicianId),
        status: "ASSIGNED",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "WO_ASSIGNED",
        entityType: "WORK_ORDER",
        entityId: wo.id,
        metadataJson: JSON.stringify({ technicianId }),
      },
    });

    await notifyWOAssignment(Number(technicianId), wo);

    // Set response deadline for technician
    const deadline = await setResponseDeadline(
      wo.id,
      TIME_CONFIG.RESPONSE_TIME_MINUTES
    );

    return res.json({
      ...wo,
      responseDeadline: deadline,
      timeLimit: {
        responseTimeMinutes: TIME_CONFIG.RESPONSE_TIME_MINUTES,
        warningTimeMinutes: TIME_CONFIG.WARNING_TIME_MINUTES,
        deadline: deadline,
        message: `You have ${TIME_CONFIG.RESPONSE_TIME_MINUTES} minutes to accept or decline this work order`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const reassignWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;
    const { technicianId, scheduledAt, estimatedDuration, notes } = req.body;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    // Find WO by either numeric ID or woNumber
    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const existingWO = await prisma.workOrder.findUnique({
      where: whereClause,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingWO) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    // Validate technician if provided
    if (technicianId) {
      const tech = await prisma.user.findUnique({
        where: { id: Number(technicianId) },
      });

      if (!tech) {
        return res.status(404).json({ message: "Technician not found" });
      }

      if (tech.isBlocked) {
        return res.status(400).json({ message: "Technician is blocked" });
      }

      if (!["TECH_INTERNAL", "TECH_FREELANCER"].includes(tech.role)) {
        return res.status(400).json({ message: "User is not a technician" });
      }
    }

    // Prepare update data
    const updateData = {};

    if (technicianId !== undefined) {
      updateData.technicianId = technicianId ? Number(technicianId) : null;
      // If reassigning to a different technician or removing technician
      if (technicianId && existingWO.technicianId !== Number(technicianId)) {
        updateData.status = "ASSIGNED";
        // Clear response deadline if reassigning
        await clearResponseDeadline(existingWO.id);
      } else if (!technicianId) {
        updateData.status = "UNASSIGNED";
        await clearResponseDeadline(existingWO.id);
      }
    }

    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (estimatedDuration !== undefined) {
      updateData.estimatedDuration = estimatedDuration
        ? Number(estimatedDuration)
        : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Update work order
    const wo = await prisma.workOrder.update({
      where: whereClause,
      data: updateData,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "WO_REASSIGNED",
        entityType: "WORK_ORDER",
        entityId: wo.id,
        metadataJson: JSON.stringify({
          previousTechnicianId: existingWO.technicianId,
          newTechnicianId: technicianId ? Number(technicianId) : null,
          scheduledAt,
          estimatedDuration,
          notes,
        }),
      },
    });

    // Send notification if technician changed
    if (technicianId && existingWO.technicianId !== Number(technicianId)) {
      await notifyWOAssignment(Number(technicianId), wo);
      // Set new response deadline
      const deadline = await setResponseDeadline(
        wo.id,
        TIME_CONFIG.RESPONSE_TIME_MINUTES
      );

      return res.json({
        ...wo,
        message: "Work order reassigned successfully",
        responseDeadline: deadline,
        timeLimit: {
          responseTimeMinutes: TIME_CONFIG.RESPONSE_TIME_MINUTES,
          warningTimeMinutes: TIME_CONFIG.WARNING_TIME_MINUTES,
          deadline: deadline,
        },
      });
    }

    return res.json({
      ...wo,
      message: "Work order updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const rescheduleWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const { scheduledDate, scheduledTime, estimatedDuration, notes } = req.body;

    // Validate required fields
    if (!scheduledDate) {
      return res.status(400).json({ message: "Scheduled date is required" });
    }

    if (!scheduledTime) {
      return res.status(400).json({ message: "Scheduled time is required" });
    }

    // Find existing work order
    const existingWO = await prisma.workOrder.findFirst({
      where: whereClause,
      include: {
        technician: true,
        customer: true,
      },
    });

    if (!existingWO) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    // Check if WO can be rescheduled
    const nonReschedulableStatuses = ["COMPLETED", "CANCELLED"];
    if (nonReschedulableStatuses.includes(existingWO.status)) {
      return res.status(400).json({
        message: `Cannot reschedule work order with status: ${existingWO.status}`,
      });
    }

    // Combine date and time into ISO string
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

    // Validate the date is in the future
    if (scheduledAt < new Date()) {
      return res.status(400).json({
        message: "Scheduled date and time must be in the future",
      });
    }

    // Update work order
    const wo = await prisma.workOrder.update({
      where: whereClause,
      data: {
        scheduledAt,
        estimatedDuration: estimatedDuration
          ? Number(estimatedDuration) * 60
          : existingWO.estimatedDuration, // Convert hours to minutes
        notes: notes || existingWO.notes,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        serviceRequest: {
          select: {
            id: true,
            srNumber: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "WO_RESCHEDULED",
        entityType: "WORK_ORDER",
        entityId: wo.id,
        metadataJson: JSON.stringify({
          previousScheduledAt: existingWO.scheduledAt,
          newScheduledAt: scheduledAt,
          estimatedDuration,
          notes,
        }),
      },
    });

    // TODO: Send notification to technician and customer about reschedule
    // await notifyWORescheduled(wo);

    return res.json({
      ...wo,
      message: "Work order rescheduled successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const respondWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };
    const { action, declineReason } = req.body;
    const techId = req.user.id;

    // Validate action
    if (!action) {
      return res.status(400).json({ message: "Action is required" });
    }

    const validActions = ["ACCEPT", "DECLINE"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        message: `Invalid action. Must be one of: ${validActions.join(", ")}`,
      });
    }

    // Decline reason is optional but recommended
    // if (action === "DECLINE" && !declineReason) {
    //   return res.status(400).json({
    //     message: "Decline reason is required when declining a work order",
    //   });
    // }

    const wo = await prisma.workOrder.findUnique({
      where: whereClause,
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (wo.technicianId !== techId) {
      return res
        .status(403)
        .json({ message: "This WO does not belong to you" });
    }

    if (wo.status !== "ASSIGNED") {
      return res.status(400).json({ message: "WO is not in ASSIGNED status" });
    }

    // Check if response time has expired
    if (isWorkOrderExpired(wo.id)) {
      return res.status(410).json({
        message:
          "Response time expired. This work order has been automatically unassigned.",
        code: "RESPONSE_TIMEOUT",
      });
    }

    const remainingTime = getRemainingTime(wo.id);

    let updated;

    if (action === "ACCEPT") {
      updated = await prisma.workOrder.update({
        where: whereClause,
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    } else if (action === "DECLINE") {
      updated = await prisma.workOrder.update({
        where: whereClause,
        data: {
          status: "UNASSIGNED",
          technicianId: null,
          cancelReason: declineReason, // Store the decline reason
        },
      });
    } else {
      return res
        .status(400)
        .json({ message: "Invalid action, use ACCEPT or DECLINE" });
    }

    await prisma.auditLog.create({
      data: {
        userId: techId,
        action: "WO_RESPOND",
        entityType: "WORK_ORDER",
        entityId: wo.id,
        metadataJson: JSON.stringify({ action, declineReason }),
      },
    });

    // Clear response deadline since technician responded
    clearResponseDeadline(wo.id);

    if (action === "ACCEPT") {
      // Notify dispatcher
      if (wo.dispatcherId) {
        await notifyWOAccepted(wo.dispatcherId, updated);
      }

      // Notify customer that technician is on the way
      const { notifyTechnicianOnWay } = await import(
        "../services/notification.service.js"
      );
      const customer = await prisma.user.findUnique({
        where: { id: wo.customerId },
      });
      if (customer) {
        await notifyTechnicianOnWay(updated, customer);
      }
    }

    return res.json({
      ...updated,
      responseTime: remainingTime
        ? {
          respondedWithMinutesRemaining: remainingTime.minutes,
          respondedInTime: !remainingTime.expired,
        }
        : null,
      message:
        action === "ACCEPT"
          ? "Work order accepted successfully"
          : "Work order declined successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const startWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };
    const techId = req.user.id;
    const { latitude, longitude, lat, lng } = req.body;

    // Support both formats: {latitude, longitude} or {lat, lng}
    const finalLat = latitude || lat;
    const finalLng = longitude || lng;

    // Validate required fields
    if (!finalLat || !finalLng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    // Validate coordinates
    const latValue = parseFloat(finalLat);
    const lngValue = parseFloat(finalLng);

    if (isNaN(latValue) || isNaN(lngValue)) {
      return res
        .status(400)
        .json({ message: "Invalid latitude or longitude values" });
    }

    if (latValue < -90 || latValue > 90 || lngValue < -180 || lngValue > 180) {
      return res.status(400).json({
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    const wo = await prisma.workOrder.findUnique({
      where: whereClause,
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (wo.technicianId !== techId) {
      return res.status(403).json({ message: "Not assigned to you" });
    }

    if (wo.status !== "ACCEPTED") {
      return res.status(400).json({ message: "WO is not in ACCEPTED status" });
    }

    // Update technician status to BUSY
    await prisma.user.update({
      where: { id: techId },
      data: { locationStatus: "BUSY" },
    });

    const updatedWO = await prisma.workOrder.update({
      where: whereClause,
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
      include: {
        customer: true,
        technician: true,
      },
    });

    await prisma.technicianCheckin.create({
      data: {
        woId: wo.id,
        technicianId: techId,
        latitude: latValue,
        longitude: lngValue,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: techId,
        action: "WO_START",
        entityType: "WORK_ORDER",
        entityId: wo.id,
      },
    });

    // Notify customer that technician has arrived
    const { notifyTechnicianArrived } = await import(
      "../services/notification.service.js"
    );
    const customer = await prisma.user.findUnique({
      where: { id: updatedWO.customerId },
    });
    if (customer) {
      await notifyTechnicianArrived(updatedWO, customer);
    }

    return res.json({ message: "Work started", wo: updatedWO });
  } catch (err) {
    next(err);
  }
};

export const completeWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };
    const techId = req.user.id;
    const { completionNotes, materialsUsed } = req.body;

    const wo = await prisma.workOrder.findUnique({
      where: whereClause,
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (wo.technicianId !== techId) {
      return res
        .status(403)
        .json({ message: "This WO does not belong to you" });
    }

    // Allow completion from ACCEPTED or IN_PROGRESS status
    if (wo.status !== "IN_PROGRESS" && wo.status !== "ACCEPTED") {
      return res.status(400).json({
        message: "WO must be in ACCEPTED or IN_PROGRESS status to complete",
        currentStatus: wo.status,
      });
    }

    // Make photo upload optional - photos can be uploaded via the upload endpoint later
    const photoUrls = req.files?.length
      ? req.files.map((file) => `/uploads/wo-completion/${file.filename}`)
      : [];

    let parsedMaterials = null;
    if (materialsUsed) {
      try {
        parsedMaterials =
          typeof materialsUsed === "string"
            ? JSON.parse(materialsUsed)
            : materialsUsed;
      } catch (err) {
        return res.status(400).json({
          message: "Invalid materialsUsed format. Expected JSON array.",
        });
      }
    }

    const updated = await prisma.workOrder.update({
      where: whereClause,
      data: {
        status: "COMPLETED_PENDING_PAYMENT",
        completedAt: new Date(),
        completionNotes: completionNotes || null,
        completionPhotos:
          photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        materialsUsed: parsedMaterials ? JSON.stringify(parsedMaterials) : null,
      },
      include: {
        subservice: {
          select: {
            baseRate: true,
          },
        },
        technician: {
          include: {
            technicianProfile: {
              select: {
                commissionRate: true,
                bonusRate: true,
              },
            },
          },
        },
      },
    });

    // Calculate bonus/commission
    let bonusCalculation = null;
    if (updated.technician?.technicianProfile) {
      const basePayment = updated.subservice?.baseRate || 0;
      const rate =
        updated.technician.role === "TECH_FREELANCER"
          ? updated.technician.technicianProfile.commissionRate
          : updated.technician.technicianProfile.bonusRate;

      const bonusAmount = basePayment * rate;

      bonusCalculation = {
        jobPayment: basePayment,
        bonusRate: rate * 100, // Convert to percentage
        yourBonus: bonusAmount,
        payoutInfo:
          updated.technician.role === "TECH_FREELANCER"
            ? "Paid every Monday with your weekly bonuses"
            : "Added to monthly salary",
      };
    }

    await prisma.auditLog.create({
      data: {
        userId: techId,
        action: "WO_COMPLETE",
        entityType: "WORK_ORDER",
        entityId: wo.id,
      },
    });

    // Notify dispatcher
    if (wo.dispatcherId) {
      await notifyWOCompleted(wo.dispatcherId, updated);
    }

    // Notify customer that SR is completed
    const { notifySRCompleted } = await import(
      "../services/notification.service.js"
    );
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: wo.srId },
    });
    if (sr) {
      await notifySRCompleted(sr, updated);
    }

    return res.json({
      ...updated,
      bonusCalculation,
      message: "Work order completed successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const cancelWO = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;
    const { cancelReason, reason } = req.body;

    // Accept both 'reason' and 'cancelReason' for flexibility
    const cancellationReason = cancelReason || reason;

    // Validate work order ID is provided
    if (!woIdParam) {
      return res.status(400).json({
        message: "Work Order ID is required",
      });
    }

    // Validate cancel reason is provided
    if (!cancellationReason) {
      return res.status(400).json({
        message: "Cancellation reason is required",
      });
    }

    // Find WO by either numeric ID or woNumber
    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const wo = await prisma.workOrder.findUnique({
      where: whereClause,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    // Authorization check: Customers can only cancel their own work orders
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === "CUSTOMER" && wo.customerId !== userId) {
      return res.status(403).json({
        message: "You can only cancel your own work orders",
      });
    }

    // Prevent canceling already completed or paid work orders
    if (
      wo.status === "COMPLETED_PENDING_PAYMENT" ||
      wo.status === "PAID_VERIFIED"
    ) {
      return res.status(400).json({
        message: "Cannot cancel completed or paid work orders",
      });
    }

    // Already cancelled
    if (wo.status === "CANCELLED") {
      return res.status(400).json({
        message: "Work order is already cancelled",
      });
    }

    // Update work order to cancelled status
    const updated = await prisma.workOrder.update({
      where: whereClause,
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: cancellationReason,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "WO_CANCELLED",
        entityType: "WORK_ORDER",
        entityId: wo.id,
        metadataJson: JSON.stringify({
          cancelReason,
          cancelledBy: req.user.role,
        }),
      },
    });

    // Clear response deadline if exists
    clearResponseDeadline(wo.id);

    // Send notification to technician and customer
    // TODO: Implement notification service for cancellation

    return res.json({
      ...updated,
      message: "Work order cancelled successfully",
    });
  } catch (err) {
    next(err);
  }
};
