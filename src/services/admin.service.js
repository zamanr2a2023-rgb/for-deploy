/** @format */

// src/services/admin.service.js
import { prisma } from "../prisma.js";
import bcrypt from "bcryptjs";
import { notifyTechnicianBlocked } from "./notification.service.js";

// ✅ Get dashboard overview stats
export const getDashboardStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSRs,
    totalWOs,
    completedWOs,
    pendingPayments,
    totalRevenue,
    monthlyRevenue,
    totalCommissions,
    monthlyCommissions,
    activeTechnicians,
    totalCustomers,
  ] = await Promise.all([
    prisma.serviceRequest.count(),
    prisma.workOrder.count(),
    prisma.workOrder.count({ where: { status: "PAID_VERIFIED" } }),
    prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.payment.aggregate({
      where: { status: "VERIFIED" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "VERIFIED",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
        isBlocked: false,
      },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  return {
    totalSRs,
    totalWOs,
    completedWOs,
    pendingPayments,
    // Round to 2 decimal places to avoid floating-point precision issues
    totalRevenue: Math.round((totalRevenue._sum.amount || 0) * 100) / 100,
    monthlyRevenue: Math.round((monthlyRevenue._sum.amount || 0) * 100) / 100,
    totalCommissions:
      Math.round((totalCommissions._sum.amount || 0) * 100) / 100,
    monthlyCommissions:
      Math.round((monthlyCommissions._sum.amount || 0) * 100) / 100,
    activeTechnicians,
    totalCustomers,
  };
};

// ✅ List all users with filtering
export const findUsers = async (filters) => {
  const { role, isBlocked, search } = filters;

  const where = {};

  if (role) {
    where.role = role;
  }

  if (isBlocked !== undefined) {
    where.isBlocked = isBlocked === "true";
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      technicianProfile: true,
      wallet: true,
      technicianWOs: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Add work order statistics for technicians
  const usersWithStats = users.map((user) => {
    const userData = { ...user };

    // Calculate work order statistics for technicians
    if (user.role === "TECH_INTERNAL" || user.role === "TECH_FREELANCER") {
      const activeWOs = user.technicianWOs.filter(
        (wo) => wo.status === "ASSIGNED" || wo.status === "ACCEPTED",
      ).length;

      const completedWOs = user.technicianWOs.filter(
        (wo) =>
          wo.status === "COMPLETED_PENDING_PAYMENT" ||
          wo.status === "PAID_VERIFIED",
      ).length;

      const openWOs = user.technicianWOs.filter(
        (wo) => wo.status === "IN_PROGRESS",
      ).length;

      // Add statistics to user object
      userData.activeWorkOrders = activeWOs;
      userData.completedJobs = completedWOs;
      userData.openWorkOrders = openWOs;
      userData.commissionRate = user.technicianProfile?.commissionRate || 0;
    }

    // Remove the full technicianWOs array to reduce payload size
    delete userData.technicianWOs;

    return userData;
  });

  return usersWithStats;
};

// ✅ Create user with profile
/**
 * Create User with Technician Profile (if applicable)
 *
 * ROLES:
 * - CUSTOMER: Regular customer who requests services
 * - TECH_INTERNAL: Company employee technician (receives salary + commission)
 * - TECH_FREELANCER: Independent contractor (commission only, has wallet)
 * - DISPATCHER: Assigns work orders to technicians
 * - CALL_CENTER: Creates service requests on behalf of customers
 * - ADMIN: Full system access
 *
 * TECHNICIAN TYPES:
 * - INTERNAL: Full-time employee (role: TECH_INTERNAL)
 *   * Receives base salary
 *   * Gets commission on completed jobs
 *   * No wallet system
 *
 * - FREELANCER: Independent contractor (role: TECH_FREELANCER)
 *   * Commission only, no salary
 *   * Has wallet for balance tracking
 *   * Can request payouts
 *
 * TECHNICIAN PROFILE OPTIONAL FIELDS:
 * - specialization: ELECTRICAL, PLUMBING, HVAC, GENERAL, CARPENTRY, PAINTING
 * - commissionRate: Percentage (default: 0.2 = 20%)
 * - bonusRate: Percentage (default: 0.05 = 5%)
 * - baseSalary: Monthly salary (TECH_INTERNAL only)
 * - academicTitle: BSc, MSc, Diploma, etc.
 * - photoUrl: Profile photo URL
 * - idCardUrl: ID card/passport URL
 * - residencePermitUrl: For foreign workers
 * - residencePermitFrom: Validity start date
 * - residencePermitTo: Validity end date
 * - degreesUrl: Degrees/certificates JSON array
 *
 * TECHNICIAN STATUS:
 * - ACTIVE: Available for work assignments
 * - INACTIVE: Temporarily not working
 */
export const createUserWithProfile = async (userData, adminId) => {
  const {
    name,
    phone,
    email,
    password,
    role,
    technicianProfile,
    homeAddress,
    latitude,
    longitude,
  } = userData;

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new Error("Phone already exists");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      passwordHash: hash,
      role,
      homeAddress: homeAddress || null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      registrationSource: "ADMIN",
      createdById: adminId,
    },
  });

  // Create technician profile if role is technician
  if (role === "TECH_INTERNAL" || role === "TECH_FREELANCER") {
    const validSpecializations = [
      "ELECTRICAL",
      "PLUMBING",
      "HVAC",
      "GENERAL",
      "CARPENTRY",
      "PAINTING",
    ];
    const specialization = technicianProfile?.specialization || "GENERAL";

    if (!validSpecializations.includes(specialization)) {
      throw new Error(
        `Invalid specialization. Must be one of: ${validSpecializations.join(
          ", ",
        )}`,
      );
    }

    const techType = role === "TECH_INTERNAL" ? "INTERNAL" : "FREELANCER";
    const { getDefaultRatesForNewTechnician } = await import(
      "./defaultRates.service.js"
    );
    const defaultRates = await getDefaultRatesForNewTechnician(techType);
    const hasCustomRates =
      technicianProfile?.commissionRate !== undefined ||
      technicianProfile?.bonusRate !== undefined ||
      technicianProfile?.baseSalary !== undefined;

    await prisma.technicianProfile.create({
      data: {
        userId: user.id,
        type: techType,
        specialization: specialization,
        commissionRate:
          technicianProfile?.commissionRate ?? defaultRates.commissionRate,
        bonusRate: technicianProfile?.bonusRate ?? defaultRates.bonusRate,
        useCustomRate:
          technicianProfile?.useCustomRate !== undefined
            ? technicianProfile.useCustomRate
            : hasCustomRates,
        baseSalary:
          technicianProfile?.baseSalary !== undefined
            ? technicianProfile.baseSalary
            : role === "TECH_INTERNAL"
              ? defaultRates.baseSalary
              : null,
        status: technicianProfile?.status || "ACTIVE",
        academicTitle: technicianProfile?.academicTitle || null,
        photoUrl: technicianProfile?.photoUrl || null,
        idCardUrl: technicianProfile?.idCardUrl || null,
        residencePermitUrl: technicianProfile?.residencePermitUrl || null,
        residencePermitFrom: technicianProfile?.residencePermitFrom
          ? new Date(technicianProfile.residencePermitFrom)
          : null,
        residencePermitTo: technicianProfile?.residencePermitTo
          ? new Date(technicianProfile.residencePermitTo)
          : null,
        degreesUrl: technicianProfile?.degreesUrl || null,
      },
    });

    // Create wallet for freelancers
    if (role === "TECH_FREELANCER") {
      await prisma.wallet.create({
        data: {
          technicianId: user.id,
          balance: 0,
        },
      });
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: user.id,
      metadataJson: JSON.stringify({ role }),
    },
  });

  return user;
};

