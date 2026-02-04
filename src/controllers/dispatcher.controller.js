/** @format */

// src/controllers/dispatcher.controller.js
import { prisma } from "../prisma.js";
import { calculateDistance } from "../utils/location.js";

// ✅ Get nearby technicians with distance, availability, and workload
export const getNearbyTechnicians = async (req, res, next) => {
  try {
    const { latitude, longitude, categoryId, maxDistance } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res
        .status(400)
        .json({ message: "Invalid latitude or longitude values" });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        message:
          "Latitude must be between -90 and 90, longitude between -180 and 180",
      });
    }

    // Build where clause for technicians
    const where = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
    };

    // Get all active technicians
    const technicians = await prisma.user.findMany({
      where,
      include: {
        technicianProfile: {
          select: {
            type: true,
            status: true,
            specialization: true,
            commissionRate: true,
            bonusRate: true,
            baseSalary: true,
          },
        },
        technicianWOs: {
          where: {
            status: {
              in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"],
            },
          },
          select: {
            id: true,
            woNumber: true,
            status: true,
            scheduledAt: true,
            address: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Filter by category/specialization if provided
    let filteredTechs = technicians;
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: Number(categoryId) },
      });

      if (category) {
        filteredTechs = technicians.filter(
          (tech) =>
            tech.technicianProfile?.specialization
              ?.toLowerCase()
              .includes(category.name.toLowerCase()) ||
            !tech.technicianProfile?.specialization // Include if no specialization set
        );
      }
    }

    // Calculate distance and prepare response
    const techniciansWithDistance = filteredTechs.map((tech) => {
      let distance = null;
      let estimatedTravelMinutes = null;

      if (tech.lastLatitude && tech.lastLongitude) {
        distance = calculateDistance(
          lat,
          lng,
          tech.lastLatitude,
          tech.lastLongitude
        );

        // Estimate travel time (average speed 30 km/h)
        estimatedTravelMinutes = Math.ceil((distance / 30) * 60);
      }

      // Determine availability based on:
      // 1. Mobile app status (profile.status === 'ACTIVE')
      // 2. Has active jobs (regardless of mobile app status)
      const hasActiveJobs = tech.technicianWOs.length > 0;
      const isMobileAppOnline = tech.technicianProfile?.status === "ACTIVE";

      let availability = "OFFLINE";

      // Show as online/available if mobile app is online OR has active jobs
      if (isMobileAppOnline || hasActiveJobs) {
        // If has jobs, show as BUSY
        // If no jobs but online, show as AVAILABLE
        availability = hasActiveJobs ? "BUSY" : "AVAILABLE";
      }

      return {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        email: tech.email,
        type: tech.technicianProfile?.type,
        specialization: tech.technicianProfile?.specialization,
        status: tech.technicianProfile?.status,
        availability,
        locationStatus: tech.locationStatus,
        lastLocationUpdate: tech.locationUpdatedAt,
        currentLocation:
          tech.lastLatitude && tech.lastLongitude
            ? {
                latitude: tech.lastLatitude,
                longitude: tech.lastLongitude,
              }
            : null,
        distance: distance ? parseFloat(distance.toFixed(2)) : null,
        distanceKm: distance ? `${distance.toFixed(2)} km` : "Unknown",
        estimatedTravelTime: estimatedTravelMinutes
          ? `${estimatedTravelMinutes} min`
          : null,
        openJobsCount: tech.technicianWOs.length,
        openJobs: tech.technicianWOs.map((wo) => ({
          woNumber: wo.woNumber,
          status: wo.status,
          scheduledAt: wo.scheduledAt,
          address: wo.address,
          category: wo.category.name,
        })),
        rates: {
          commissionRate: tech.technicianProfile?.commissionRate,
          bonusRate: tech.technicianProfile?.bonusRate,
          baseSalary: tech.technicianProfile?.baseSalary,
        },
      };
    });

    // Filter by max distance if provided
    let finalTechs = techniciansWithDistance;
    if (maxDistance) {
      const maxDist = parseFloat(maxDistance);
      finalTechs = techniciansWithDistance.filter(
        (tech) => tech.distance === null || tech.distance <= maxDist
      );
    }

    // Sort by distance (nearest first, nulls last)
    finalTechs.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return res.json({
      total: finalTechs.length,
      technicians: finalTechs,
      jobLocation: {
        latitude: lat,
        longitude: lng,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Get technician workload details
export const getTechnicianWorkload = async (req, res, next) => {
  try {
    const techId = Number(req.params.id);

    const technician = await prisma.user.findUnique({
      where: { id: techId },
      include: {
        technicianProfile: {
          select: {
            type: true,
            status: true,
            specialization: true,
          },
        },
        technicianWOs: {
          where: {
            status: {
              in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"],
            },
          },
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
            category: {
              select: {
                name: true,
              },
            },
            subservice: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            scheduledAt: "asc",
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

    const workload = {
      technician: {
        id: technician.id,
        name: technician.name,
        phone: technician.phone,
        type: technician.technicianProfile?.type,
        specialization: technician.technicianProfile?.specialization,
        status: technician.technicianProfile?.status,
        locationStatus: technician.locationStatus,
      },
      summary: {
        total: technician.technicianWOs.length,
        assigned: technician.technicianWOs.filter(
          (wo) => wo.status === "ASSIGNED"
        ).length,
        accepted: technician.technicianWOs.filter(
          (wo) => wo.status === "ACCEPTED"
        ).length,
        inProgress: technician.technicianWOs.filter(
          (wo) => wo.status === "IN_PROGRESS"
        ).length,
      },
      jobs: technician.technicianWOs.map((wo) => ({
        id: wo.id,
        woNumber: wo.woNumber,
        status: wo.status,
        priority: wo.priority,
        address: wo.address,
        scheduledAt: wo.scheduledAt,
        customer: wo.customer,
        category: wo.category.name,
        subservice: wo.subservice.name,
        estimatedDuration: wo.estimatedDuration
          ? `${wo.estimatedDuration} min`
          : null,
      })),
    };

    return res.json(workload);
  } catch (err) {
    next(err);
  }
};
