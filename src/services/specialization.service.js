/** @format */

// src/services/specialization.service.js
import { prisma } from "../prisma.js";

/**
 * Get all specializations
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Only return active specializations
 * @returns {Array} List of specializations
 */
export const getSpecializations = async (options = {}) => {
  const { activeOnly = true } = options;

  const where = activeOnly ? { isActive: true } : {};

  return await prisma.specialization.findMany({
    where,
    orderBy: {
      name: "asc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Get specialization by ID
 * @param {number} id - Specialization ID
 * @returns {Object|null} Specialization or null
 */
export const getSpecializationById = async (id) => {
  return await prisma.specialization.findUnique({
    where: { id: parseInt(id) },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Create new specialization
 * @param {Object} data - Specialization data
 * @param {string} data.name - Specialization name
 * @param {string} data.description - Specialization description
 * @param {number} createdById - ID of user creating the specialization
 * @returns {Object} Created specialization
 */
export const createSpecialization = async (data, createdById) => {
  const { name, description } = data;

  // Check if specialization with same name already exists
  const existing = await prisma.specialization.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new Error(`Specialization with name "${name}" already exists`);
  }

  return await prisma.specialization.create({
    data: {
      name: name.toUpperCase(), // Store in uppercase for consistency
      description,
      createdById,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Update specialization
 * @param {number} id - Specialization ID
 * @param {Object} data - Update data
 * @param {string} data.name - Specialization name
 * @param {string} data.description - Specialization description
 * @param {boolean} data.isActive - Whether specialization is active
 * @returns {Object} Updated specialization
 */
export const updateSpecialization = async (id, data) => {
  const { name, description, isActive } = data;
  const specializationId = parseInt(id);

  // Check if specialization exists
  const existing = await prisma.specialization.findUnique({
    where: { id: specializationId },
  });

  if (!existing) {
    throw new Error("Specialization not found");
  }

  // If name is being updated, check for duplicates
  if (name && name.toUpperCase() !== existing.name) {
    const duplicate = await prisma.specialization.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        id: {
          not: specializationId,
        },
      },
    });

    if (duplicate) {
      throw new Error(`Specialization with name "${name}" already exists`);
    }
  }

  return await prisma.specialization.update({
    where: { id: specializationId },
    data: {
      ...(name && { name: name.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Delete specialization
 * @param {number} id - Specialization ID
 * @returns {Object} Deleted specialization
 */
export const deleteSpecialization = async (id) => {
  const specializationId = parseInt(id);

  // Check if specialization exists
  const existing = await prisma.specialization.findUnique({
    where: { id: specializationId },
  });

  if (!existing) {
    throw new Error("Specialization not found");
  }

  // Check if specialization is being used by any technician profiles
  const technicianCount = await prisma.technicianProfile.count({
    where: {
      specialization: existing.name,
    },
  });

  if (technicianCount > 0) {
    throw new Error(
      `Cannot delete specialization "${existing.name}". It is currently assigned to ${technicianCount} technician(s). Please reassign or deactivate instead.`,
    );
  }

  return await prisma.specialization.delete({
    where: { id: specializationId },
  });
};

/**
 * Get specialization usage statistics
 * @returns {Array} Specializations with usage counts
 */
export const getSpecializationStats = async () => {
  // Get all specializations with technician counts
  const specializations = await prisma.specialization.findMany({
    orderBy: { name: "asc" },
  });

  const stats = await Promise.all(
    specializations.map(async (spec) => {
      const technicianCount = await prisma.technicianProfile.count({
        where: {
          specialization: spec.name,
          user: {
            isBlocked: false, // Only count active technicians
          },
        },
      });

      return {
        id: spec.id,
        name: spec.name,
        description: spec.description,
        isActive: spec.isActive,
        technicianCount,
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt,
      };
    }),
  );

  return stats;
};

/**
 * Seed default specializations
 * This function creates the default specializations if they don't exist
 * @param {number} adminUserId - ID of admin user creating defaults
 * @returns {Array} Created or existing specializations
 */
export const seedDefaultSpecializations = async (adminUserId) => {
  const defaultSpecializations = [
    {
      name: "ELECTRICAL",
      description: "Electrical installation, repair, and maintenance",
    },
    {
      name: "PLUMBING",
      description: "Plumbing installation, repair, and maintenance",
    },
    {
      name: "HVAC",
      description: "Heating, Ventilation, and Air Conditioning services",
    },
    {
      name: "GENERAL",
      description: "General maintenance and repair services",
    },
    {
      name: "CARPENTRY",
      description: "Wood working, furniture repair, and construction",
    },
    {
      name: "PAINTING",
      description: "Interior and exterior painting services",
    },
  ];

  const results = [];

  for (const spec of defaultSpecializations) {
    // Check if it already exists
    const existing = await prisma.specialization.findFirst({
      where: {
        name: {
          equals: spec.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      results.push(existing);
    } else {
      const created = await prisma.specialization.create({
        data: {
          name: spec.name,
          description: spec.description,
          createdById: adminUserId,
        },
      });
      results.push(created);
    }
  }

  return results;
};
