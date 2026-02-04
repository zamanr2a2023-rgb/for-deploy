/** @format */

// src/controllers/specialization.controller.js
import * as specializationService from "../services/specialization.service.js";

/**
 * Get all specializations
 * @route GET /api/specializations
 * @access Private - Admin, Dispatcher
 */
export const getSpecializations = async (req, res, next) => {
  try {
    const { activeOnly = "true" } = req.query;

    const specializations = await specializationService.getSpecializations({
      activeOnly: activeOnly === "true",
    });

    return res.json({
      success: true,
      data: specializations,
      count: specializations.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specialization by ID
 * @route GET /api/specializations/:id
 * @access Private - Admin, Dispatcher
 */
export const getSpecializationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const specialization =
      await specializationService.getSpecializationById(id);

    if (!specialization) {
      return res.status(404).json({
        success: false,
        message: "Specialization not found",
      });
    }

    return res.json({
      success: true,
      data: specialization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new specialization
 * @route POST /api/specializations
 * @access Private - Admin only
 */
export const createSpecialization = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const createdById = req.user.id;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Specialization name is required",
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Specialization name must not exceed 50 characters",
      });
    }

    const specialization = await specializationService.createSpecialization(
      {
        name: name.trim(),
        description: description?.trim() || null,
      },
      createdById,
    );

    return res.status(201).json({
      success: true,
      message: "Specialization created successfully",
      data: specialization,
    });
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Update specialization
 * @route PUT /api/specializations/:id
 * @access Private - Admin only
 */
export const updateSpecialization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Specialization name cannot be empty",
        });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Specialization name must not exceed 50 characters",
        });
      }
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const specialization = await specializationService.updateSpecialization(
      id,
      updateData,
    );

    return res.json({
      success: true,
      message: "Specialization updated successfully",
      data: specialization,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Delete specialization
 * @route DELETE /api/specializations/:id
 * @access Private - Admin only
 */
export const deleteSpecialization = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedSpecialization =
      await specializationService.deleteSpecialization(id);

    return res.json({
      success: true,
      message: "Specialization deleted successfully",
      data: deletedSpecialization,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes("Cannot delete")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: "You can deactivate the specialization instead of deleting it",
      });
    }
    next(error);
  }
};

/**
 * Get specialization statistics
 * @route GET /api/specializations/stats
 * @access Private - Admin, Dispatcher
 */
export const getSpecializationStats = async (req, res, next) => {
  try {
    const stats = await specializationService.getSpecializationStats();

    // Calculate summary
    const summary = {
      total: stats.length,
      active: stats.filter((s) => s.isActive).length,
      inactive: stats.filter((s) => !s.isActive).length,
      totalTechnicians: stats.reduce((sum, s) => sum + s.technicianCount, 0),
      mostPopular:
        stats.length > 0
          ? stats.reduce((prev, current) =>
              prev.technicianCount > current.technicianCount ? prev : current,
            )
          : null,
    };

    return res.json({
      success: true,
      data: {
        specializations: stats,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default specializations
 * @route POST /api/specializations/seed
 * @access Private - Admin only
 */
export const seedSpecializations = async (req, res, next) => {
  try {
    const adminUserId = req.user.id;

    const specializations =
      await specializationService.seedDefaultSpecializations(adminUserId);

    return res.json({
      success: true,
      message: "Default specializations seeded successfully",
      data: specializations,
      count: specializations.length,
    });
  } catch (error) {
    next(error);
  }
};
