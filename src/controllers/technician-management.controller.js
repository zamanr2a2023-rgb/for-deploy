/** @format */

// src/controllers/technician-management.controller.js
import { prisma } from "../prisma.js";
import bcrypt from "bcryptjs";
import uploadImageToService from "../utils/imageUpload.js";

/**
 * Get Technician Overview
 * Returns statistics and breakdown by specialization and employment type
 */
export const getTechnicianOverview = async (req, res, next) => {
  try {
    const { specialization } = req.query; // Filter: Electrical, General, HVAC, Plumbing

    const where = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
    };

    if (specialization && specialization !== "All") {
      where.technicianProfile = {
        specialization: specialization.toUpperCase(),
      };
    }

    const technicians = await prisma.user.findMany({
      where,
      include: {
        technicianProfile: {
          select: {
            type: true,
            specialization: true,
            status: true,
            commissionRate: true,
            bonusRate: true,
            baseSalary: true,
          },
        },
        workOrders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Count totals
    const total = technicians.length;
    const bySpecialization = {};
    const byType = { FREELANCER: 0, INTERNAL: 0 };

    technicians.forEach((tech) => {
      const profile = tech.technicianProfile;
      if (profile) {
        // Count by specialization
        const spec = profile.specialization || "GENERAL";
        bySpecialization[spec] = (bySpecialization[spec] || 0) + 1;

        // Count by type
        if (profile.type === "FREELANCER") {
          byType.FREELANCER++;
        } else if (profile.type === "INTERNAL") {
          byType.INTERNAL++;
        }
      }
    });

    // Calculate percentages for pie chart
    const specializationPercentages = {};
    Object.keys(bySpecialization).forEach((spec) => {
      specializationPercentages[spec] = {
        count: bySpecialization[spec],
        percentage: Math.round((bySpecialization[spec] / total) * 100),
      };
    });

    return res.json({
      total,
      bySpecialization,
      byType,
      specializationPercentages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Technicians Directory
 * Returns paginated list of technicians with full details
 */
export const getTechniciansDirectory = async (req, res, next) => {
  try {
    const { search, specialization, type, status } = req.query;

    const where = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
    };

    // Build filters
    const profileFilters = {};
    if (specialization && specialization !== "All") {
      profileFilters.specialization = specialization.toUpperCase();
    }
    if (type && type !== "All") {
      profileFilters.type = type.toUpperCase();
    }
    if (status) {
      profileFilters.status = status.toUpperCase();
    }

    if (Object.keys(profileFilters).length > 0) {
      where.technicianProfile = profileFilters;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const technicians = await prisma.user.findMany({
      where,
      include: {
        technicianProfile: true,
        workOrders: {
          where: {
            status: { in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] },
          },
          select: { id: true },
        },
        _count: {
          select: {
            workOrders: {
              where: {
                status: "PAID_VERIFIED",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = technicians.map((tech) => {
      const profile = tech.technicianProfile;
      const isEmployee = tech.role === "TECH_INTERNAL";

      return {
        id: tech.id,
        techId: `TECH-${String(tech.id).padStart(3, "0")}`,
        name: tech.name,
        phone: tech.phone,
        email: tech.email,
        specialization: profile?.specialization || "GENERAL",
        type: profile?.type || (isEmployee ? "INTERNAL" : "FREELANCER"),
        employmentType: isEmployee ? "Employee" : "Freelancer",
        status: profile?.status || "ACTIVE",
        isActive: profile?.status === "ACTIVE",
        isBlocked: tech.isBlocked,
        // Compensation
        commissionRate: profile?.commissionRate
          ? `${(profile.commissionRate * 100).toFixed(0)}%`
          : null,
        bonusRate: profile?.bonusRate
          ? `${(profile.bonusRate * 100).toFixed(0)}%`
          : null,
        monthlySalary: profile?.baseSalary || null,
        // Work statistics
        activeWorkOrders: tech.workOrders.length,
        completedJobs: tech._count.workOrders,
        openWorkOrders: tech.workOrders.filter(
          (wo) => wo.status === "ASSIGNED" || wo.status === "ON_HOLD"
        ).length,
        // Additional info
        joinDate: tech.createdAt,
        homeAddress: tech.homeAddress,
      };
    });

    return res.json({
      total: formatted.length,
      technicians: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Single Technician Details
 */
export const getTechnicianDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const technician = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: {
        technicianProfile: true,
        workOrders: {
          include: {
            service: { select: { name: true } },
            category: { select: { name: true } },
            customer: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        commissions: {
          include: {
            workOrder: {
              select: {
                woNumber: true,
                service: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    const profile = technician.technicianProfile;
    const isEmployee = technician.role === "TECH_INTERNAL";

    return res.json({
      id: technician.id,
      techId: `TECH-${String(technician.id).padStart(3, "0")}`,
      name: technician.name,
      phone: technician.phone,
      email: technician.email,
      role: technician.role,
      isBlocked: technician.isBlocked,
      blockedReason: technician.blockedReason,
      // Profile
      specialization: profile?.specialization,
      type: profile?.type,
      status: profile?.status,
      photoUrl: profile?.photoUrl,
      idCardUrl: profile?.idCardUrl,
      residencePermitUrl: profile?.residencePermitUrl,
      degreesUrl: profile?.degreesUrl,
      isForeigner: profile?.isForeigner,
      homeAddress: technician.homeAddress,
      academicTitle: profile?.academicTitle,
      // Compensation
      commissionRate: profile?.commissionRate,
      bonusRate: profile?.bonusRate,
      baseSalary: profile?.baseSalary,
      // Statistics
      totalWorkOrders: technician.workOrders.length,
      activeWorkOrders: technician.workOrders.filter((wo) =>
        ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(wo.status)
      ).length,
      completedWorkOrders: technician.workOrders.filter(
        (wo) => wo.status === "PAID_VERIFIED"
      ).length,
      // Recent activity
      recentWorkOrders: technician.workOrders.slice(0, 5).map((wo) => ({
        id: wo.id,
        woNumber: wo.woNumber,
        service: wo.service?.name || wo.category?.name,
        customer: wo.customer?.name,
        status: wo.status,
        createdAt: wo.createdAt,
      })),
      recentCommissions: technician.commissions.slice(0, 5).map((c) => ({
        id: c.id,
        amount: c.amount,
        type: c.type,
        workOrder: c.workOrder?.woNumber,
        status: c.status,
        createdAt: c.createdAt,
      })),
      // Dates
      joinDate: technician.createdAt,
      lastActive: technician.locationUpdatedAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create New Technician
 */
export const createTechnician = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password, // Optional password from admin
      joinDate,
      specialization,
      type, // FREELANCER or INTERNAL
      commissionRate,
      bonusRate,
      baseSalary,
      homeAddress,
      academicTitle,
      position,
      department,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      mobileBankingType,
      mobileBankingNumber,
    } = req.body;

    // Validation
    if (!name || !phone || !specialization) {
      return res.status(400).json({
        message: "Name, phone, and specialization are required",
      });
    }

    if (!type || !["FREELANCER", "INTERNAL"].includes(type.toUpperCase())) {
      return res.status(400).json({
        message: "Valid employment type (FREELANCER or INTERNAL) is required",
      });
    }

    // Check if phone exists
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      return res.status(400).json({
        message: "Phone number already exists",
      });
    }

    // Check if email exists (only if email is provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
    }

    // Determine role based on type
    const role =
      type.toUpperCase() === "INTERNAL" ? "TECH_INTERNAL" : "TECH_FREELANCER";

    // Use provided password or generate temporary one
    const tempPassword =
      password || `Tech${Math.random().toString(36).slice(-8)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user and profile in transaction
    const technician = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          role,
          homeAddress,
          createdAt: joinDate ? new Date(joinDate) : undefined,
        },
      });

      // Default rates from RateStructure/SystemConfig when not provided
      const { getDefaultRatesForNewTechnician } = await import(
        "../services/defaultRates.service.js"
      );
      const defaultRates = await getDefaultRatesForNewTechnician(
        type.toUpperCase() === "INTERNAL" ? "INTERNAL" : "FREELANCER"
      );
      const profile = await tx.technicianProfile.create({
        data: {
          userId: user.id,
          type: type.toUpperCase(),
          specialization: specialization.toUpperCase(),
          status: "ACTIVE",
          commissionRate:
            commissionRate !== undefined
              ? parseFloat(commissionRate)
              : defaultRates.commissionRate,
          bonusRate:
            bonusRate !== undefined
              ? parseFloat(bonusRate)
              : defaultRates.bonusRate,
          useCustomRate:
            commissionRate !== undefined || bonusRate !== undefined,
          baseSalary:
            baseSalary !== undefined && baseSalary !== null && baseSalary !== ""
              ? parseFloat(baseSalary)
              : defaultRates.baseSalary ?? 0,
          academicTitle,
          position: position || undefined,
          department: department || undefined,
          joinDate: joinDate ? new Date(joinDate) : undefined,
          homeAddress: homeAddress || undefined,
          bankName: bankName || undefined,
          bankAccountNumber: bankAccountNumber || undefined,
          bankAccountHolder: bankAccountHolder || undefined,
          mobileBankingType: mobileBankingType || undefined,
          mobileBankingNumber: mobileBankingNumber || undefined,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "TECHNICIAN_CREATED",
          entityType: "USER",
          entityId: user.id,
        },
      });

      return { ...user, technicianProfile: profile, tempPassword };
    });

    // Upload and save profile documents if provided (form-data)
    if (req.files && Object.keys(req.files).length > 0) {
      const profileUpdateData = {};
      try {
        if (req.files.photo && req.files.photo[0]) {
          profileUpdateData.photoUrl = await uploadImageToService(
            req.files.photo[0]
          );
        }
        if (req.files.idCardUrl && req.files.idCardUrl[0]) {
          profileUpdateData.idCardUrl = await uploadImageToService(
            req.files.idCardUrl[0]
          );
        }
        if (req.files.degreesUrl && req.files.degreesUrl.length > 0) {
          const degreeUrls = await Promise.all(
            req.files.degreesUrl.map((file) => uploadImageToService(file))
          );
          profileUpdateData.degreesUrl = JSON.stringify(degreeUrls);
        }
        if (Object.keys(profileUpdateData).length > 0) {
          await prisma.technicianProfile.update({
            where: { userId: technician.id },
            data: profileUpdateData,
          });
        }
      } catch (uploadErr) {
        console.error("Document upload error (technician already created):", uploadErr);
        // Don't fail the request; technician was created, only document upload failed
      }
    }

    return res.status(201).json({
      message: "Technician created successfully",
      technician: {
        id: technician.id,
        techId: `TECH-${String(technician.id).padStart(3, "0")}`,
        name: technician.name,
        phone: technician.phone,
        email: technician.email,
        role: technician.role,
        specialization: technician.technicianProfile.specialization,
        type: technician.technicianProfile.type,
        password: technician.tempPassword,
        passwordNote: password
          ? "Custom password set"
          : "Temporary password generated",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Technician
 */
export const updateTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      password,
      specialization,
      type,
      commissionRate,
      bonusRate,
      baseSalary,
      homeAddress,
      academicTitle,
      status,
      position,
      department,
      joinDate,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      mobileBankingType,
      mobileBankingNumber,
    } = req.body;

    // Check if email already exists for another user
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: Number(id) },
        },
      });
      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists for another user",
        });
      }
    }

    // Check if phone already exists for another user (when updating phone)
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: Number(id) },
        },
      });
      if (existingPhone) {
        return res.status(400).json({
          message: "Phone number already exists",
        });
      }
    }

    // Check if technician exists
    const existingTechnician = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { technicianProfile: true },
    });

    if (!existingTechnician) {
      return res.status(404).json({
        message: "Technician not found",
      });
    }

    if (!existingTechnician.technicianProfile) {
      return res.status(404).json({
        message: "Technician profile not found. This user is not a technician.",
      });
    }

    console.log("🔍 Existing technician profile before update:", {
      commissionRate: existingTechnician.technicianProfile.commissionRate,
      bonusRate: existingTechnician.technicianProfile.bonusRate,
      useCustomRate: existingTechnician.technicianProfile.useCustomRate,
    });

    const updateData = {};
    const profileUpdateData = {};

    console.log("📝 Update Technician Request Body:", req.body);
    console.log(
      "📝 Commission Rate from body:",
      commissionRate,
      "Type:",
      typeof commissionRate
    );

    // User fields
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
    if (password !== undefined && password !== "") {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Profile fields
    if (specialization !== undefined)
      profileUpdateData.specialization = specialization.toUpperCase();
    if (type !== undefined && ["FREELANCER", "INTERNAL"].includes(type.toUpperCase()))
      profileUpdateData.type = type.toUpperCase();
    if (commissionRate !== undefined) {
      profileUpdateData.commissionRate = parseFloat(commissionRate);
      profileUpdateData.useCustomRate = true; // Admin explicitly set a custom rate
      console.log(
        "✅ Setting commissionRate to:",
        profileUpdateData.commissionRate
      );
    }
    if (bonusRate !== undefined) {
      profileUpdateData.bonusRate = parseFloat(bonusRate);
      profileUpdateData.useCustomRate = true; // Admin explicitly set a custom rate
      console.log("✅ Setting bonusRate to:", profileUpdateData.bonusRate);
    }
    if (baseSalary !== undefined)
      profileUpdateData.baseSalary = parseFloat(baseSalary);
    if (academicTitle !== undefined)
      profileUpdateData.academicTitle = academicTitle;
    if (status !== undefined) profileUpdateData.status = status.toUpperCase();
    if (position !== undefined) profileUpdateData.position = position;
    if (department !== undefined) profileUpdateData.department = department;
    if (joinDate !== undefined && joinDate !== "") {
      const joinDateParsed = new Date(joinDate);
      if (!isNaN(joinDateParsed.getTime()))
        profileUpdateData.joinDate = joinDateParsed;
    }
    if (bankName !== undefined) profileUpdateData.bankName = bankName;
    if (bankAccountNumber !== undefined)
      profileUpdateData.bankAccountNumber = bankAccountNumber;
    if (bankAccountHolder !== undefined)
      profileUpdateData.bankAccountHolder = bankAccountHolder;
    if (mobileBankingType !== undefined)
      profileUpdateData.mobileBankingType = mobileBankingType;
    if (mobileBankingNumber !== undefined)
      profileUpdateData.mobileBankingNumber = mobileBankingNumber;

    // Upload and add document URLs if provided (form-data)
    if (req.files && Object.keys(req.files).length > 0) {
      try {
        if (req.files.photo && req.files.photo[0]) {
          profileUpdateData.photoUrl = await uploadImageToService(
            req.files.photo[0]
          );
        }
        if (req.files.idCardUrl && req.files.idCardUrl[0]) {
          profileUpdateData.idCardUrl = await uploadImageToService(
            req.files.idCardUrl[0]
          );
        }
        if (req.files.degreesUrl && req.files.degreesUrl.length > 0) {
          const degreeUrls = await Promise.all(
            req.files.degreesUrl.map((file) => uploadImageToService(file))
          );
          profileUpdateData.degreesUrl = JSON.stringify(degreeUrls);
        }
      } catch (uploadErr) {
        console.error("Document upload error during update:", uploadErr);
      }
    }

    console.log("📝 Profile Update Data:", profileUpdateData);

    const updated = await prisma.$transaction(async (tx) => {
      // Update user
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: Number(id) },
          data: updateData,
        });
      }

      // Update profile (only if there are profile fields to update)
      if (Object.keys(profileUpdateData).length > 0) {
        console.log("📝 Updating technicianProfile for userId:", Number(id));
        const updatedProfile = await tx.technicianProfile.update({
          where: { userId: Number(id) },
          data: profileUpdateData,
        });
        console.log("✅ Updated Profile:", updatedProfile);
      }

      // Create audit log (optional - don't fail if userId is invalid)
      if (req.user && req.user.id) {
        try {
          await tx.auditLog.create({
            data: {
              userId: req.user.id,
              action: "TECHNICIAN_UPDATED",
              entityType: "USER",
              entityId: Number(id),
            },
          });
        } catch (auditError) {
          console.warn("⚠️  Failed to create audit log:", auditError.message);
        }
      }

      return await tx.user.findUnique({
        where: { id: Number(id) },
        include: {
          technicianProfile: {
            select: {
              id: true,
              type: true,
              commissionRate: true,
              bonusRate: true,
              useCustomRate: true,
              baseSalary: true,
              status: true,
              specialization: true,
              academicTitle: true,
              department: true,
              joinDate: true,
              position: true,
              photoUrl: true,
              idCardUrl: true,
              degreesUrl: true,
              homeAddress: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountHolder: true,
              mobileBankingType: true,
              mobileBankingNumber: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    console.log(
      "🔄 Final updated technician with profile:",
      JSON.stringify(updated, null, 2)
    );

    return res.json({
      message: "Technician updated successfully",
      technician: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        homeAddress: updated.homeAddress,
        technicianProfile: updated.technicianProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Block/Unblock Technician
 */
export const toggleBlockTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked, reason } = req.body;

    if (isBlocked && !reason) {
      return res.status(400).json({
        message: "Reason is required when blocking a technician",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: Number(id) },
        data: {
          isBlocked,
          blockedReason: isBlocked ? reason : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: isBlocked ? "TECHNICIAN_BLOCKED" : "TECHNICIAN_UNBLOCKED",
          entityType: "USER",
          entityId: Number(id),
        },
      });

      return user;
    });

    return res.json({
      message: `Technician ${isBlocked ? "blocked" : "unblocked"} successfully`,
      technician: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload Technician Documents
 */
export const uploadTechnicianDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Process uploaded files and upload to external service
    if (req.files) {
      // Upload photo to external service
      if (req.files.photoUrl && req.files.photoUrl[0]) {
        const photoUrl = await uploadImageToService(req.files.photoUrl[0]);
        updateData.photoUrl = photoUrl;
      }

      // Upload ID card to external service
      if (req.files.idCardUrl && req.files.idCardUrl[0]) {
        const idCardUrl = await uploadImageToService(req.files.idCardUrl[0]);
        updateData.idCardUrl = idCardUrl;
      }

      // Upload residence permit to external service
      if (req.files.residencePermitUrl && req.files.residencePermitUrl[0]) {
        const residencePermitUrl = await uploadImageToService(
          req.files.residencePermitUrl[0]
        );
        updateData.residencePermitUrl = residencePermitUrl;
      }

      // Upload degrees/certificates to external service
      if (req.files.degreesUrl && req.files.degreesUrl.length > 0) {
        const degreeUrls = await Promise.all(
          req.files.degreesUrl.map((file) => uploadImageToService(file))
        );
        updateData.degreesUrl = JSON.stringify(degreeUrls);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Check if technician exists and has a profile
    const technician = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { technicianProfile: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.technicianProfile) {
      return res.status(400).json({
        message:
          "Technician profile not found. Please create the profile first.",
      });
    }

    const updated = await prisma.technicianProfile.update({
      where: { userId: Number(id) },
      data: updateData,
    });

    return res.json({
      message: "Documents uploaded successfully",
      profile: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export Technicians to CSV
 */
export const exportTechniciansCSV = async (req, res, next) => {
  try {
    const { specialization, type } = req.query;

    const where = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
    };

    if (specialization && specialization !== "All") {
      where.technicianProfile = {
        specialization: specialization.toUpperCase(),
      };
    }

    const technicians = await prisma.user.findMany({
      where,
      include: {
        technicianProfile: true,
        _count: {
          select: {
            workOrders: true,
          },
        },
      },
    });

    // Generate CSV
    const csvRows = [
      [
        "ID",
        "Name",
        "Phone",
        "Email",
        "Specialization",
        "Type",
        "Status",
        "Commission Rate",
        "Bonus Rate",
        "Base Salary",
        "Total Jobs",
        "Join Date",
      ].join(","),
    ];

    technicians.forEach((tech) => {
      const profile = tech.technicianProfile;
      csvRows.push(
        [
          `TECH-${String(tech.id).padStart(3, "0")}`,
          tech.name,
          tech.phone,
          tech.email || "",
          profile?.specialization || "",
          profile?.type || "",
          profile?.status || "",
          profile?.commissionRate
            ? `${(profile.commissionRate * 100).toFixed(0)}%`
            : "",
          profile?.bonusRate ? `${(profile.bonusRate * 100).toFixed(0)}%` : "",
          profile?.baseSalary || "",
          tech._count.workOrders,
          new Date(tech.createdAt).toLocaleDateString(),
        ].join(",")
      );
    });

    const csv = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=technicians-${Date.now()}.csv`
    );
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};
