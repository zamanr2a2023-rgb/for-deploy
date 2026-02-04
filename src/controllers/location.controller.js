/** @format */

// src/controllers/location.controller.js
import { prisma } from "../prisma.js";
import geoip from "geoip-lite";

// Helper function to get IP-based location (fallback)
const getIpLocation = (req) => {
  try {
    // Get client IP address
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["x-real-ip"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;

    // Remove IPv6 prefix if present
    const cleanIp = ip?.replace(/^::ffff:/, "");

    // Skip localhost/private IPs
    if (
      !cleanIp ||
      cleanIp === "127.0.0.1" ||
      cleanIp === "::1" ||
      cleanIp.startsWith("192.168.") ||
      cleanIp.startsWith("10.") ||
      cleanIp.startsWith("172.")
    ) {
      return null;
    }

    // Get location from IP
    const geo = geoip.lookup(cleanIp);
    if (geo && geo.ll) {
      return {
        latitude: geo.ll[0],
        longitude: geo.ll[1],
        source: "ip",
        city: geo.city,
        country: geo.country,
      };
    }

    return null;
  } catch (error) {
    console.error("IP geolocation error:", error);
    return null;
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    let { latitude, longitude, status } = req.body;

    // Prepare update data
    const updateData = {
      locationUpdatedAt: new Date(),
    };

    let locationSource = "manual";

    // If no coordinates provided, try to get from IP (auto-location fallback)
    if (!latitude || !longitude) {
      const ipLocation = getIpLocation(req);
      if (ipLocation) {
        latitude = ipLocation.latitude;
        longitude = ipLocation.longitude;
        locationSource = "auto-ip";
        console.log(
          `📍 Auto-detected location from IP: ${ipLocation.city}, ${ipLocation.country}`,
        );
      }
    }

    // Update location if coordinates available (from body or IP)
    if (latitude && longitude) {
      updateData.lastLatitude = Number(latitude);
      updateData.lastLongitude = Number(longitude);
      // Auto-set status to ONLINE when location is actively updated (unless explicitly set otherwise)
      if (!status) {
        updateData.locationStatus = "ONLINE";
      }
    }

    // Update status if explicitly provided
    if (status) {
      const validStatuses = ["ONLINE", "OFFLINE", "BUSY"];
      if (validStatuses.includes(status.toUpperCase())) {
        updateData.locationStatus = status.toUpperCase();
      }
    }

    // If neither coordinates nor status provided, just update timestamp
    // (This allows a simple "ping" to keep the connection alive)

    await prisma.user.update({
      where: { id: technicianId },
      data: updateData,
    });

    return res.json({
      message: "Location updated successfully",
      updated: {
        coordinates: latitude && longitude ? true : false,
        status:
          status ||
          (!status && !latitude && !longitude ? "ONLINE" : "unchanged"),
        locationSource, // 'manual', 'auto-ip', or 'none'
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getNearbyTechnicians = async (req, res, next) => {
  try {
    const { latitude, longitude, radius, status } = req.query;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = radius ? Number(radius) : 10; // Default 10km

    // Build where clause dynamically
    const whereClause = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    };

    // Add status filter if provided
    if (status) {
      whereClause.locationStatus = status;
    }
    // If no status filter, show ALL technicians (ONLINE, BUSY, OFFLINE)

    const technicians = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        lastLatitude: true,
        lastLongitude: true,
        locationStatus: true,
        locationUpdatedAt: true,
        technicianProfile: {
          select: {
            type: true,
            status: true,
          },
        },
      },
    });

    // Calculate distance using Haversine formula
    const nearby = technicians
      .map((tech) => {
        const techLat = tech.lastLatitude;
        const techLng = tech.lastLongitude;

        const R = 6371; // Earth's radius in km
        const dLat = ((techLat - lat) * Math.PI) / 180;
        const dLon = ((techLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((techLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...tech,
          distance: parseFloat(distance.toFixed(2)),
        };
      })
      .filter((tech) => tech.distance <= rad)
      .sort((a, b) => a.distance - b.distance);

    return res.json(nearby);
  } catch (err) {
    next(err);
  }
};

export const getTechnicianLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const technician = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        lastLatitude: true,
        lastLongitude: true,
        locationStatus: true,
        locationUpdatedAt: true,
        technicianProfile: {
          select: {
            type: true,
            status: true,
          },
        },
      },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!["TECH_INTERNAL", "TECH_FREELANCER"].includes(technician.role)) {
      return res.status(400).json({ message: "User is not a technician" });
    }

    if (!technician.lastLatitude || !technician.lastLongitude) {
      return res.status(404).json({
        message: "Location not available",
        technician: {
          id: technician.id,
          name: technician.name,
          locationStatus: "OFFLINE",
        },
      });
    }

    return res.json({
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      role: technician.role,
      latitude: technician.lastLatitude,
      longitude: technician.lastLongitude,
      status: technician.locationStatus || "ONLINE",
      lastUpdated: technician.locationUpdatedAt,
      technicianProfile: technician.technicianProfile,
    });
  } catch (err) {
    next(err);
  }
};

export const getLocationHistory = async (req, res, next) => {
  try {
    const { technicianId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    if (!technicianId) {
      return res.status(400).json({ message: "Technician ID is required" });
    }

    const where = {
      technicianId: Number(technicianId),
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get check-in history (from work orders)
    const checkins = await prisma.technicianCheckin.findMany({
      where,
      include: {
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            address: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });

    return res.json({
      count: checkins.length,
      history: checkins,
    });
  } catch (err) {
    next(err);
  }
};

export const getETA = async (req, res, next) => {
  try {
    const { technicianId, destinationLat, destinationLng } = req.query;

    if (!technicianId || !destinationLat || !destinationLng) {
      return res.status(400).json({
        message:
          "technicianId, destinationLat, and destinationLng are required",
      });
    }

    const technician = await prisma.user.findUnique({
      where: { id: Number(technicianId) },
      select: {
        id: true,
        name: true,
        lastLatitude: true,
        lastLongitude: true,
        locationStatus: true,
        locationUpdatedAt: true,
      },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.lastLatitude || !technician.lastLongitude) {
      return res.status(404).json({
        message: "Technician location not available",
      });
    }

    // Calculate distance using Haversine formula
    const lat1 = technician.lastLatitude;
    const lng1 = technician.lastLongitude;
    const lat2 = Number(destinationLat);
    const lng2 = Number(destinationLng);

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    // Estimate time (assuming average speed of 30 km/h in city traffic)
    const averageSpeed = 30; // km/h
    const estimatedTimeHours = distance / averageSpeed;
    const estimatedTimeMinutes = Math.round(estimatedTimeHours * 60);

    return res.json({
      technician: {
        id: technician.id,
        name: technician.name,
        currentLocation: {
          latitude: technician.lastLatitude,
          longitude: technician.lastLongitude,
        },
        locationStatus: technician.locationStatus,
        lastUpdated: technician.locationUpdatedAt,
      },
      destination: {
        latitude: lat2,
        longitude: lng2,
      },
      distance: parseFloat(distance.toFixed(2)), // km
      estimatedTime: {
        minutes: estimatedTimeMinutes,
        formatted:
          estimatedTimeMinutes < 60
            ? `${estimatedTimeMinutes} minutes`
            : `${Math.floor(estimatedTimeMinutes / 60)} hours ${
                estimatedTimeMinutes % 60
              } minutes`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getTechnicianStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const technician = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        locationStatus: true,
        locationUpdatedAt: true,
        lastLatitude: true,
        lastLongitude: true,
        technicianProfile: {
          select: {
            type: true,
            status: true,
          },
        },
      },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!["TECH_INTERNAL", "TECH_FREELANCER"].includes(technician.role)) {
      return res.status(400).json({ message: "User is not a technician" });
    }

    return res.json({
      id: technician.id,
      name: technician.name,
      phone: technician.phone,
      locationStatus: technician.locationStatus || "OFFLINE",
      lastUpdated: technician.locationUpdatedAt,
      hasLocation: !!(technician.lastLatitude && technician.lastLongitude),
      technicianProfile: technician.technicianProfile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Set Technician Status (Go Online/Offline/Busy)
 * Mobile app calls this to update availability status
 */
export const setTechnicianStatus = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["ONLINE", "OFFLINE", "BUSY"];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Update the technician's status
    const updated = await prisma.user.update({
      where: { id: technicianId },
      data: {
        locationStatus: normalizedStatus,
        locationUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        locationStatus: true,
        locationUpdatedAt: true,
        lastLatitude: true,
        lastLongitude: true,
      },
    });

    console.log(
      `📍 Technician ${updated.name} (ID: ${technicianId}) set status to ${normalizedStatus}`,
    );

    return res.json({
      message: `Status updated to ${normalizedStatus}`,
      technician: {
        id: updated.id,
        name: updated.name,
        locationStatus: updated.locationStatus,
        lastUpdated: updated.locationUpdatedAt,
        hasLocation: !!(updated.lastLatitude && updated.lastLongitude),
      },
    });
  } catch (err) {
    next(err);
  }
};
