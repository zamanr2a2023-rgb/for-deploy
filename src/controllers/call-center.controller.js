/** @format */

import { prisma } from "../prisma.js";

/**
 * Get Call Center Dashboard Stats
 * Returns overview statistics for call center agent dashboard
 *
 * SR Statuses: NEW, OPEN, CONVERTED_TO_WO, CANCELLED, REJECTED
 * WO Statuses: UNASSIGNED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED_PENDING_PAYMENT, PAID_VERIFIED, CANCELLED
 */
export const getCallCenterStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total service requests count
    const totalSRs = await prisma.serviceRequest.count();

    // Get ACTUAL pending SRs - those that don't have any work orders yet
    // This is more accurate than just counting NEW/OPEN status because some NEW/OPEN
    // SRs might already have work orders created but status wasn't updated
    const pendingSRs = await prisma.serviceRequest.count({
      where: {
        AND: [
          {
            workOrders: {
              none: {}, // SRs with no work orders
            },
          },
          {
            status: {
              notIn: ["CANCELLED", "REJECTED"], // Exclude cancelled/rejected
            },
          },
        ],
      },
    });

    // Alternative: Get pending SRs by status (for comparison)
    const pendingSRsByStatus = await prisma.serviceRequest.count({
      where: {
        status: {
          in: ["NEW", "OPEN"],
        },
      },
    });

    // Get in-progress: Work Orders that are actively being processed
    // These are WOs that have been assigned to technicians but not yet completed
    const inProgressWOs = await prisma.workOrder.count({
      where: {
        status: {
          in: [
            "ASSIGNED", // Assigned to technician but not accepted
            "ACCEPTED", // Technician accepted the job
            "IN_PROGRESS", // Actively being worked on
          ],
        },
      },
    });

    // Get unassigned WOs - these need dispatcher attention
    const unassignedWOs = await prisma.workOrder.count({
      where: {
        status: "UNASSIGNED",
      },
    });

    // Get WOs pending payment verification
    const pendingPaymentWOs = await prisma.workOrder.count({
      where: {
        status: "COMPLETED_PENDING_PAYMENT",
      },
    });

    // Get resolved/completed Work Orders (PAID_VERIFIED status)
    const resolvedWOs = await prisma.workOrder.count({
      where: {
        status: "PAID_VERIFIED",
      },
    });

    // Get SRs opened today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const openSRsToday = await prisma.serviceRequest.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Calculate average time to dispatch (from SR creation to first WO creation)
    const recentSRsWithWO = await prisma.serviceRequest.findMany({
      where: {
        workOrders: {
          some: {},
        },
      },
      include: {
        workOrders: {
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Calculate from last 50 SRs with work orders
    });

    let avgTimeToDispatch = 0;
    if (recentSRsWithWO.length > 0) {
      const totalDispatchTime = recentSRsWithWO.reduce((sum, sr) => {
        if (sr.workOrders[0]) {
          const dispatchTime =
            (sr.workOrders[0].createdAt - sr.createdAt) / 1000 / 60 / 60; // hours
          return sum + dispatchTime;
        }
        return sum;
      }, 0);

      avgTimeToDispatch = totalDispatchTime / recentSRsWithWO.length;
    }

    // Calculate total "work in progress" - all active work orders
    const totalActiveWOs = unassignedWOs + inProgressWOs + pendingPaymentWOs;

    return res.status(200).json({
      success: true,
      stats: {
        totalServiceRequests: {
          count: totalSRs,
          label: "All time SRs",
        },
        pending: {
          count: pendingSRs,
          label: "Awaiting dispatch",
          breakdown: {
            withoutWorkOrders: pendingSRs,
            byStatusCount: pendingSRsByStatus, // For comparison
            note:
              pendingSRs !== pendingSRsByStatus
                ? "Status inconsistency detected"
                : null,
          },
        },
        unassigned: {
          count: unassignedWOs,
          label: "Need technician",
        },
        inProgress: {
          count: inProgressWOs,
          label: "Being worked on",
        },
        pendingPayment: {
          count: pendingPaymentWOs,
          label: "Awaiting payment",
        },
        totalActive: {
          count: totalActiveWOs,
          label: "Total active WOs",
        },
        resolved: {
          count: resolvedWOs,
          label: "Completed & paid",
        },
        openSRsToday: {
          count: openSRsToday,
          label: "Opened today",
        },
        avgTimeToDispatch: {
          hours: parseFloat(avgTimeToDispatch.toFixed(1)),
          label: `${parseFloat(avgTimeToDispatch.toFixed(1))} hrs`,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching call center stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call center stats",
      error: error.message,
    });
  }
};