// ✅ Update user
export const updateUserById = async (userId, updateData, adminId) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: user.id,
    },
  });

  return user;
};

// ✅ Block/Unblock technician
export const setTechnicianBlockStatus = async (
  technicianId,
  isBlocked,
  blockedReason,
  adminId,
) => {
  const user = await prisma.user.update({
    where: { id: technicianId },
    data: {
      isBlocked,
      blockedReason: isBlocked ? blockedReason : null,
      blockedAt: isBlocked ? new Date() : null,
      blockedById: isBlocked ? adminId : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: isBlocked ? "TECHNICIAN_BLOCKED" : "TECHNICIAN_UNBLOCKED",
      entityType: "USER",
      entityId: user.id,
      metadataJson: JSON.stringify({ reason: blockedReason }),
    },
  });

  // Send notification
  if (isBlocked) {
    await notifyTechnicianBlocked(technicianId, blockedReason);
  }

  return user;
};

// ✅ Update technician profile
export const updateTechProfile = async (userId, profileData, adminId) => {
  const {
    commissionRate,
    bonusRate,
    status,
    specialization,
    useCustomRate,
    academicTitle,
    photoUrl,
    idCardUrl,
    residencePermitUrl,
    residencePermitFrom,
    residencePermitTo,
    degreesUrl,
    baseSalary,
    type,
    homeAddress,
    isForeigner,
    department,
    position,
    joinDate,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    mobileBankingType,
    mobileBankingNumber,
  } = profileData;

  const updateData = {};

  // If admin sets a custom commission rate, enable useCustomRate flag
  if (commissionRate !== undefined) {
    updateData.commissionRate = Number(commissionRate);
    // Only set useCustomRate to true if not explicitly set to false
    if (useCustomRate !== false) {
      updateData.useCustomRate = true;
    }
  }

  // If admin sets a custom bonus rate, enable useCustomRate flag
  if (bonusRate !== undefined) {
    updateData.bonusRate = Number(bonusRate);
    // Only set useCustomRate to true if not explicitly set to false
    if (useCustomRate !== false) {
      updateData.useCustomRate = true;
    }
  }

  // Allow explicit control of useCustomRate flag
  if (useCustomRate !== undefined) {
    updateData.useCustomRate = useCustomRate;
  }

  if (status) updateData.status = status;
  if (type) updateData.type = type;

  // Handle file uploads
  if (photoUrl) updateData.photoUrl = photoUrl;
  if (idCardUrl) updateData.idCardUrl = idCardUrl;
  if (residencePermitUrl) updateData.residencePermitUrl = residencePermitUrl;
  if (degreesUrl) updateData.degreesUrl = degreesUrl;

  // Handle text fields
  if (baseSalary !== undefined) updateData.baseSalary = Number(baseSalary);
  if (academicTitle) updateData.academicTitle = academicTitle;
  if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
  if (department) updateData.department = department;
  if (position) updateData.position = position;

  // Handle boolean fields
  if (isForeigner !== undefined) updateData.isForeigner = Boolean(isForeigner);

  // Handle date fields
  if (residencePermitFrom)
    updateData.residencePermitFrom = new Date(residencePermitFrom);
  if (residencePermitTo)
    updateData.residencePermitTo = new Date(residencePermitTo);
  if (joinDate) updateData.joinDate = new Date(joinDate);

  // Handle bank account fields
  if (bankName) updateData.bankName = bankName;
  if (bankAccountNumber) updateData.bankAccountNumber = bankAccountNumber;
  if (bankAccountHolder) updateData.bankAccountHolder = bankAccountHolder;
  if (mobileBankingType) updateData.mobileBankingType = mobileBankingType;
  if (mobileBankingNumber) updateData.mobileBankingNumber = mobileBankingNumber;

  if (specialization) {
    const validSpecializations = [
      "ELECTRICAL",
      "PLUMBING",
      "HVAC",
      "GENERAL",
      "CARPENTRY",
      "PAINTING",
    ];
    if (!validSpecializations.includes(specialization)) {
      throw new Error(
        `Invalid specialization. Must be one of: ${validSpecializations.join(
          ", ",
        )}`,
      );
    }
    updateData.specialization = specialization;
  }

  // Use upsert to create profile if it doesn't exist
  const profile = await prisma.technicianProfile.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      ...updateData,
      // Set defaults for required fields if not provided
      type: updateData.type || "FREELANCER", // Default to FREELANCER
      specialization: updateData.specialization || "GENERAL",
      status: updateData.status || "PENDING",
      commissionRate: updateData.commissionRate || 0.2, // Default 20%
      bonusRate: updateData.bonusRate || 0.05, // Default 5%
    },
  });

  // Create audit log (optional - don't fail if adminId is invalid)
  if (adminId) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: "TECHNICIAN_PROFILE_UPDATED",
          entityType: "TECHNICIAN_PROFILE",
          entityId: profile.id,
        },
      });
    } catch (auditError) {
      console.warn("⚠️  Failed to create audit log:", auditError.message);
    }
  }

  return profile;
};

// ✅ Get audit logs with filters
export const fetchAuditLogs = async (filters) => {
  const { userId, action, entityType, startDate, endDate } = filters;

  const where = {};

  if (userId) {
    where.userId = Number(userId);
  }

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

// ✅ Get active technician locations (for map view)
export const getActiveTechnicianLocations = async () => {
  return await prisma.user.findMany({
    where: {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      lastLatitude: true,
      lastLongitude: true,
      locationStatus: true,
      locationUpdatedAt: true,
    },
  });
};
