/** @format */

// src/services/wo.service.js
import { prisma } from "../prisma.js";
import {
  notifyWOAssignment,
  notifyWOAccepted,
  notifyWOCompleted,
} from "./notification.service.js";
import { uploadImageToService } from "../utils/imageUpload.js";

const generateWONumber = () => "WO-" + Date.now();

// ✅ Dispatcher: Convert SR → WO
export const createWOFromSR = async (req, res, next) => {
  try {
    const srId = Number(req.params.srId);
    const { technicianId, scheduledAt, notes } = req.body;
    const dispatcherId = req.user.id;

    const sr = await prisma.serviceRequest.findUnique({
      where: { id: srId },
    });

    if (!sr) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    if (sr.status === "CONVERTED_TO_WO") {
      return res.status(400).json({ message: "SR already converted to WO" });
    }

    const wo = await prisma.workOrder.create({
      data: {
        woNumber: generateWONumber(),
        srId: sr.id,
        customerId: sr.customerId,
        technicianId: technicianId ? Number(technicianId) : null,
        dispatcherId,
        categoryId: sr.categoryId,
        subserviceId: sr.subserviceId,
        serviceId: sr.serviceId,
        address: sr.address,
        paymentType: sr.paymentType,
        priority: sr.priority,
        status: technicianId ? "ASSIGNED" : "UNASSIGNED",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || null,
      },
    });

    await prisma.serviceRequest.update({
      where: { id: sr.id },
      data: { status: "CONVERTED_TO_WO" },
    });

    await prisma.auditLog.create({
      data: {
        userId: dispatcherId,
        action: "WO_CREATED_FROM_SR",
        entityType: "WORK_ORDER",
        entityId: wo.id,
      },
    });

    // Send notification to technician if assigned
    if (technicianId) {
      await notifyWOAssignment(Number(technicianId), wo);
    }

    return res.status(201).json(wo);
  } catch (error) {
    next(error);
  }
};

// ✅ Dispatcher: Assign / Reassign technician to WO
export const assignWorkOrder = async (woId, technicianId, assignerId) => {
  const tech = await prisma.user.findUnique({
    where: { id: Number(technicianId) },
  });

  if (!tech) {
    throw new Error("Technician not found");
  }

  if (tech.isBlocked) {
    throw new Error("Technician is blocked");
  }

  const wo = await prisma.workOrder.update({
    where: { id: woId },
    data: {
      technicianId: Number(technicianId),
      status: "ASSIGNED",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: assignerId,
      action: "WO_ASSIGNED",
      entityType: "WORK_ORDER",
      entityId: wo.id,
      metadataJson: JSON.stringify({ technicianId }),
    },
  });

  // Send notification to technician
  await notifyWOAssignment(Number(technicianId), wo);

  return wo;
};

// ✅ Technician: Accept / Decline WO
export const respondToWorkOrder = async (woId, techId, action) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: woId },
  });

  if (!wo) {
    throw new Error("Work Order not found");
  }

  if (wo.technicianId !== techId) {
    throw new Error("This WO does not belong to you");
  }

  if (wo.status !== "ASSIGNED") {
    throw new Error("WO is not in ASSIGNED status");
  }

  let updated;

  if (action === "ACCEPT") {
    updated = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  } else if (action === "DECLINE") {
    updated = await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: "UNASSIGNED",
        technicianId: null,
      },
    });
  } else {
    throw new Error("Invalid action, use ACCEPT or DECLINE");
  }

  await prisma.auditLog.create({
    data: {
      userId: techId,
      action: "WO_RESPOND",
      entityType: "WORK_ORDER",
      entityId: wo.id,
      metadataJson: JSON.stringify({ action }),
    },
  });

  // Notify dispatcher if accepted
  if (action === "ACCEPT" && wo.dispatcherId) {
    await notifyWOAccepted(wo.dispatcherId, updated);
  }

  return updated;
};

// ✅ Technician: Start job (GPS check-in)
export const startWorkOrder = async (woId, techId, location) => {
  const { lat, lng } = location;

  const wo = await prisma.workOrder.findUnique({
    where: { id: woId },
  });

  if (!wo) {
    throw new Error("Work Order not found");
  }

  if (wo.technicianId !== techId) {
    throw new Error("This WO does not belong to you");
  }

  if (wo.status !== "ACCEPTED") {
    throw new Error("WO is not in ACCEPTED status");
  }

  await prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  await prisma.technicianCheckin.create({
    data: {
      woId,
      technicianId: techId,
      latitude: Number(lat),
      longitude: Number(lng),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: techId,
      action: "WO_START",
      entityType: "WORK_ORDER",
      entityId: wo.id,
    },
  });

  return { message: "Work started" };
};

// ✅ Technician: Complete job (Pending payment)
export const completeWorkOrder = async (
  woId,
  techId,
  completionData,
  files
) => {
  const { completionNotes, materialsUsed } = completionData;

  const wo = await prisma.workOrder.findUnique({
    where: { id: woId },
  });

  if (!wo) {
    throw new Error("Work Order not found");
  }

  if (wo.technicianId !== techId) {
    throw new Error("This WO does not belong to you");
  }

  if (wo.status !== "IN_PROGRESS") {
    throw new Error("WO is not in IN_PROGRESS status");
  }

  // Parse materialsUsed if it's a JSON string
  let parsedMaterials = null;
  if (materialsUsed) {
    try {
      parsedMaterials =
        typeof materialsUsed === "string"
          ? JSON.parse(materialsUsed)
          : materialsUsed;
    } catch (err) {
      throw new Error("Invalid materialsUsed format. Expected JSON array.");
    }
  }

  // Process uploaded files - Upload to external image service
  const photoUrls = [];
  if (files && files.length > 0) {
    for (const file of files) {
      try {
        // Upload to external image service (https://img.mtscorporate.com)
        const imageUrl = await uploadImageToService(file);
        photoUrls.push(imageUrl);
      } catch (error) {
        console.error("Failed to upload completion photo:", error);
        // Continue with other files even if one fails
      }
    }
  }

  const updated = await prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: "COMPLETED_PENDING_PAYMENT",
      completedAt: new Date(),
      completionNotes: completionNotes || null,
      completionPhotos: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
      materialsUsed: parsedMaterials ? JSON.stringify(parsedMaterials) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: techId,
      action: "WO_COMPLETE",
      entityType: "WORK_ORDER",
      entityId: wo.id,
    },
  });

  // Notify dispatcher
  if (wo.dispatcherId) {
    await notifyWOCompleted(wo.dispatcherId, updated);
  }

  return updated;
};
