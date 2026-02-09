/** @format */

// src/controllers/rate.controller.js
import { prisma } from "../prisma.js";

/**
 * Get Rate Summary - Dashboard stats
 * Shows: Commission Rates count, Avg Commission, Bonus Rates, Avg Bonus
 */
export const getRateSummary = async (req, res, next) => {
  try {
    // Get all commission rates (freelancers)
    const commissionRates = await prisma.rateStructure.findMany({
      where: { type: "COMMISSION" },
    });

    // Get all bonus rates (internal employees)
    const bonusRates = await prisma.rateStructure.findMany({
      where: { type: "BONUS" },
    });

    // Calculate averages with proper precision handling
    const avgCommission =
      commissionRates.length > 0
        ? Math.round(
            (commissionRates.reduce((sum, r) => sum + r.rate, 0) /
              commissionRates.length) *
              10000
          ) / 10000
        : 0;

    const avgBonus =
      bonusRates.length > 0
        ? Math.round(
            (bonusRates.reduce((sum, r) => sum + r.rate, 0) /
              bonusRates.length) *
              10000
          ) / 10000
        : 0;

    return res.json({
      commissionRates: {
        count: commissionRates.length,
        avgRate: Math.round(avgCommission * 1000) / 10, // Convert to percentage with 1 decimal
        avgRateDisplay: `${(avgCommission * 100).toFixed(1)}%`,
      },
      bonusRates: {
        count: bonusRates.length,
        avgRate: Math.round(avgBonus * 1000) / 10,
        avgRateDisplay: `${(avgBonus * 100).toFixed(1)}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get All Rate Structures
 * Supports filtering by type (COMMISSION/BONUS) and techType (FREELANCER/INTERNAL)
 */
export const getRateStructures = async (req, res, next) => {
  try {
    const { type, techType } = req.query;

    const where = {};
    if (type) where.type = type;
    if (techType) where.techType = techType;

    const rates = await prisma.rateStructure.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Format for frontend
    const formattedRates = rates.map((rate) => ({
      id: rate.id,
      rateId: rate.rateId,
      name: rate.name,
      type: rate.type,
      techType: rate.techType,
      rate: rate.rate,
      ratePercentage: Math.round(rate.rate * 100),
      rateDisplay: `${Math.round(rate.rate * 100)}%`,
      isDefault: rate.isDefault,
      description: rate.description,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt,
    }));

    return res.json(formattedRates);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Single Rate Structure by ID
 */
export const getRateStructure = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rate = await prisma.rateStructure.findUnique({
      where: { id: parseInt(id) },
    });

    if (!rate) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    return res.json({
      ...rate,
      ratePercentage: Math.round(rate.rate * 100),
      rateDisplay: `${Math.round(rate.rate * 100)}%`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Rate Structure
 * Body: { name, type, techType, rate, isDefault, description }
 */
export const createRateStructure = async (req, res, next) => {
  try {
    const { name, type, techType, rate, isDefault, description } = req.body;

    // Validate required fields
    if (!name || !type || !techType || rate === undefined) {
      return res.status(400).json({
        message: "Missing required fields: name, type, techType, rate",
      });
    }

    // Validate type
    if (!["COMMISSION", "BONUS"].includes(type)) {
      return res.status(400).json({
        message: "Type must be COMMISSION or BONUS",
      });
    }

    // Validate techType
    if (!["FREELANCER", "INTERNAL"].includes(techType)) {
      return res.status(400).json({
        message: "TechType must be FREELANCER or INTERNAL",
      });
    }

    // Validate rate (0-1)
    if (rate < 0 || rate > 1) {
      return res.status(400).json({
        message: "Rate must be between 0 and 1 (e.g., 0.10 for 10%)",
      });
    }

    // Generate rateId
    const lastRate = await prisma.rateStructure.findFirst({
      orderBy: { id: "desc" },
    });
    const nextNum = lastRate ? lastRate.id + 1 : 1;
    const rateId = `RATE${String(nextNum).padStart(3, "0")}`;

    // If this is set as default, unset other defaults of same type
    if (isDefault) {
      await prisma.rateStructure.updateMany({
        where: { type, techType, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newRate = await prisma.rateStructure.create({
      data: {
        rateId,
        name,
        type,
        techType,
        rate: parseFloat(rate),
        isDefault: isDefault || false,
        description,
      },
    });

    return res.status(201).json({
      message: "Rate structure created successfully",
      rate: {
        ...newRate,
        ratePercentage: Math.round(newRate.rate * 100),
        rateDisplay: `${Math.round(newRate.rate * 100)}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Rate Structure
 */
export const updateRateStructure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, rate, isDefault, description } = req.body;

    const existing = await prisma.rateStructure.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    // Validate rate if provided
    if (rate !== undefined && (rate < 0 || rate > 1)) {
      return res.status(400).json({
        message: "Rate must be between 0 and 1 (e.g., 0.10 for 10%)",
      });
    }

    // If setting as default, unset other defaults of same type
    if (isDefault && !existing.isDefault) {
      await prisma.rateStructure.updateMany({
        where: {
          type: existing.type,
          techType: existing.techType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.rateStructure.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // When a default rate is updated or this structure is set as default, propagate to profiles with useCustomRate: false
    const defaultRateChanged =
      updated.isDefault &&
      (updateData.rate !== undefined || (isDefault && !existing.isDefault));
    if (defaultRateChanged) {
      const profileType =
        updated.techType === "FREELANCER" ? "FREELANCER" : "INTERNAL";
      const field =
        updated.type === "COMMISSION" ? "commissionRate" : "bonusRate";
      const { count } = await prisma.technicianProfile.updateMany({
        where: {
          type: profileType,
          useCustomRate: false,
        },
        data: { [field]: updated.rate },
      });
      if (count > 0) {
        console.log(
          `✅ Updated ${count} ${profileType} profile(s) with new default ${field}: ${(updated.rate * 100).toFixed(0)}%`
        );
      }
    }

    return res.json({
      message: "Rate structure updated successfully",
      rate: {
        ...updated,
        ratePercentage: Math.round(updated.rate * 100),
        rateDisplay: `${Math.round(updated.rate * 100)}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Rate Structure
 */
export const deleteRateStructure = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rateStructure.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    // Don't allow deleting if it's the only default
    if (existing.isDefault) {
      const otherRates = await prisma.rateStructure.count({
        where: {
          type: existing.type,
          techType: existing.techType,
          id: { not: parseInt(id) },
        },
      });

      if (otherRates === 0) {
        return res.status(400).json({
          message:
            "Cannot delete the only rate structure for this type. Create another one first.",
        });
      }

      // Set another rate as default
      const nextDefault = await prisma.rateStructure.findFirst({
        where: {
          type: existing.type,
          techType: existing.techType,
          id: { not: parseInt(id) },
        },
      });

      if (nextDefault) {
        await prisma.rateStructure.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.rateStructure.delete({
      where: { id: parseInt(id) },
    });

    return res.json({ message: "Rate structure deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Set Rate as Default
 */
export const setDefaultRate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rate = await prisma.rateStructure.findUnique({
      where: { id: parseInt(id) },
    });

    if (!rate) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    // Unset other defaults of same type
    await prisma.rateStructure.updateMany({
      where: {
        type: rate.type,
        techType: rate.techType,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await prisma.rateStructure.update({
      where: { id: parseInt(id) },
      data: { isDefault: true },
    });

    return res.json({
      message: `${
        rate.rateId
      } is now the default ${rate.type.toLowerCase()} rate for ${rate.techType.toLowerCase()}s`,
      rate: {
        ...updated,
        ratePercentage: Math.round(updated.rate * 100),
        rateDisplay: `${Math.round(updated.rate * 100)}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Default Rate for a tech type
 * Used when creating new technicians
 */
export const getDefaultRate = async (req, res, next) => {
  try {
    const { techType } = req.params; // FREELANCER or INTERNAL

    if (!["FREELANCER", "INTERNAL"].includes(techType)) {
      return res.status(400).json({
        message: "TechType must be FREELANCER or INTERNAL",
      });
    }

    const type = techType === "FREELANCER" ? "COMMISSION" : "BONUS";

    const defaultRate = await prisma.rateStructure.findFirst({
      where: { techType, type, isDefault: true },
    });

    if (!defaultRate) {
      // Return system default if no rate structure exists
      const systemDefault = techType === "FREELANCER" ? 0.1 : 0.05;
      return res.json({
        rate: systemDefault,
        ratePercentage: systemDefault * 100,
        rateDisplay: `${systemDefault * 100}%`,
        isSystemDefault: true,
        message: "No custom rate structure found, using system default",
      });
    }

    return res.json({
      ...defaultRate,
      ratePercentage: Math.round(defaultRate.rate * 100),
      rateDisplay: `${Math.round(defaultRate.rate * 100)}%`,
      isSystemDefault: false,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get All Technicians with their individual rates
 * Returns technicians with their commission/bonus rates for the rate management page
 */
export const getTechniciansWithRates = async (req, res, next) => {
  try {
    const { type, search } = req.query; // type: FREELANCER or INTERNAL

    const where = {
      role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      isBlocked: false,
    };

    if (type) {
      where.technicianProfile = {
        type: type.toUpperCase(),
      };
    }

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
        technicianProfile: {
          select: {
            id: true,
            type: true,
            commissionRate: true,
            bonusRate: true,
            specialization: true,
            status: true,
          },
        },
        _count: {
          select: {
            workOrders: {
              where: { status: "PAID_VERIFIED" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = technicians.map((tech) => {
      const profile = tech.technicianProfile;
      const isFreelancer = profile?.type === "FREELANCER";

      return {
        id: tech.id,
        techId: `TECH-${String(tech.id).padStart(3, "0")}`,
        name: tech.name,
        phone: tech.phone,
        email: tech.email,
        type: profile?.type || "UNKNOWN",
        typeDisplay: isFreelancer ? "Freelancer" : "Internal Employee",
        specialization: profile?.specialization,
        status: profile?.status,
        // Rate info
        commissionRate: profile?.commissionRate || 0,
        commissionRatePercentage: Math.round(
          (profile?.commissionRate || 0) * 100
        ),
        commissionRateDisplay: `${Math.round(
          (profile?.commissionRate || 0) * 100
        )}%`,
        bonusRate: profile?.bonusRate || 0,
        bonusRatePercentage: Math.round((profile?.bonusRate || 0) * 100),
        bonusRateDisplay: `${Math.round((profile?.bonusRate || 0) * 100)}%`,
        // Stats
        completedJobs: tech._count.workOrders,
      };
    });

    // Separate by type for easier frontend handling
    const freelancers = formatted.filter((t) => t.type === "FREELANCER");
    const internalEmployees = formatted.filter((t) => t.type === "INTERNAL");

    return res.json({
      total: formatted.length,
      freelancers: {
        count: freelancers.length,
        technicians: freelancers,
      },
      internalEmployees: {
        count: internalEmployees.length,
        technicians: internalEmployees,
      },
      all: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Single Technician's Rate Details
 */
export const getTechnicianRate = async (req, res, next) => {
  try {
    const { technicianId } = req.params;

    const technician = await prisma.user.findUnique({
      where: { id: parseInt(technicianId) },
      include: {
        technicianProfile: true,
      },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.technicianProfile) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    const profile = technician.technicianProfile;
    const isFreelancer = profile.type === "FREELANCER";

    // Get default rate for comparison
    const defaultRateType = isFreelancer ? "COMMISSION" : "BONUS";
    const defaultRate = await prisma.rateStructure.findFirst({
      where: {
        techType: profile.type,
        type: defaultRateType,
        isDefault: true,
      },
    });

    return res.json({
      technicianId: technician.id,
      techId: `TECH-${String(technician.id).padStart(3, "0")}`,
      name: technician.name,
      type: profile.type,
      typeDisplay: isFreelancer ? "Freelancer" : "Internal Employee",
      // Current individual rates
      commissionRate: profile.commissionRate,
      commissionRatePercentage: Math.round(profile.commissionRate * 100),
      commissionRateDisplay: `${Math.round(profile.commissionRate * 100)}%`,
      bonusRate: profile.bonusRate,
      bonusRatePercentage: Math.round(profile.bonusRate * 100),
      bonusRateDisplay: `${Math.round(profile.bonusRate * 100)}%`,
      // Default rate for this type
      defaultRate: defaultRate
        ? {
            id: defaultRate.id,
            rateId: defaultRate.rateId,
            name: defaultRate.name,
            rate: defaultRate.rate,
            ratePercentage: Math.round(defaultRate.rate * 100),
            rateDisplay: `${Math.round(defaultRate.rate * 100)}%`,
          }
        : null,
      // Whether using custom rate
      isUsingCustomRate: defaultRate
        ? isFreelancer
          ? profile.commissionRate !== defaultRate.rate
          : profile.bonusRate !== defaultRate.rate
        : true,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Set Individual Commission/Bonus Rate for a Technician
 * Body: { commissionRate, bonusRate } - rates as decimals (e.g., 0.10 for 10%)
 */
export const setTechnicianRate = async (req, res, next) => {
  try {
    const { technicianId } = req.params;
    const { commissionRate, bonusRate } = req.body;

    // Validate at least one rate is provided
    if (commissionRate === undefined && bonusRate === undefined) {
      return res.status(400).json({
        message:
          "At least one rate (commissionRate or bonusRate) must be provided",
      });
    }

    // Validate rates are between 0 and 1
    if (
      commissionRate !== undefined &&
      (commissionRate < 0 || commissionRate > 1)
    ) {
      return res.status(400).json({
        message: "Commission rate must be between 0 and 1 (e.g., 0.10 for 10%)",
      });
    }

    if (bonusRate !== undefined && (bonusRate < 0 || bonusRate > 1)) {
      return res.status(400).json({
        message: "Bonus rate must be between 0 and 1 (e.g., 0.05 for 5%)",
      });
    }

    // Check if technician exists
    const technician = await prisma.user.findUnique({
      where: { id: parseInt(technicianId) },
      include: { technicianProfile: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.technicianProfile) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    const updateData = {};
    if (commissionRate !== undefined) {
      updateData.commissionRate = parseFloat(commissionRate);
    }
    if (bonusRate !== undefined) {
      updateData.bonusRate = parseFloat(bonusRate);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.technicianProfile.update({
        where: { userId: parseInt(technicianId) },
        data: updateData,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "TECHNICIAN_RATE_UPDATED",
          entityType: "TECHNICIAN_PROFILE",
          entityId: profile.id,
          metadataJson: JSON.stringify({
            technicianId: parseInt(technicianId),
            technicianName: technician.name,
            previousCommissionRate: technician.technicianProfile.commissionRate,
            previousBonusRate: technician.technicianProfile.bonusRate,
            newCommissionRate: updateData.commissionRate,
            newBonusRate: updateData.bonusRate,
          }),
        },
      });

      return profile;
    });

    return res.json({
      message: "Technician rate updated successfully",
      technician: {
        id: technician.id,
        techId: `TECH-${String(technician.id).padStart(3, "0")}`,
        name: technician.name,
        type: updated.type,
        commissionRate: updated.commissionRate,
        commissionRatePercentage: Math.round(updated.commissionRate * 100),
        commissionRateDisplay: `${Math.round(updated.commissionRate * 100)}%`,
        bonusRate: updated.bonusRate,
        bonusRatePercentage: Math.round(updated.bonusRate * 100),
        bonusRateDisplay: `${Math.round(updated.bonusRate * 100)}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Apply Rate Structure to a Technician
 * Copies the rate from a rate structure to the technician's individual rate
 */
export const applyRateStructureToTechnician = async (req, res, next) => {
  try {
    const { technicianId, rateStructureId } = req.params;

    // Get rate structure
    const rateStructure = await prisma.rateStructure.findUnique({
      where: { id: parseInt(rateStructureId) },
    });

    if (!rateStructure) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    // Get technician
    const technician = await prisma.user.findUnique({
      where: { id: parseInt(technicianId) },
      include: { technicianProfile: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.technicianProfile) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    // Validate rate structure matches technician type
    if (rateStructure.techType !== technician.technicianProfile.type) {
      return res.status(400).json({
        message: `Rate structure is for ${rateStructure.techType} but technician is ${technician.technicianProfile.type}`,
      });
    }

    // Determine which field to update based on rate type
    const updateData = {};
    if (rateStructure.type === "COMMISSION") {
      updateData.commissionRate = rateStructure.rate;
    } else if (rateStructure.type === "BONUS") {
      updateData.bonusRate = rateStructure.rate;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.technicianProfile.update({
        where: { userId: parseInt(technicianId) },
        data: updateData,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "RATE_STRUCTURE_APPLIED",
          entityType: "TECHNICIAN_PROFILE",
          entityId: profile.id,
          metadataJson: JSON.stringify({
            technicianId: parseInt(technicianId),
            technicianName: technician.name,
            rateStructureId: rateStructure.id,
            rateStructureName: rateStructure.name,
            rateType: rateStructure.type,
            appliedRate: rateStructure.rate,
          }),
        },
      });

      return profile;
    });

    return res.json({
      message: `Rate structure "${rateStructure.name}" applied to ${technician.name}`,
      technician: {
        id: technician.id,
        techId: `TECH-${String(technician.id).padStart(3, "0")}`,
        name: technician.name,
        type: updated.type,
        commissionRate: updated.commissionRate,
        commissionRatePercentage: Math.round(updated.commissionRate * 100),
        commissionRateDisplay: `${Math.round(updated.commissionRate * 100)}%`,
        bonusRate: updated.bonusRate,
        bonusRatePercentage: Math.round(updated.bonusRate * 100),
        bonusRateDisplay: `${Math.round(updated.bonusRate * 100)}%`,
      },
      appliedRate: {
        id: rateStructure.id,
        rateId: rateStructure.rateId,
        name: rateStructure.name,
        type: rateStructure.type,
        rate: rateStructure.rate,
        ratePercentage: Math.round(rateStructure.rate * 100),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk Apply Rate Structure to Multiple Technicians
 * Body: { technicianIds: number[] }
 */
export const bulkApplyRateStructure = async (req, res, next) => {
  try {
    const { rateStructureId } = req.params;
    const { technicianIds } = req.body;

    if (
      !technicianIds ||
      !Array.isArray(technicianIds) ||
      technicianIds.length === 0
    ) {
      return res.status(400).json({
        message: "technicianIds must be a non-empty array",
      });
    }

    // Get rate structure
    const rateStructure = await prisma.rateStructure.findUnique({
      where: { id: parseInt(rateStructureId) },
    });

    if (!rateStructure) {
      return res.status(404).json({ message: "Rate structure not found" });
    }

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: {
        id: { in: technicianIds.map((id) => parseInt(id)) },
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: { technicianProfile: true },
    });

    // Filter technicians that match the rate structure type
    const matchingTechnicians = technicians.filter(
      (t) => t.technicianProfile?.type === rateStructure.techType
    );

    if (matchingTechnicians.length === 0) {
      return res.status(400).json({
        message: `No technicians found matching the rate structure type (${rateStructure.techType})`,
      });
    }

    // Determine which field to update
    const updateField =
      rateStructure.type === "COMMISSION" ? "commissionRate" : "bonusRate";

    const results = await prisma.$transaction(async (tx) => {
      const updated = [];

      for (const tech of matchingTechnicians) {
        const profile = await tx.technicianProfile.update({
          where: { userId: tech.id },
          data: { [updateField]: rateStructure.rate },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: "BULK_RATE_STRUCTURE_APPLIED",
            entityType: "TECHNICIAN_PROFILE",
            entityId: profile.id,
            metadataJson: JSON.stringify({
              technicianId: tech.id,
              technicianName: tech.name,
              rateStructureId: rateStructure.id,
              rateStructureName: rateStructure.name,
              rateType: rateStructure.type,
              appliedRate: rateStructure.rate,
            }),
          },
        });

        updated.push({
          id: tech.id,
          name: tech.name,
          type: profile.type,
          [updateField]: rateStructure.rate,
        });
      }

      return updated;
    });

    const skipped = technicianIds.length - matchingTechnicians.length;

    return res.json({
      message: `Rate structure applied to ${results.length} technician(s)`,
      applied: results.length,
      skipped,
      skippedReason:
        skipped > 0
          ? `${skipped} technician(s) were skipped because they don't match the rate type (${rateStructure.techType})`
          : null,
      rateStructure: {
        id: rateStructure.id,
        rateId: rateStructure.rateId,
        name: rateStructure.name,
        type: rateStructure.type,
        rate: rateStructure.rate,
        ratePercentage: Math.round(rateStructure.rate * 100),
      },
      technicians: results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset Technician Rate to Default
 * Resets the technician's rate to the default rate structure for their type
 */
export const resetTechnicianRateToDefault = async (req, res, next) => {
  try {
    const { technicianId } = req.params;

    // Get technician
    const technician = await prisma.user.findUnique({
      where: { id: parseInt(technicianId) },
      include: { technicianProfile: true },
    });

    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    if (!technician.technicianProfile) {
      return res.status(404).json({ message: "Technician profile not found" });
    }

    const isFreelancer = technician.technicianProfile.type === "FREELANCER";
    const rateType = isFreelancer ? "COMMISSION" : "BONUS";

    // Get default rate structure
    const defaultRate = await prisma.rateStructure.findFirst({
      where: {
        techType: technician.technicianProfile.type,
        type: rateType,
        isDefault: true,
      },
    });

    // Use default rate or system fallback
    const newRate = defaultRate ? defaultRate.rate : isFreelancer ? 0.1 : 0.05;

    const updateField = isFreelancer ? "commissionRate" : "bonusRate";

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.technicianProfile.update({
        where: { userId: parseInt(technicianId) },
        data: { [updateField]: newRate },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "TECHNICIAN_RATE_RESET_TO_DEFAULT",
          entityType: "TECHNICIAN_PROFILE",
          entityId: profile.id,
          metadataJson: JSON.stringify({
            technicianId: parseInt(technicianId),
            technicianName: technician.name,
            rateType,
            previousRate: technician.technicianProfile[updateField],
            newRate,
            defaultRateId: defaultRate?.id || null,
          }),
        },
      });

      return profile;
    });

    return res.json({
      message: `Rate reset to default for ${technician.name}`,
      technician: {
        id: technician.id,
        techId: `TECH-${String(technician.id).padStart(3, "0")}`,
        name: technician.name,
        type: updated.type,
        commissionRate: updated.commissionRate,
        commissionRatePercentage: Math.round(updated.commissionRate * 100),
        commissionRateDisplay: `${Math.round(updated.commissionRate * 100)}%`,
        bonusRate: updated.bonusRate,
        bonusRatePercentage: Math.round(updated.bonusRate * 100),
        bonusRateDisplay: `${Math.round(updated.bonusRate * 100)}%`,
      },
      appliedDefault: defaultRate
        ? {
            id: defaultRate.id,
            rateId: defaultRate.rateId,
            name: defaultRate.name,
            rate: defaultRate.rate,
            ratePercentage: Math.round(defaultRate.rate * 100),
          }
        : {
            rate: newRate,
            ratePercentage: Math.round(newRate * 100),
            isSystemFallback: true,
          },
    });
  } catch (err) {
    next(err);
  }
};
