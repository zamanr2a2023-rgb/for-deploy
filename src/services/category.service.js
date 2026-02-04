/** @format */

// src/services/category.service.js
import { prisma } from "../prisma.js";

// ✅ List all categories with subservices and services
export const findAllCategories = async () => {
  const categories = await prisma.category.findMany({
    include: {
      subservices: {
        include: {
          services: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories;
};

// ✅ Create category (Admin only)
export const createNewCategory = async (categoryData, adminId) => {
  const { name, description } = categoryData;

  const category = await prisma.category.create({
    data: {
      name,
      description: description || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "CATEGORY_CREATED",
      entityType: "CATEGORY",
      entityId: category.id,
    },
  });

  return category;
};

// ✅ Update category (Admin only)
export const updateCategoryById = async (categoryId, updates, adminId) => {
  const { name, description } = updates;

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name,
      description,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "CATEGORY_UPDATED",
      entityType: "CATEGORY",
      entityId: category.id,
    },
  });

  return category;
};

// ✅ Delete category (Admin only)
export const deleteCategoryById = async (categoryId, adminId) => {
  await prisma.category.delete({
    where: { id: categoryId },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "CATEGORY_DELETED",
      entityType: "CATEGORY",
      entityId: categoryId,
    },
  });

  return { message: "Category deleted successfully" };
};

// ✅ Create subservice (Admin only)
export const createNewSubservice = async (subserviceData, adminId) => {
  const { categoryId, name, description } = subserviceData;

  const subservice = await prisma.subservice.create({
    data: {
      categoryId: Number(categoryId),
      name,
      description: description || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SUBSERVICE_CREATED",
      entityType: "SUBSERVICE",
      entityId: subservice.id,
    },
  });

  return subservice;
};

// ✅ Update subservice (Admin only)
export const updateSubserviceById = async (subserviceId, updates, adminId) => {
  const { name, description } = updates;

  const subservice = await prisma.subservice.update({
    where: { id: subserviceId },
    data: {
      name,
      description,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SUBSERVICE_UPDATED",
      entityType: "SUBSERVICE",
      entityId: subservice.id,
    },
  });

  return subservice;
};

// ✅ Delete subservice (Admin only)
export const deleteSubserviceById = async (subserviceId, adminId) => {
  await prisma.subservice.delete({
    where: { id: subserviceId },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SUBSERVICE_DELETED",
      entityType: "SUBSERVICE",
      entityId: subserviceId,
    },
  });

  return { message: "Subservice deleted successfully" };
};

// ✅ Create service (Admin only)
export const createNewService = async (serviceData, adminId) => {
  const { categoryId, subserviceId, name, description } = serviceData;

  const service = await prisma.service.create({
    data: {
      categoryId: Number(categoryId),
      subserviceId: Number(subserviceId),
      name,
      description: description || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SERVICE_CREATED",
      entityType: "SERVICE",
      entityId: service.id,
    },
  });

  return service;
};

// ✅ Update service (Admin only)
export const updateServiceById = async (serviceId, updates, adminId) => {
  const { name, description } = updates;

  const service = await prisma.service.update({
    where: { id: serviceId },
    data: {
      name,
      description,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SERVICE_UPDATED",
      entityType: "SERVICE",
      entityId: service.id,
    },
  });

  return service;
};

// ✅ Delete service (Admin only)
export const deleteServiceById = async (serviceId, adminId) => {
  await prisma.service.delete({
    where: { id: serviceId },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "SERVICE_DELETED",
      entityType: "SERVICE",
      entityId: serviceId,
    },
  });

  return { message: "Service deleted successfully" };
};
