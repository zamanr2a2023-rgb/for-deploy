/** @format */

// src/controllers/review.controller.js
import { prisma } from "../prisma.js";

// Customer creates review for completed work order
export const createReview = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { woId, rating, comment } = req.body;

    // Log request data for debugging
    console.log("Review request body:", req.body);
    console.log("woId received:", woId, "type:", typeof woId);

    if (!woId || !rating) {
      return res.status(400).json({
        message: "woId and rating are required",
        received: { woId, rating },
      });
    }

    // Validate woId is a valid number
    const parsedWoId = Number(woId);
    if (isNaN(parsedWoId) || parsedWoId <= 0) {
      return res.status(400).json({
        message: "Invalid woId - must be a positive number",
        received: woId,
        parsed: parsedWoId,
      });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: parsedWoId },
    });

    const existingReview = await prisma.review.findUnique({
      where: { woId: parsedWoId },
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (wo.customerId !== customerId) {
      return res.status(403).json({ message: "Not your work order" });
    }

    if (wo.status !== "PAID_VERIFIED") {
      return res
        .status(400)
        .json({ message: "Can only review completed and paid work orders" });
    }

    if (existingReview) {
      return res.status(400).json({ message: "Work order already reviewed" });
    }

    const review = await prisma.review.create({
      data: {
        woId: parsedWoId,
        customerId,
        technicianId: wo.technicianId,
        rating: Number(rating),
        comment,
      },
      include: {
        workOrder: {
          select: { woNumber: true },
        },
        technician: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

// Get all reviews for a technician
export const getTechnicianReviews = async (req, res, next) => {
  try {
    const { technicianId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { technicianId: Number(technicianId) },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        workOrder: {
          select: { woNumber: true, completedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const avgRating = await prisma.review.aggregate({
      where: { technicianId: Number(technicianId) },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return res.json({
      reviews,
      averageRating: avgRating._avg.rating || 0,
      totalReviews: avgRating._count.rating,
    });
  } catch (err) {
    next(err);
  }
};

// Get review for a specific work order
export const getWOReview = async (req, res, next) => {
  try {
    const { woId } = req.params;

    const review = await prisma.review.findUnique({
      where: { woId: Number(woId) },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        technician: {
          select: { id: true, name: true },
        },
      },
    });

    if (!review) {
      return res
        .status(404)
        .json({ message: "No review found for this work order" });
    }

    return res.json(review);
  } catch (err) {
    next(err);
  }
};
