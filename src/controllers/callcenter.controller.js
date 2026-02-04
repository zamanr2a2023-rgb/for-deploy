/** @format */

// src/controllers/callcenter.controller.js
import { prisma } from "../prisma.js";
import bcrypt from "bcryptjs";
import { isValidPhone } from "../utils/phone.js";

// ✅ Create new customer (Call Center & Admin only)
export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, password, address, latitude, longitude } =
      req.body;

    // Validate required fields
    if (!phone || !name) {
      return res.status(400).json({ message: "Phone and name are required" });
    }

    // Validate phone format (exactly 8 digits starting with 2, 3, or 4)
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone format. Must be exactly 8 digits starting with 2, 3, or 4 (e.g., 22345678, 31234567, 45678901)",
      });
    }

    // Clean phone for storage (remove any formatting)
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, "");
    // Extract local number if it has country code
    const localPhone =
      cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if user already exists with cleaned phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          email ? { email } : { phone: "never-match" },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Customer already exists with this phone or email",
      });
    }

    // Validate GPS coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return res
          .status(400)
          .json({ message: "Invalid latitude or longitude values" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          message:
            "Latitude must be between -90 and 90, longitude between -180 and 180",
        });
      }
    }

    // Hash password if provided, otherwise use empty string
    const passwordHash = password ? await bcrypt.hash(password, 10) : "";

    // Create customer with cleaned phone number
    const customer = await prisma.user.create({
      data: {
        name,
        phone: localPhone, // Use cleaned local phone (8 digits only)
        email: email || null,
        passwordHash,
        role: "CUSTOMER",
        homeAddress: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        registrationSource: "CALL_CENTER",
        createdById: req.user.id,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        homeAddress: true,
        latitude: true,
        longitude: true,
        role: true,
        registrationSource: true,
        createdAt: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CUSTOMER_CREATED",
        entityType: "USER",
        entityId: customer.id,
        metadataJson: JSON.stringify({ createdBy: req.user.role }),
      },
    });

    return res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
};

// ✅ Get technician info for a work order (Call Center)
export const getWOTechnicianInfo = async (req, res, next) => {
  try {
    const woIdParam = req.params.woId;

    // Find WO by either numeric ID or woNumber
    const whereClause = isNaN(woIdParam)
      ? { woNumber: woIdParam }
      : { id: Number(woIdParam) };

    const wo = await prisma.workOrder.findUnique({
      where: whereClause,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            lastLatitude: true,
            lastLongitude: true,
            locationStatus: true,
            locationUpdatedAt: true,
            technicianProfile: {
              select: {
                type: true,
                specialization: true,
                status: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            homeAddress: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (!wo.technician) {
      return res.status(200).json({
        woNumber: wo.woNumber,
        status: wo.status,
        assigned: false,
        message: "No technician assigned yet",
      });
    }

    // Calculate distance if both WO and technician have GPS coordinates
    let distance = null;
    let estimatedArrivalMinutes = null;

    if (
      wo.latitude &&
      wo.longitude &&
      wo.technician.lastLatitude &&
      wo.technician.lastLongitude
    ) {
      const { calculateDistance } = await import("../utils/location.js");
      distance = calculateDistance(
        wo.latitude,
        wo.longitude,
        wo.technician.lastLatitude,
        wo.technician.lastLongitude,
      );

      // Estimate arrival time (assuming average speed of 30 km/h)
      estimatedArrivalMinutes = Math.ceil((distance / 30) * 60);
    }

    return res.json({
      woNumber: wo.woNumber,
      woId: wo.id,
      status: wo.status,
      address: wo.address,
      category: wo.category.name,
      assigned: true,
      technician: {
        id: wo.technician.id,
        name: wo.technician.name,
        phone: wo.technician.phone,
        email: wo.technician.email,
        type: wo.technician.technicianProfile?.type,
        specialization: wo.technician.technicianProfile?.specialization,
        status: wo.technician.technicianProfile?.status,
        locationStatus: wo.technician.locationStatus,
        lastLocationUpdate: wo.technician.locationUpdatedAt,
        currentLocation:
          wo.technician.lastLatitude && wo.technician.lastLongitude
            ? {
                latitude: wo.technician.lastLatitude,
                longitude: wo.technician.lastLongitude,
              }
            : null,
        distanceFromJob: distance ? `${distance.toFixed(2)} km` : null,
        estimatedArrival: estimatedArrivalMinutes
          ? `${estimatedArrivalMinutes} minutes`
          : null,
      },
      customer: wo.customer,
    });
  } catch (err) {
    next(err);
  }
};
