/** @format */

import { prisma } from "../prisma.js";
import { uploadImageToService } from "../utils/imageUpload.js";

export const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true }, // Only return active categories
      include: {
        services: {
          include: {
            subservices: {
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json(categories);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Upload image to external service if provided
    let image = null;
    if (req.file) {
      try {
        image = await uploadImageToService(req.file);
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        // Continue without image if upload fails
      }
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        image,
      },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "CATEGORY_CREATED",
        entityType: "CATEGORY",
        entityId: category.id,
      },
    });

    return res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const { name, description } = req.body;

    // Upload image to external service if new image provided
    let image = undefined;
    if (req.file) {
      try {
        image = await uploadImageToService(req.file);
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        // Continue without updating image if upload fails
      }
    }

    const updateData = { name, description };
    if (image) {
      updateData.image = image;
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "CATEGORY_UPDATED",
        entityType: "CATEGORY",
        entityId: category.id,
      },
    });

    return res.json(category);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const { force } = req.query; // ?force=true to force delete with cascading

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check for dependencies
    const [serviceCount, serviceRequestCount, workOrderCount] =
      await Promise.all([
        prisma.service.count({ where: { categoryId } }),
        prisma.serviceRequest.count({ where: { categoryId } }),
        prisma.workOrder.count({ where: { categoryId } }),
      ]);

    const hasDependencies =
      serviceCount > 0 || serviceRequestCount > 0 || workOrderCount > 0;

    if (hasDependencies && force !== "true") {
      return res.status(409).json({
        message: "Cannot delete category with existing dependencies",
        dependencies: {
          services: serviceCount,
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
        hint: "Use ?force=true to delete category and reassign/remove all dependencies, or manually reassign services first",
      });
    }

    // If force delete, handle dependencies
    if (force === "true" && hasDependencies) {
      // Delete in order: WorkOrders -> ServiceRequests -> Subservices -> Services -> Category
      // Note: This will cascade delete related records. Use with caution!

      // Get all services under this category
      const services = await prisma.service.findMany({
        where: { categoryId },
        select: { id: true },
      });
      const serviceIds = services.map((s) => s.id);

      // Get all subservices under these services
      const subservices = await prisma.subservice.findMany({
        where: { serviceId: { in: serviceIds } },
        select: { id: true },
      });
      const subserviceIds = subservices.map((s) => s.id);

      // Delete in proper order to avoid FK constraints
      await prisma.$transaction(async (tx) => {
        // 1. Delete commissions related to work orders of this category
        await tx.commission.deleteMany({
          where: { workOrder: { categoryId } },
        });

        // 2. Delete payments related to work orders of this category
        await tx.payment.deleteMany({
          where: { workOrder: { categoryId } },
        });

        // 3. Delete reviews related to work orders of this category
        await tx.review.deleteMany({
          where: { workOrder: { categoryId } },
        });

        // 4. Delete work orders
        await tx.workOrder.deleteMany({
          where: { categoryId },
        });

        // 5. Delete service requests
        await tx.serviceRequest.deleteMany({
          where: { categoryId },
        });

        // 6. Delete subservices
        if (subserviceIds.length > 0) {
          await tx.subservice.deleteMany({
            where: { id: { in: subserviceIds } },
          });
        }

        // 7. Delete services
        await tx.service.deleteMany({
          where: { categoryId },
        });

        // 8. Finally delete the category
        await tx.category.delete({
          where: { id: categoryId },
        });

        // 9. Create audit log
        await tx.auditLog.create({
          data: {
            user: { connect: { id: req.user.id } },
            action: "CATEGORY_FORCE_DELETED",
            entityType: "CATEGORY",
            entityId: categoryId,
            metadataJson: JSON.stringify({
              details: `Force deleted category "${category.name}" with ${serviceCount} services, ${serviceRequestCount} service requests, ${workOrderCount} work orders`,
            }),
          },
        });
      });

      console.log(
        `⚠️ Force deleted category ${category.name} (ID: ${categoryId}) with all dependencies`,
      );

      return res.json({
        message: "Category and all dependencies deleted successfully",
        deleted: {
          category: category.name,
          services: serviceCount,
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
      });
    }

    // Normal delete (no dependencies)
    await prisma.category.delete({
      where: { id: categoryId },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "CATEGORY_DELETED",
        entityType: "CATEGORY",
        entityId: categoryId,
        metadataJson: JSON.stringify({
          details: `Deleted category "${category.name}"`,
        }),
      },
    });

    return res.json({ message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const createSubservice = async (req, res, next) => {
  try {
    const { serviceId, name, description, baseRate } = req.body;

    if (!serviceId || !name) {
      return res
        .status(400)
        .json({ message: "ServiceId and name are required" });
    }

    const subservice = await prisma.subservice.create({
      data: {
        serviceId: Number(serviceId),
        name,
        description,
        baseRate: baseRate ? Number(baseRate) : null,
      },
    });

    return res.status(201).json(subservice);
  } catch (err) {
    next(err);
  }
};

export const updateSubservice = async (req, res, next) => {
  try {
    const subserviceId = Number(req.params.id);
    const { name, description, baseRate } = req.body;

    const subservice = await prisma.subservice.update({
      where: { id: subserviceId },
      data: {
        name,
        description,
        baseRate: baseRate ? Number(baseRate) : undefined,
      },
    });

    return res.json(subservice);
  } catch (err) {
    next(err);
  }
};

export const deleteSubservice = async (req, res, next) => {
  try {
    const subserviceId = Number(req.params.id);
    const { force } = req.query; // ?force=true to force delete with cascading

    // Check if subservice exists
    const subservice = await prisma.subservice.findUnique({
      where: { id: subserviceId },
      select: { id: true, name: true },
    });

    if (!subservice) {
      return res.status(404).json({ message: "Subservice not found" });
    }

    // Check for dependencies
    const [serviceRequestCount, workOrderCount] = await Promise.all([
      prisma.serviceRequest.count({ where: { subserviceId } }),
      prisma.workOrder.count({ where: { subserviceId } }),
    ]);

    const hasDependencies = serviceRequestCount > 0 || workOrderCount > 0;

    if (hasDependencies && force !== "true") {
      return res.status(409).json({
        message: "Cannot delete subservice with existing dependencies",
        dependencies: {
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
        hint: "Use ?force=true to delete subservice and all dependencies",
      });
    }

    // If force delete, handle dependencies
    if (force === "true" && hasDependencies) {
      await prisma.$transaction(async (tx) => {
        // 1. Delete commissions related to work orders of this subservice
        await tx.commission.deleteMany({
          where: { workOrder: { subserviceId } },
        });

        // 2. Delete payments related to work orders of this subservice
        await tx.payment.deleteMany({
          where: { workOrder: { subserviceId } },
        });

        // 3. Delete reviews related to work orders of this subservice
        await tx.review.deleteMany({
          where: { workOrder: { subserviceId } },
        });

        // 4. Delete work orders
        await tx.workOrder.deleteMany({
          where: { subserviceId },
        });

        // 5. Delete service requests
        await tx.serviceRequest.deleteMany({
          where: { subserviceId },
        });

        // 6. Delete the subservice
        await tx.subservice.delete({
          where: { id: subserviceId },
        });

        // 7. Create audit log
        await tx.auditLog.create({
          data: {
            user: { connect: { id: req.user.id } },
            action: "SUBSERVICE_FORCE_DELETED",
            entityType: "SUBSERVICE",
            entityId: subserviceId,
            metadataJson: JSON.stringify({
              details: `Force deleted subservice "${subservice.name}" with ${serviceRequestCount} service requests, ${workOrderCount} work orders`,
            }),
          },
        });
      });

      return res.json({
        message: "Subservice and all dependencies deleted successfully",
        deleted: {
          subservice: subservice.name,
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
      });
    }

    // Normal delete (no dependencies)
    await prisma.subservice.delete({
      where: { id: subserviceId },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "SUBSERVICE_DELETED",
        entityType: "SUBSERVICE",
        entityId: subserviceId,
        metadataJson: JSON.stringify({
          details: `Deleted subservice "${subservice.name}"`,
        }),
      },
    });

    return res.json({ message: "Subservice deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const createService = async (req, res, next) => {
  try {
    const { categoryId, name, description } = req.body;

    if (!categoryId || !name) {
      return res
        .status(400)
        .json({ message: "CategoryId and name are required" });
    }

    const service = await prisma.service.create({
      data: {
        categoryId: Number(categoryId),
        name,
        description,
      },
    });

    return res.status(201).json(service);
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const { name, description } = req.body;

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name,
        description,
      },
    });

    return res.json(service);
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const { force } = req.query; // ?force=true to force delete with cascading

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Check for dependencies
    const [subserviceCount, serviceRequestCount, workOrderCount] =
      await Promise.all([
        prisma.subservice.count({ where: { serviceId } }),
        prisma.serviceRequest.count({ where: { serviceId } }),
        prisma.workOrder.count({ where: { serviceId } }),
      ]);

    const hasDependencies =
      subserviceCount > 0 || serviceRequestCount > 0 || workOrderCount > 0;

    if (hasDependencies && force !== "true") {
      return res.status(409).json({
        message: "Cannot delete service with existing dependencies",
        dependencies: {
          subservices: subserviceCount,
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
        hint: "Use ?force=true to delete service and all dependencies",
      });
    }

    // If force delete, handle dependencies
    if (force === "true" && hasDependencies) {
      await prisma.$transaction(async (tx) => {
        // 1. Delete commissions related to work orders of this service
        await tx.commission.deleteMany({
          where: { workOrder: { serviceId } },
        });

        // 2. Delete payments related to work orders of this service
        await tx.payment.deleteMany({
          where: { workOrder: { serviceId } },
        });

        // 3. Delete reviews related to work orders of this service
        await tx.review.deleteMany({
          where: { workOrder: { serviceId } },
        });

        // 4. Delete work orders
        await tx.workOrder.deleteMany({
          where: { serviceId },
        });

        // 5. Delete service requests
        await tx.serviceRequest.deleteMany({
          where: { serviceId },
        });

        // 6. Delete subservices
        await tx.subservice.deleteMany({
          where: { serviceId },
        });

        // 7. Delete the service
        await tx.service.delete({
          where: { id: serviceId },
        });

        // 8. Create audit log
        await tx.auditLog.create({
          data: {
            user: { connect: { id: req.user.id } },
            action: "SERVICE_FORCE_DELETED",
            entityType: "SERVICE",
            entityId: serviceId,
            metadataJson: JSON.stringify({
              details: `Force deleted service "${service.name}" with ${subserviceCount} subservices, ${serviceRequestCount} service requests, ${workOrderCount} work orders`,
            }),
          },
        });
      });

      return res.json({
        message: "Service and all dependencies deleted successfully",
        deleted: {
          service: service.name,
          subservices: subserviceCount,
          serviceRequests: serviceRequestCount,
          workOrders: workOrderCount,
        },
      });
    }

    // Normal delete (no dependencies)
    await prisma.service.delete({
      where: { id: serviceId },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "SERVICE_DELETED",
        entityType: "SERVICE",
        entityId: serviceId,
        metadataJson: JSON.stringify({
          details: `Deleted service "${service.name}"`,
        }),
      },
    });

    return res.json({ message: "Service deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// Activate Category
export const activateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: true },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "CATEGORY_ACTIVATED",
        entityType: "CATEGORY",
        entityId: category.id,
      },
    });

    return res.json({
      message: "Category activated successfully",
      category,
    });
  } catch (err) {
    next(err);
  }
};

// Deactivate Category
export const deactivateCategory = async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        user: { connect: { id: req.user.id } },
        action: "CATEGORY_DEACTIVATED",
        entityType: "CATEGORY",
        entityId: category.id,
      },
    });

    return res.json({
      message: "Category deactivated successfully",
      category,
    });
  } catch (err) {
    next(err);
  }
};
