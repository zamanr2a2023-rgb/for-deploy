/** @format */

// src/services/dispatch.service.js
import { prisma } from "../prisma.js";

/**
 * Get Dispatch Overview Statistics
 * Returns: Total WOs, Assigned WOs, In Progress WOs, Service Requests count
 */
export const getDispatchOverview = async () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [
    totalWorkOrders,
    totalWorkOrdersThisWeek,
    assignedWorkOrders,
    inProgressWorkOrders,
    serviceRequests,
    unconvertedSRs,
  ] = await Promise.all([
    // Total Work Orders (all time)
    prisma.workOrder.count(),

    // Work Orders created this week
    prisma.workOrder.count({
      where: {
        createdAt: { gte: startOfWeek },
      },
    }),

    // Assigned Work Orders (waiting for technician to start)
    prisma.workOrder.count({
      where: {
        status: { in: ["ASSIGNED", "ACCEPTED"] },
      },
    }),

    // In Progress Work Orders (active on site)
    prisma.workOrder.count({
      where: {
        status: "IN_PROGRESS",
      },
    }),

    // Total Service Requests
    prisma.serviceRequest.count(),

    // Unconverted Service Requests (not yet converted to WO)
    prisma.serviceRequest.count({
      where: {
        status: { in: ["NEW", "OPEN"] },
      },
    }),
  ]);

  return {
    totalWorkOrders,
    totalWorkOrdersThisWeek,
    assignedWorkOrders,
    inProgressWorkOrders,
    serviceRequests,
    unconvertedSRs,
  };
};

/**
 * Get Technician Status Summary
 * Returns: Active (Online), Busy, Offline, and Blocked technicians count
 */
export const getTechnicianStatus = async () => {
  const [
    activeTechnicians,
    busyTechnicians,
    blockedTechnicians,
    allTechnicians,
    offlineTechnicians,
  ] = await Promise.all([
    // Active Technicians (available for assignment - ONLINE status)
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
        locationStatus: "ONLINE",
      },
    }),

    // Busy Technicians (currently on job)
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
        locationStatus: "BUSY",
      },
    }),

    // Blocked Technicians (unavailable)
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: true,
      },
    }),

    // All Technicians
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
    }),

    // Offline Technicians (OFFLINE status OR NULL/no status set)
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
        OR: [{ locationStatus: "OFFLINE" }, { locationStatus: null }],
      },
    }),
  ]);

  return {
    activeTechnicians,
    busyTechnicians,
    blockedTechnicians,
    allTechnicians,
    offlineTechnicians,
  };
};

/**
 * Get Recent Work Orders
 * Returns: Latest work orders with full details
 */
export const getRecentWorkOrders = async (limit = 10) => {
  const workOrders = await prisma.workOrder.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      dispatcher: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subservice: {
        select: {
          id: true,
          name: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return workOrders;
};

/**
 * Get Technician Locations for Map View
 * Returns: All technicians with their GPS coordinates and proper status
 */
export const getTechnicianLocations = async () => {
  const now = new Date();
  const STALE_THRESHOLD_MINUTES = 30;

  const technicians = await prisma.user.findMany({
    where: {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      lastLatitude: true,
      lastLongitude: true,
      latitude: true,
      longitude: true,
      locationStatus: true,
      locationUpdatedAt: true,
      technicianProfile: {
        select: {
          type: true,
          specialization: true,
          status: true,
        },
      },
      technicianWOs: {
        where: {
          status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
        },
        take: 1,
      },
    },
  });

  // Process and return with proper status
  return technicians.map((tech) => {
    // Use lastLatitude/lastLongitude (mobile app) as primary, fall back to latitude/longitude
    const lat = tech.lastLatitude || tech.latitude;
    const lng = tech.lastLongitude || tech.longitude;

    // Check if location is stale
    const minutesSinceUpdate = tech.locationUpdatedAt
      ? (now - new Date(tech.locationUpdatedAt)) / 1000 / 60
      : Infinity;
    const isStale = minutesSinceUpdate > STALE_THRESHOLD_MINUTES;

    // Determine display status
    const hasActiveJob = tech.technicianWOs && tech.technicianWOs.length > 0;
    let displayStatus = "OFFLINE";

    if (tech.locationStatus === "ONLINE" && !isStale) {
      displayStatus = "ONLINE";
    } else if (tech.locationStatus === "BUSY" || hasActiveJob) {
      displayStatus = "BUSY";
    } else {
      displayStatus = "OFFLINE";
    }

    return {
      id: tech.id,
      name: tech.name,
      phone: tech.phone,
      lastLatitude: lat,
      lastLongitude: lng,
      locationStatus: tech.locationStatus || "OFFLINE",
      displayStatus,
      locationUpdatedAt: tech.locationUpdatedAt,
      isLocationStale: isStale,
      hasActiveJob,
      technicianProfile: tech.technicianProfile,
    };
  });
};
