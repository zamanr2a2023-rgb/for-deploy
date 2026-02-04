/** @format */

// src/controllers/admin.controller.js
import { prisma } from "../prisma.js";
import * as adminService from "../services/admin.service.js";
import bcrypt from "bcryptjs";

export const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await adminService.findUsers(req.query);
    return res.json(users);
  } catch (err) {
    next(err);
  }
};

// Get all customers with registration source information
export const listCustomers = async (req, res, next) => {
  try {
    const { registrationSource } = req.query;

    const where = { role: "CUSTOMER" };

    // Filter by registration source if provided
    if (registrationSource) {
      where.registrationSource = registrationSource;
    }

    const customers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        homeAddress: true,
        latitude: true,
        longitude: true,
        registrationSource: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        isBlocked: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate statistics
    const totalCustomers = customers.length;
    const selfRegistered = customers.filter(
      (c) => c.registrationSource === "SELF_REGISTERED",
    ).length;
    const callCenterCreated = customers.filter(
      (c) => c.registrationSource === "CALL_CENTER",
    ).length;
    const adminCreated = customers.filter(
      (c) => c.registrationSource === "ADMIN",
    ).length;
    const webPortal = customers.filter(
      (c) => c.registrationSource === "WEB_PORTAL",
    ).length;
    const unknown = customers.filter((c) => !c.registrationSource).length;

    return res.json({
      total: totalCustomers,
      statistics: {
        selfRegistered: {
          count: selfRegistered,
          percentage:
            totalCustomers > 0
              ? ((selfRegistered / totalCustomers) * 100).toFixed(1)
              : 0,
        },
        callCenterCreated: {
          count: callCenterCreated,
          percentage:
            totalCustomers > 0
              ? ((callCenterCreated / totalCustomers) * 100).toFixed(1)
              : 0,
        },
        adminCreated: {
          count: adminCreated,
          percentage:
            totalCustomers > 0
              ? ((adminCreated / totalCustomers) * 100).toFixed(1)
              : 0,
        },
        webPortal: {
          count: webPortal,
          percentage:
            totalCustomers > 0
              ? ((webPortal / totalCustomers) * 100).toFixed(1)
              : 0,
        },
        unknown: {
          count: unknown,
          percentage:
            totalCustomers > 0
              ? ((unknown / totalCustomers) * 100).toFixed(1)
              : 0,
        },
      },
      customers,
    });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, phone, email, password, role, technicianProfile } = req.body;

    if (!phone || !password || !role) {
      return res
        .status(400)
        .json({ message: "Phone, password, and role are required" });
    }

    const user = await adminService.createUserWithProfile(
      req.body,
      req.user.id,
    );
    return res.status(201).json(user);
  } catch (err) {
    if (err.message === "Phone already exists") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, role } = req.body;

    const user = await adminService.updateUserById(
      userId,
      { name, email, role },
      req.user.id,
    );
    return res.json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * Reset User Password (Admin only)
 * Allows admin to reset any user's password
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: userId,
        userId: req.user.id,
        metadataJson: JSON.stringify({
          performedBy: req.user.id,
          details: `Password reset for user: ${user.name} (${user.phone})`,
        }),
      },
    });

    console.log(
      `🔐 Admin ${req.user.id} reset password for user ${user.name} (ID: ${userId})`,
    );

    return res.json({
      message: "Password reset successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const blockTechnician = async (req, res, next) => {
  try {
    const technicianId = Number(req.params.id);
    const { isBlocked, blockedReason } = req.body;

    if (isBlocked && !blockedReason) {
      return res.status(400).json({
        message: "Blocked reason is required when blocking a technician",
      });
    }

    const user = await adminService.setTechnicianBlockStatus(
      technicianId,
      isBlocked,
      blockedReason,
      req.user.id,
    );
    return res.json(user);
  } catch (err) {
    next(err);
  }
};

export const updateTechnicianProfile = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const userRole = req.user.role;

    // Dispatcher cannot update images/documents - Admin only
    if (userRole === "DISPATCHER") {
      const restrictedFields = [
        "photoUrl",
        "idCardUrl",
        "residencePermitUrl",
        "degreesUrl",
        "baseSalary",
      ];
      const hasRestrictedField = restrictedFields.some(
        (field) => req.body[field] !== undefined,
      );
      const hasUploadedFiles = req.files && Object.keys(req.files).length > 0;

      if (hasRestrictedField || hasUploadedFiles) {
        return res.status(403).json({
          message:
            "Dispatcher cannot update profile images, documents, or salary. Admin access required.",
        });
      }
    }

    // Process uploaded files with better organization and error handling
    const updateData = { ...req.body };

    // Convert boolean fields from string to boolean
    if (updateData.isForeigner !== undefined) {
      updateData.isForeigner =
        updateData.isForeigner === "true" || updateData.isForeigner === true;
    }
    if (updateData.useCustomRate !== undefined) {
      updateData.useCustomRate =
        updateData.useCustomRate === "true" ||
        updateData.useCustomRate === true;
    }

    // Convert date fields
    if (updateData.residencePermitFrom) {
      updateData.residencePermitFrom = new Date(updateData.residencePermitFrom);
    }
    if (updateData.residencePermitTo) {
      updateData.residencePermitTo = new Date(updateData.residencePermitTo);
    }
    if (updateData.joinDate) {
      updateData.joinDate = new Date(updateData.joinDate);
    }

    if (req.files) {
      try {
        // Handle both 'photoUrl' and 'photo' field names
        if (req.files.photoUrl && req.files.photoUrl[0]) {
          updateData.photoUrl = `/uploads/profiles/${req.files.photoUrl[0].filename}`;
          console.log(`📷 Photo uploaded: ${updateData.photoUrl}`);
        } else if (req.files.photo && req.files.photo[0]) {
          updateData.photoUrl = `/uploads/profiles/${req.files.photo[0].filename}`;
          console.log(`📷 Photo uploaded: ${updateData.photoUrl}`);
        }
        if (req.files.idCardUrl && req.files.idCardUrl[0]) {
          updateData.idCardUrl = `/uploads/documents/${req.files.idCardUrl[0].filename}`;
          console.log(`🆔 ID Card uploaded: ${updateData.idCardUrl}`);
        }
        if (req.files.residencePermitUrl && req.files.residencePermitUrl[0]) {
          updateData.residencePermitUrl = `/uploads/documents/${req.files.residencePermitUrl[0].filename}`;
          console.log(
            `🏠 Residence Permit uploaded: ${updateData.residencePermitUrl}`,
          );
        }
        if (req.files.degreesUrl && req.files.degreesUrl.length > 0) {
          const degreeFiles = req.files.degreesUrl.map((file, index) => ({
            name: `Certificate ${index + 1}`,
            url: `/uploads/documents/${file.filename}`,
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname,
            size: file.size,
          }));
          updateData.degreesUrl = JSON.stringify(degreeFiles);
          console.log(`🎓 ${degreeFiles.length} degree certificates uploaded`);
        }
      } catch (fileError) {
        console.error("Error processing uploaded files:", fileError);
        return res.status(500).json({
          message: "Error processing uploaded files",
          error: fileError.message,
        });
      }
    }

    const profile = await adminService.updateTechProfile(
      userId,
      updateData,
      req.user.id,
    );
    return res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await adminService.fetchAuditLogs(req.query);
    return res.json(logs);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Technician Locations for Map View
 * Returns technician locations with online/offline status based on locationStatus field
 */
export const getTechnicianLocations = async (req, res, next) => {
  try {
    // Get all technicians with their profiles and current work orders
    const technicians = await prisma.user.findMany({
      where: {
        role: {
          in: ["TECH_FREELANCER", "TECH_INTERNAL"],
        },
      },
      include: {
        technicianProfile: true,
        technicianWOs: {
          where: {
            status: {
              in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"],
            },
          },
          include: {
            serviceRequest: {
              include: {
                subservice: {
                  select: {
                    id: true,
                    name: true,
                    baseRate: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Calculate online/offline status based on locationStatus and last activity
    const now = new Date();
    const ONLINE_THRESHOLD_MINUTES = 30; // Consider stale if no update in 30 minutes

    const technicianLocations = technicians
      .filter((tech) => tech.technicianProfile) // Only include technicians with profiles
      .map((tech) => {
        const profile = tech.technicianProfile;
        const currentJob = tech.technicianWOs?.[0];

        // Use lastLatitude/lastLongitude (from mobile app) as primary location source
        // Fall back to latitude/longitude (customer GPS field) or profile location
        const latitude = tech.lastLatitude || tech.latitude || null;
        const longitude = tech.lastLongitude || tech.longitude || null;

        // Skip if no location data at all
        if (!latitude || !longitude) {
          return null;
        }

        // Determine online status based on locationStatus field (set by mobile app)
        // locationStatus: ONLINE, BUSY, OFFLINE, or null
        const locationStatus = tech.locationStatus;
        const hasActiveJob = currentJob !== null && currentJob !== undefined;

        // Check if location data is stale (no recent updates from mobile app)
        const lastLocationUpdate = tech.locationUpdatedAt;
        const minutesSinceLocationUpdate = lastLocationUpdate
          ? (now - new Date(lastLocationUpdate)) / 1000 / 60
          : Infinity;
        const isLocationStale =
          minutesSinceLocationUpdate > ONLINE_THRESHOLD_MINUTES;

        // Determine display status:
        // - ONLINE: locationStatus is ONLINE and location is not stale
        // - BUSY: locationStatus is BUSY or has active job
        // - OFFLINE: locationStatus is OFFLINE, null, or location is stale
        let displayStatus = "OFFLINE";
        let isOnline = false;

        if (locationStatus === "ONLINE" && !isLocationStale) {
          displayStatus = "ONLINE";
          isOnline = true;
        } else if (locationStatus === "BUSY" || hasActiveJob) {
          displayStatus = "BUSY";
          isOnline = true; // Busy technicians are still "online" for display
        } else if (
          locationStatus === "OFFLINE" ||
          !locationStatus ||
          isLocationStale
        ) {
          displayStatus = "OFFLINE";
          isOnline = false;
        }

        return {
          id: tech.id,
          name: tech.name,
          phone: tech.phone,
          email: tech.email,
          photoUrl: profile.photoUrl,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          status: {
            isOnline,
            displayStatus, // ONLINE, BUSY, OFFLINE
            locationStatus: locationStatus || "OFFLINE", // Raw status from mobile app
            profileStatus: profile.status, // ACTIVE, INACTIVE from profile
            lastLocationUpdate: lastLocationUpdate,
            minutesSinceUpdate: Math.round(minutesSinceLocationUpdate),
            isLocationStale,
          },
          type: profile.type, // FREELANCER or INTERNAL
          specialization: profile.specialization,
          currentJob: currentJob
            ? {
                workOrderId: currentJob.id,
                woNumber: currentJob.woNumber,
                status: currentJob.status,
                priority: currentJob.priority,
                serviceName: currentJob.serviceRequest?.subservice?.name,
                customerLocation: {
                  address: currentJob.serviceRequest?.address,
                  latitude: currentJob.serviceRequest?.latitude,
                  longitude: currentJob.serviceRequest?.longitude,
                },
              }
            : null,
          // Additional info for map markers
          rating: profile.rating || 0,
          completedJobs: profile.totalJobsCompleted || 0,
        };
      })
      .filter((tech) => tech !== null); // Remove technicians without location

    // Summary statistics based on displayStatus
    const summary = {
      total: technicianLocations.length,
      online: technicianLocations.filter(
        (t) => t.status.displayStatus === "ONLINE",
      ).length,
      busy: technicianLocations.filter((t) => t.status.displayStatus === "BUSY")
        .length,
      offline: technicianLocations.filter(
        (t) => t.status.displayStatus === "OFFLINE",
      ).length,
      withActiveJobs: technicianLocations.filter((t) => t.currentJob).length,
      available: technicianLocations.filter(
        (t) => t.status.displayStatus === "ONLINE" && !t.currentJob,
      ).length,
    };

    return res.json({
      success: true,
      summary,
      technicians: technicianLocations,
      mapConfig: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        defaultCenter: {
          latitude: 23.8103, // Dhaka, Bangladesh
          longitude: 90.4125,
        },
        defaultZoom: 12,
      },
    });
  } catch (err) {
    console.error("Error fetching technician locations:", err);
    next(err);
  }
};

// Get top 5 technicians by rating
export const getTop5Technicians = async (req, res, next) => {
  try {
    const { timeframe = "30days", startDate, endDate } = req.query;

    let dateFilter = {};
    if (timeframe === "7days") {
      dateFilter = {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      };
    } else if (timeframe === "30days") {
      dateFilter = {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      };
    } else if (timeframe === "custom" && startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    // Get all technicians with their reviews
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        technicianProfile: {
          select: {
            type: true,
            specialization: true,
          },
        },
        technicianReviews: {
          where: dateFilter,
          select: {
            rating: true,
            createdAt: true,
          },
        },
        technicianWOs: {
          where: {
            status: "PAID_VERIFIED",
            ...dateFilter,
          },
          select: {
            id: true,
            payments: {
              select: { amount: true },
            },
          },
        },
      },
    });

    // Calculate stats for each technician
    const techWithStats = technicians.map((tech) => {
      const reviews = tech.technicianReviews;
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const totalRevenue = tech.technicianWOs.reduce((sum, wo) => {
        const woRevenue = wo.payments.reduce((s, p) => s + p.amount, 0);
        return sum + woRevenue;
      }, 0);

      return {
        id: tech.id,
        name: tech.name,
        phone: tech.phone,
        role: tech.role,
        type: tech.technicianProfile?.type,
        specialization: tech.technicianProfile?.specialization,
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalReviews: reviews.length,
        completedJobs: tech.technicianWOs.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      };
    });

    // Sort by rating first, then by completed jobs, then by revenue
    const top5 = techWithStats
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        if (b.completedJobs !== a.completedJobs) {
          return b.completedJobs - a.completedJobs;
        }
        return b.totalRevenue - a.totalRevenue;
      })
      .slice(0, 5);

    return res.json({
      timeframe,
      startDate: dateFilter.createdAt?.gte || null,
      endDate: dateFilter.createdAt?.lte || null,
      top5Technicians: top5,
    });
  } catch (err) {
    next(err);
  }
};

// Create weekly payout batch (Admin only)
export const createWeeklyPayoutBatch = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    // Get all technicians with BOOKED commissions
    const techsWithCommissions = await prisma.commission.groupBy({
      by: ["technicianId"],
      where: {
        status: "BOOKED",
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    if (techsWithCommissions.length === 0) {
      return res
        .status(400)
        .json({ message: "No pending commissions to payout" });
    }

    const payouts = [];

    // Create payout for each technician
    for (const tech of techsWithCommissions) {
      const commissions = await prisma.commission.findMany({
        where: {
          technicianId: tech.technicianId,
          status: "BOOKED",
        },
      });

      const payout = await prisma.payout.create({
        data: {
          technicianId: tech.technicianId,
          totalAmount: tech._sum.amount,
          type: "WEEKLY",
          status: "PROCESSED",
          processedAt: new Date(),
          createdById: adminId,
        },
      });

      // Update commissions to PAID_OUT status
      await prisma.commission.updateMany({
        where: {
          id: { in: commissions.map((c) => c.id) },
        },
        data: {
          status: "PAID_OUT",
          payoutId: payout.id,
        },
      });

      // Deduct from wallet
      await prisma.wallet.update({
        where: { technicianId: tech.technicianId },
        data: {
          balance: {
            decrement: tech._sum.amount,
          },
        },
      });

      // Log wallet transaction
      const wallet = await prisma.wallet.findUnique({
        where: { technicianId: tech.technicianId },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          technicianId: tech.technicianId,
          type: "PAYOUT",
          sourceType: "PAYOUT",
          sourceId: payout.id,
          amount: -tech._sum.amount,
          description: "Weekly payout batch",
        },
      });

      payouts.push({
        technicianId: tech.technicianId,
        payoutId: payout.id,
        amount: tech._sum.amount,
        commissionsCount: tech._count.id,
      });
    }

    // Update system config next payout date (add 7 days)
    await prisma.systemConfig.updateMany({
      data: {
        nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      message: "Weekly payout batch created successfully",
      totalPayouts: payouts.length,
      // Round to 2 decimal places to avoid floating-point precision issues
      totalAmount:
        Math.round(payouts.reduce((sum, p) => sum + p.amount, 0) * 100) / 100,
      payouts,
    });
  } catch (err) {
    next(err);
  }
};

// Get all IN_PROGRESS work orders (Admin only)
export const getInProgressWorkOrders = async (req, res, next) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: "IN_PROGRESS",
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
            locationStatus: true,
            technicianProfile: {
              select: {
                type: true,
                specialization: true,
                status: true,
              },
            },
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
        service: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return res.json({
      total: workOrders.length,
      workOrders,
    });
  } catch (err) {
    next(err);
  }
};

// Get technician status summary (Busy/Active/Blocked) - Admin only
export const getTechnicianStatusSummary = async (req, res, next) => {
  try {
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        blockedReason: true,
        blockedAt: true,
        locationStatus: true,
        locationUpdatedAt: true,
        technicianProfile: {
          select: {
            type: true,
            status: true,
            specialization: true,
          },
        },
        technicianWOs: {
          where: {
            status: "IN_PROGRESS",
          },
          select: {
            id: true,
            woNumber: true,
            startedAt: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Separate blocked vs unblocked first
    const blockedTechnicians = technicians.filter((t) => t.isBlocked);
    const unblockedTechnicians = technicians.filter((t) => !t.isBlocked);

    // From unblocked, categorize by locationStatus (availability)
    // These are mutually exclusive categories
    const onlineTechnicians = unblockedTechnicians.filter(
      (t) => t.locationStatus === "ONLINE",
    );
    const busyTechnicians = unblockedTechnicians.filter(
      (t) => t.locationStatus === "BUSY",
    );
    const offlineTechnicians = unblockedTechnicians.filter(
      (t) => t.locationStatus === "OFFLINE" || t.locationStatus === null,
    );

    // Profile status (employment status) - separate from availability
    const activeProfileCount = unblockedTechnicians.filter(
      (t) => t.technicianProfile?.status === "ACTIVE",
    ).length;
    const inactiveProfileCount = unblockedTechnicians.filter(
      (t) => t.technicianProfile?.status === "INACTIVE",
    ).length;

    // Build summary with non-overlapping availability categories
    const summary = {
      total: technicians.length,

      // Availability Status (mutually exclusive for unblocked techs)
      blocked: blockedTechnicians.length,
      online: onlineTechnicians.length, // Available for assignment
      busy: busyTechnicians.length, // Currently on a job
      offline: offlineTechnicians.length, // Not available (OFFLINE or NULL)

      // Employment Status (separate metric)
      profileActive: activeProfileCount, // Employment ACTIVE
      profileInactive: inactiveProfileCount, // Employment INACTIVE

      // Legacy fields for backward compatibility
      active: onlineTechnicians.length, // Maps to "online" (available for work)
      inactive: inactiveProfileCount, // Profile INACTIVE

      // Detailed list
      technicians: technicians.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        role: t.role,
        type: t.technicianProfile?.type,
        specialization: t.technicianProfile?.specialization,
        profileStatus: t.technicianProfile?.status || "UNKNOWN",
        locationStatus: t.locationStatus || "OFFLINE",
        isBlocked: t.isBlocked,
        blockedReason: t.blockedReason,
        blockedAt: t.blockedAt,
        activeWorkOrders: t.technicianWOs.length,
        currentWO: t.technicianWOs[0] || null,
        lastLocationUpdate: t.locationUpdatedAt,
      })),
    };

    return res.json(summary);
  } catch (err) {
    next(err);
  }
};

// Get work order audit trail - Full history (Admin only)
export const getWorkOrderAuditTrail = async (req, res, next) => {
  try {
    const woId = Number(req.params.woId);

    // Get work order details
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: woId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        technician: {
          select: { id: true, name: true, phone: true },
        },
        dispatcher: {
          select: { id: true, name: true, phone: true },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        payments: {
          include: {
            verifiedBy: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        commissions: true,
        review: true,
      },
    });

    if (!workOrder) {
      return res.status(404).json({ message: "Work order not found" });
    }

    // Get audit logs related to this work order
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "WORK_ORDER", entityId: woId },
          {
            entityType: "PAYMENT",
            entityId: { in: workOrder.payments.map((p) => p.id) },
          },
          {
            entityType: "COMMISSION",
            entityId: { in: workOrder.commissions.map((c) => c.id) },
          },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Build timeline of events
    const timeline = [
      {
        event: "CREATED",
        timestamp: workOrder.createdAt,
        status: "UNASSIGNED",
        actor: workOrder.dispatcher,
        description: `Work order ${workOrder.woNumber} created`,
      },
    ];

    if (workOrder.dispatcherId) {
      timeline.push({
        event: "DISPATCHED",
        timestamp: workOrder.scheduledAt || workOrder.createdAt,
        status: "ASSIGNED",
        actor: workOrder.dispatcher,
        description: `Dispatched to ${
          workOrder.technician?.name || "technician"
        }`,
      });
    }

    if (workOrder.acceptedAt) {
      timeline.push({
        event: "ACCEPTED",
        timestamp: workOrder.acceptedAt,
        status: "ACCEPTED",
        actor: workOrder.technician,
        description: `Accepted by ${workOrder.technician?.name}`,
      });
    }

    if (workOrder.startedAt) {
      timeline.push({
        event: "STARTED",
        timestamp: workOrder.startedAt,
        status: "IN_PROGRESS",
        actor: workOrder.technician,
        description: `Work started by ${workOrder.technician?.name}`,
      });
    }

    if (workOrder.completedAt) {
      timeline.push({
        event: "COMPLETED",
        timestamp: workOrder.completedAt,
        status: "COMPLETED_PENDING_PAYMENT",
        actor: workOrder.technician,
        description: `Work completed by ${workOrder.technician?.name}`,
      });
    }

    workOrder.payments.forEach((payment) => {
      if (payment.createdAt) {
        timeline.push({
          event: "PAYMENT_UPLOADED",
          timestamp: payment.createdAt,
          status: payment.status,
          actor: workOrder.technician,
          description: `Payment proof uploaded - ${payment.method} ${payment.amount} KES`,
          paymentId: payment.id,
        });
      }

      if (payment.verifiedAt && payment.status === "VERIFIED") {
        timeline.push({
          event: "PAYMENT_VERIFIED",
          timestamp: payment.verifiedAt,
          status: "PAID_VERIFIED",
          actor: payment.verifiedBy,
          description: `Payment verified by ${payment.verifiedBy?.name}`,
          paymentId: payment.id,
        });
      }

      if (payment.verifiedAt && payment.status === "REJECTED") {
        timeline.push({
          event: "PAYMENT_REJECTED",
          timestamp: payment.verifiedAt,
          status: payment.status,
          actor: payment.verifiedBy,
          description: `Payment rejected: ${payment.rejectedReason}`,
          paymentId: payment.id,
        });
      }
    });

    if (workOrder.cancelledAt) {
      timeline.push({
        event: "CANCELLED",
        timestamp: workOrder.cancelledAt,
        status: "CANCELLED",
        description: `Cancelled: ${workOrder.cancelReason}`,
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.json({
      workOrder: {
        id: workOrder.id,
        woNumber: workOrder.woNumber,
        status: workOrder.status,
        customer: workOrder.customer,
        technician: workOrder.technician,
        dispatcher: workOrder.dispatcher,
        category: workOrder.category,
        address: workOrder.address,
        createdAt: workOrder.createdAt,
        completedAt: workOrder.completedAt,
      },
      timeline,
      auditLogs,
      payments: workOrder.payments,
      commissions: workOrder.commissions,
      review: workOrder.review,
    });
  } catch (err) {
    next(err);
  }
};

// Get technician count by specialization/type - Admin only
export const getTechnicianStats = async (req, res, next) => {
  try {
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
      },
      include: {
        technicianProfile: {
          select: {
            type: true,
            specialization: true,
            status: true,
          },
        },
      },
    });

    // Count by specialization
    const specializationCounts = {};
    const typeCounts = { INTERNAL: 0, FREELANCER: 0 };
    const statusCounts = { ACTIVE: 0, INACTIVE: 0 };

    technicians.forEach((tech) => {
      const profile = tech.technicianProfile;

      if (profile) {
        // Count by specialization
        const spec = profile.specialization || "GENERAL";
        specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;

        // Count by type
        if (profile.type) {
          typeCounts[profile.type] = (typeCounts[profile.type] || 0) + 1;
        }

        // Count by status
        if (profile.status) {
          statusCounts[profile.status] =
            (statusCounts[profile.status] || 0) + 1;
        }
      }
    });

    return res.json({
      total: technicians.length,
      bySpecialization: specializationCounts,
      byType: typeCounts,
      byStatus: statusCounts,
      details: Object.keys(specializationCounts).map((spec) => ({
        specialization: spec,
        count: specializationCounts[spec],
        technicians: technicians
          .filter(
            (t) => (t.technicianProfile?.specialization || "GENERAL") === spec,
          )
          .map((t) => ({
            id: t.id,
            name: t.name,
            phone: t.phone,
            type: t.technicianProfile?.type,
            status: t.technicianProfile?.status,
          })),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Get system configuration (commission/bonus rates)
export const getSystemConfig = async (req, res, next) => {
  try {
    let config = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    // Create default config if not exists
    if (!config) {
      config = await prisma.systemConfig.create({
        data: {
          freelancerCommissionRate: 0.05,
          internalEmployeeBonusRate: 0.05,
          internalEmployeeBaseSalary: 0,
          payoutFrequency: "WEEKLY",
        },
      });
    }

    return res.json({
      freelancerCommissionRate: config.freelancerCommissionRate,
      freelancerCommissionPercentage: config.freelancerCommissionRate * 100,
      internalEmployeeBonusRate: config.internalEmployeeBonusRate,
      internalEmployeeBonusPercentage: config.internalEmployeeBonusRate * 100,
      internalEmployeeBaseSalary: config.internalEmployeeBaseSalary,
      nextPayoutDate: config.nextPayoutDate,
      payoutFrequency: config.payoutFrequency,
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// Update system configuration (admin only)
export const updateSystemConfig = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const {
      freelancerCommissionRate,
      internalEmployeeBonusRate,
      internalEmployeeBaseSalary,
      nextPayoutDate,
      payoutFrequency,
    } = req.body;

    const updateData = { updatedById: adminId };

    // Validate and set freelancer commission rate (0-100%)
    if (freelancerCommissionRate !== undefined) {
      const rate = parseFloat(freelancerCommissionRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return res.status(400).json({
          message:
            "Freelancer commission rate must be between 0 and 1 (0-100%)",
        });
      }
      updateData.freelancerCommissionRate = rate;
    }

    // Validate and set internal employee bonus rate (0-100%)
    if (internalEmployeeBonusRate !== undefined) {
      const rate = parseFloat(internalEmployeeBonusRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return res.status(400).json({
          message:
            "Internal employee bonus rate must be between 0 and 1 (0-100%)",
        });
      }
      updateData.internalEmployeeBonusRate = rate;
    }

    // Set base salary
    if (internalEmployeeBaseSalary !== undefined) {
      updateData.internalEmployeeBaseSalary = parseFloat(
        internalEmployeeBaseSalary,
      );
    }

    // Set payout date
    if (nextPayoutDate) {
      updateData.nextPayoutDate = new Date(nextPayoutDate);
    }

    // Set payout frequency
    if (payoutFrequency && ["WEEKLY", "MONTHLY"].includes(payoutFrequency)) {
      updateData.payoutFrequency = payoutFrequency;
    }

    // Find existing config or create new one
    let existingConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    let config;
    if (existingConfig) {
      // Update existing config
      config = await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
    } else {
      // Create new config
      config = await prisma.systemConfig.create({
        data: {
          ...updateData,
          freelancerCommissionRate: updateData.freelancerCommissionRate || 0.05,
          internalEmployeeBonusRate:
            updateData.internalEmployeeBonusRate || 0.05,
          internalEmployeeBaseSalary:
            updateData.internalEmployeeBaseSalary || 0,
          payoutFrequency: updateData.payoutFrequency || "WEEKLY",
        },
      });
    }

    // ✅ Update all technician profiles with new rates (but respect custom rates)
    // Update freelancer commission rates (only for those without custom rates)
    if (updateData.freelancerCommissionRate !== undefined) {
      await prisma.technicianProfile.updateMany({
        where: {
          type: "FREELANCER",
          useCustomRate: false, // Only update profiles that don't have custom rates
        },
        data: { commissionRate: updateData.freelancerCommissionRate },
      });
      console.log(
        `✅ Updated FREELANCER profiles (without custom rates) with commission rate: ${
          updateData.freelancerCommissionRate * 100
        }%`,
      );
    }

    // Update internal employee bonus rates (only for those without custom rates)
    if (updateData.internalEmployeeBonusRate !== undefined) {
      await prisma.technicianProfile.updateMany({
        where: {
          type: "INTERNAL",
          useCustomRate: false, // Only update profiles that don't have custom rates
        },
        data: { bonusRate: updateData.internalEmployeeBonusRate },
      });
      console.log(
        `✅ Updated INTERNAL profiles (without custom rates) with bonus rate: ${
          updateData.internalEmployeeBonusRate * 100
        }%`,
      );
    }

    // Update internal employee base salary (only for those without custom rates)
    if (updateData.internalEmployeeBaseSalary !== undefined) {
      await prisma.technicianProfile.updateMany({
        where: {
          type: "INTERNAL",
          useCustomRate: false, // Only update profiles that don't have custom rates
        },
        data: { baseSalary: updateData.internalEmployeeBaseSalary },
      });
      console.log(
        `✅ Updated INTERNAL profiles (without custom rates) with base salary: ${updateData.internalEmployeeBaseSalary}`,
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "SYSTEM_CONFIG_UPDATED",
        entityType: "SYSTEM_CONFIG",
        entityId: config.id,
        metadataJson: JSON.stringify(updateData),
      },
    });

    // Get count of updated profiles
    const freelancerCount = await prisma.technicianProfile.count({
      where: { type: "FREELANCER" },
    });
    const internalCount = await prisma.technicianProfile.count({
      where: { type: "INTERNAL" },
    });

    return res.json({
      message: "System configuration updated successfully",
      config: {
        freelancerCommissionRate: config.freelancerCommissionRate,
        freelancerCommissionPercentage: config.freelancerCommissionRate * 100,
        internalEmployeeBonusRate: config.internalEmployeeBonusRate,
        internalEmployeeBonusPercentage: config.internalEmployeeBonusRate * 100,
        internalEmployeeBaseSalary: config.internalEmployeeBaseSalary,
        nextPayoutDate: config.nextPayoutDate,
        payoutFrequency: config.payoutFrequency,
        updatedAt: config.updatedAt,
      },
      profilesUpdated: {
        freelancers:
          updateData.freelancerCommissionRate !== undefined
            ? freelancerCount
            : 0,
        internalEmployees:
          updateData.internalEmployeeBonusRate !== undefined ||
          updateData.internalEmployeeBaseSalary !== undefined
            ? internalCount
            : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};
