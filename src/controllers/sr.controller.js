/** @format */

// src/controllers/sr.controller.js
import { prisma } from "../prisma.js";
import { isValidPhone } from "../utils/phone.js";

const generateSRNumber = () => "SR-" + Date.now();

/**
 * Create Service Request
 *
 * GUEST HANDLING:
 * - Guests can create SRs without authentication (isGuest: true)
 * - Creates a User record with empty passwordHash for tracking
 * - Guest users CANNOT access: SR list, profile, notifications, rebook/book-again
 * - When guest registers later with same phone, their User record is upgraded
 * - isGuest flag differentiates guest SRs from authenticated SRs
 *
 * CALL CENTER FLOW:
 * 1. Search customer by phone (GET /api/srs/search-customer?phone=XXX)
 * 2. If exists: use customerId from search result
 * 3. If not exists: provide name, email to create new customer
 * 4. Create SR with scheduledAt and notes (optional)
 */
export const createSR = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      streetAddress,
      city,
      landmark,
      latitude,
      longitude,
      categoryId,
      subserviceId,
      serviceId,
      description,
      paymentType,
      priority,
      source,
      homeAddress,
      preferredDate,
      preferredTime,
      scheduledAt, // Call center can set scheduled appointment time
      notes, // Call center appointment notes
    } = req.body;

    // Validate required fields (serviceId is now required, subserviceId is optional)
    if (!phone || !address || !categoryId || !serviceId) {
      return res.status(400).json({
        message: "Phone, address, categoryId, and serviceId are required",
      });
    }

    // Validate phone format (exactly 8 digits starting with 2, 3, or 4)
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone format. Must be exactly 8 digits starting with 2, 3, or 4 (e.g., 22345678, 31234567, 45678901)",
      });
    }

    // Determine if user is authenticated
    const isAuthenticated = req.user && req.user.id;

    // For guest/web portal: Name is required
    if (!isAuthenticated && !name) {
      return res.status(400).json({
        message: "Name is required for service request creation",
      });
    }

    // For call center: Check if user exists by phone
    if (req.user?.role === "CALL_CENTER") {
      const existingUser = await prisma.user.findUnique({ where: { phone } });

      // If user doesn't exist, name and email are required
      if (!existingUser && (!name || !email)) {
        return res.status(400).json({
          message: "Name and email are required for new customer registration",
        });
      }
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

    // Validate paymentType
    const validPaymentTypes = ["CASH", "MOBILE_MONEY"];
    const finalPaymentType = paymentType || "CASH";
    if (!validPaymentTypes.includes(finalPaymentType)) {
      return res.status(400).json({
        message: `Invalid paymentType. Must be one of: ${validPaymentTypes.join(
          ", ",
        )}`,
      });
    }

    // Validate priority
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];
    const finalPriority = priority || "MEDIUM";
    if (!validPriorities.includes(finalPriority)) {
      return res.status(400).json({
        message: `Invalid priority. Must be one of: ${validPriorities.join(
          ", ",
        )}`,
      });
    }

    // Validate source
    const validSources = ["CUSTOMER_APP", "WEB_PORTAL", "CALL_CENTER"];
    if (source && !validSources.includes(source)) {
      return res.status(400).json({
        message: `Invalid source. Must be one of: ${validSources.join(", ")}`,
      });
    }

    // Verify category and service exist (hierarchy: Category → Service → Subservice)
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
    });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const service = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
    });
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Verify service belongs to the category
    if (service.categoryId !== Number(categoryId)) {
      return res
        .status(400)
        .json({ message: "Service does not belong to the specified category" });
    }

    // Verify subservice if provided
    if (subserviceId) {
      const subservice = await prisma.subservice.findUnique({
        where: { id: Number(subserviceId) },
      });
      if (!subservice) {
        return res.status(404).json({ message: "Subservice not found" });
      }
      // Verify subservice belongs to the service
      if (subservice.serviceId !== Number(serviceId)) {
        return res.status(400).json({
          message: "Subservice does not belong to the specified service",
        });
      }
    }

    let customerId = null;
    let createdById = null;
    let isGuest = true; // Default to guest
    let finalSource = source || "WEB_PORTAL";

    // Handle call center scheduledAt → preferredDate mapping
    let finalPreferredDate = preferredDate;
    let finalDescription = description;

    // Call center can provide scheduledAt instead of preferredDate
    if (
      isAuthenticated &&
      req.user.role === "CALL_CENTER" &&
      scheduledAt &&
      !preferredDate
    ) {
      finalPreferredDate = scheduledAt;
    }

    // Call center notes are appended to description
    if (isAuthenticated && req.user.role === "CALL_CENTER" && notes) {
      finalDescription = description
        ? `${description}\n\nCall Center Notes: ${notes}`
        : `Call Center Notes: ${notes}`;
    }

    // Handle Call Center SR creation
    if (isAuthenticated && req.user.role === "CALL_CENTER") {
      finalSource = "CALL_CENTER";
      createdById = req.user.id;

      // Check if customer exists by phone
      let customer = await prisma.user.findUnique({ where: { phone } });

      if (!customer) {
        // Create new customer with provided name and email
        customer = await prisma.user.create({
          data: {
            phone,
            name,
            email,
            passwordHash: "",
            role: "CUSTOMER",
            homeAddress: homeAddress || address,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            registrationSource: "CALL_CENTER",
            createdById: req.user.id,
          },
        });
      }

      customerId = customer.id;
      isGuest = false; // Call center creates for authenticated customers
    }
    // Handle authenticated customer SR creation
    else if (isAuthenticated && req.user.role === "CUSTOMER") {
      customerId = req.user.id;
      createdById = req.user.id;
      isGuest = false; // Authenticated customer
      finalSource = "CUSTOMER_APP";

      console.log(
        `✅ Authenticated customer ${req.user.phone} creating SR (isGuest: false)`,
      );
    }
    // Handle guest/web portal SR creation (no authentication)
    else {
      let guestUser = await prisma.user.findUnique({ where: { phone } });

      if (!guestUser) {
        // Create new guest user with provided name
        guestUser = await prisma.user.create({
          data: {
            phone,
            name,
            email,
            passwordHash: "",
            role: "CUSTOMER",
            registrationSource: "WEB_PORTAL",
          },
        });
        console.log(`👤 Created guest user: ${phone} (${name})`);
      } else {
        // Update existing guest user's name if provided and different
        if (name && guestUser.name !== name) {
          guestUser = await prisma.user.update({
            where: { phone },
            data: { name },
          });
          console.log(`👤 Updated guest user name: ${phone} → ${name}`);
        }
      }

      customerId = guestUser.id;
      isGuest = true; // Guest user from web portal
      finalSource = "WEB_PORTAL";
      createdById = null; // No authenticated creator

      console.log(
        `🌐 Guest user ${phone} (${guestUser.name}) creating SR (isGuest: true)`,
      );
    }

    const sr = await prisma.serviceRequest.create({
      data: {
        srNumber: generateSRNumber(),
        customerId,
        createdById,
        categoryId: Number(categoryId),
        serviceId: Number(serviceId), // Required after hierarchy fix
        subserviceId: subserviceId ? Number(subserviceId) : null, // Optional
        description: finalDescription,
        priority: finalPriority,
        address,
        streetAddress: streetAddress || null,
        city: city || null,
        landmark: landmark || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        paymentType: finalPaymentType,
        preferredDate: finalPreferredDate ? new Date(finalPreferredDate) : null,
        preferredTime: preferredTime || null,
        status: "NEW",
        source: finalSource,
        isGuest,
      },
      include: {
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Save address and GPS to customer (User) so homeAddress/location are persisted
    if (customerId) {
      const userUpdate = {};
      if (address) userUpdate.homeAddress = address;
      if (latitude != null && longitude != null) {
        userUpdate.latitude = parseFloat(latitude);
        userUpdate.longitude = parseFloat(longitude);
      }
      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: customerId },
          data: userUpdate,
        });
      }
    }

    // Return SR with status, srId, and isGuest properties
    const response = {
      ...sr,
      srId: sr.id, // Include srId property
      status: sr.status, // Explicitly include status
      isGuest: sr.isGuest, // Explicitly include guest status for clarity
      customerName: sr.customer?.name, // Customer name from the request
      preferredAppointmentDate: sr.preferredDate, // Customer's requested date
      preferredAppointmentTime: sr.preferredTime, // Customer's requested time
    };

    // Real-time notification for new service request
    const { notifyNewServiceRequest } =
      await import("../services/notification.service.js");
    await notifyNewServiceRequest(sr);

    return res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

export const listSR = async (req, res, next) => {
  try {
    const { status, priority, customerId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const where = {};

    // Customers can only see their own SRs
    if (userRole === "CUSTOMER") {
      where.customerId = userId;
    }

    // Apply filters only for dispatcher/admin/call center roles
    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (
      customerId &&
      ["DISPATCHER", "ADMIN", "CALL_CENTER"].includes(userRole)
    ) {
      where.customerId = Number(customerId);
    }

    const srs = await prisma.serviceRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            status: true,
            scheduledAt: true,
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
              },
            },
            review: {
              select: {
                id: true,
                rating: true,
                comment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the latest work order
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add WO status, srId, and scheduledAt to each SR
    const srsWithWOStatus = srs.map((sr) => {
      const latestWO =
        sr.workOrders && sr.workOrders.length > 0 ? sr.workOrders[0] : null;

      // Determine user-friendly status based on SR status and WO status
      let userStatus = sr.status;
      let readableStatus = "";

      if (sr.status === "NEW" || sr.status === "OPEN") {
        userStatus = "PENDING_APPROVAL";
        readableStatus = "Pending Approval";
      } else if (sr.status === "CONVERTED_TO_WO" && latestWO) {
        // Derive status from Work Order
        if (latestWO.status === "PAID_VERIFIED") {
          userStatus = "COMPLETED";
          readableStatus = "Completed";
        } else if (latestWO.status === "CANCELLED") {
          userStatus = "CANCELLED";
          readableStatus = "Cancelled";
        } else if (latestWO.status === "ASSIGNED") {
          userStatus = "ACTIVE";
          readableStatus = "Assigned to Technician";
        } else if (latestWO.status === "ACCEPTED") {
          userStatus = "ACTIVE";
          readableStatus = "Technician On The Way";
        } else if (latestWO.status === "IN_PROGRESS") {
          userStatus = "ACTIVE";
          readableStatus = "Work In Progress";
        } else if (latestWO.status === "COMPLETED_PENDING_PAYMENT") {
          userStatus = "ACTIVE";
          readableStatus = "Awaiting Payment";
        } else {
          userStatus = "ACTIVE";
          readableStatus = "Active";
        }
      } else if (sr.status === "CANCELLED") {
        userStatus = "CANCELLED";
        readableStatus = "Cancelled";
      } else if (sr.status === "REJECTED") {
        userStatus = "REJECTED";
        readableStatus = "Rejected";
      }

      // Calculate payment summary
      const paymentSummary =
        latestWO && latestWO.payments && latestWO.payments.length > 0
          ? {
              totalAmount: latestWO.payments.reduce(
                (sum, p) => sum + (p.amount || 0),
                0,
              ),
              paidAmount: latestWO.payments
                .filter((p) => p.status === "VERIFIED")
                .reduce((sum, p) => sum + (p.amount || 0), 0),
              paymentStatus: latestWO.payments.some(
                (p) => p.status === "VERIFIED",
              )
                ? "PAID"
                : "PENDING",
              paymentMethod: latestWO.payments[0]?.method || null,
            }
          : null;

      return {
        ...sr,
        srId: sr.id, // Add srId property for compatibility
        status: userStatus, // User-friendly status
        readableStatus: readableStatus, // Human-readable status description
        internalStatus: sr.status, // Keep original status for reference
        preferredAppointmentDate: sr.preferredDate, // Customer's requested date
        preferredAppointmentTime: sr.preferredTime, // Customer's requested time slot
        scheduledAt: latestWO ? latestWO.scheduledAt : sr.preferredDate || null, // Use WO scheduledAt or SR preferredDate
        woStatus: latestWO ? latestWO.status : null,
        assignedTechnician:
          latestWO && latestWO.technician
            ? {
                id: latestWO.technician.id,
                name: latestWO.technician.name,
                phone: latestWO.technician.phone,
              }
            : null,
        technicianRating:
          latestWO && latestWO.review ? latestWO.review.rating : null,
        paymentSummary,
        latestWO,
      };
    });

    return res.json(srsWithWOStatus);
  } catch (err) {
    next(err);
  }
};

// Get My SRs (Customer only - dedicated endpoint)
export const getMySRs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { customerId: userId };

    // Optional status filter (user-friendly status)
    if (status) {
      if (status === "PENDING_APPROVAL") {
        where.status = { in: ["NEW", "OPEN"] };
      } else if (status === "ACTIVE") {
        where.status = "CONVERTED_TO_WO";
      } else if (
        status === "COMPLETED" ||
        status === "CANCELLED" ||
        status === "REJECTED"
      ) {
        where.status = status;
      }
    }

    const srs = await prisma.serviceRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        workOrders: {
          select: {
            id: true,
            woNumber: true,
            status: true,
            scheduledAt: true,
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
              },
            },
            review: {
              select: {
                id: true,
                rating: true,
                comment: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to include readable status and all required fields
    const formattedSRs = srs.map((sr) => {
      const latestWO =
        sr.workOrders && sr.workOrders.length > 0 ? sr.workOrders[0] : null;

      let userStatus = sr.status;
      let readableStatus = "";

      if (sr.status === "NEW" || sr.status === "OPEN") {
        userStatus = "PENDING_APPROVAL";
        readableStatus = "Pending Approval";
      } else if (sr.status === "CONVERTED_TO_WO" && latestWO) {
        if (latestWO.status === "PAID_VERIFIED") {
          userStatus = "COMPLETED";
          readableStatus = "Completed";
        } else if (latestWO.status === "CANCELLED") {
          userStatus = "CANCELLED";
          readableStatus = "Cancelled";
        } else if (latestWO.status === "ASSIGNED") {
          userStatus = "ACTIVE";
          readableStatus = "Assigned to Technician";
        } else if (latestWO.status === "ACCEPTED") {
          userStatus = "ACTIVE";
          readableStatus = "Technician On The Way";
        } else if (latestWO.status === "IN_PROGRESS") {
          userStatus = "ACTIVE";
          readableStatus = "Work In Progress";
        } else if (latestWO.status === "COMPLETED_PENDING_PAYMENT") {
          userStatus = "ACTIVE";
          readableStatus = "Awaiting Payment";
        } else {
          userStatus = "ACTIVE";
          readableStatus = "Active";
        }
      } else if (sr.status === "CANCELLED") {
        userStatus = "CANCELLED";
        readableStatus = "Cancelled";
      } else if (sr.status === "REJECTED") {
        userStatus = "REJECTED";
        readableStatus = "Rejected";
      }

      const paymentSummary =
        latestWO && latestWO.payments && latestWO.payments.length > 0
          ? {
              totalAmount: latestWO.payments.reduce(
                (sum, p) => sum + (p.amount || 0),
                0,
              ),
              paidAmount: latestWO.payments
                .filter((p) => p.status === "VERIFIED")
                .reduce((sum, p) => sum + (p.amount || 0), 0),
              paymentStatus: latestWO.payments.some(
                (p) => p.status === "VERIFIED",
              )
                ? "PAID"
                : "PENDING",
            }
          : null;

      return {
        srId: sr.id,
        srNumber: sr.srNumber,
        status: userStatus,
        readableStatus: readableStatus,
        internalStatus: sr.status,
        description: sr.description,
        priority: sr.priority,
        address: sr.address,
        preferredAppointmentDate: sr.preferredDate,
        preferredAppointmentTime: sr.preferredTime,
        scheduledAt: latestWO ? latestWO.scheduledAt : sr.preferredDate || null,
        category: sr.category,
        subservice: sr.subservice,
        service: sr.service,
        assignedTechnician:
          latestWO && latestWO.technician ? latestWO.technician : null,
        technicianRating:
          latestWO && latestWO.review ? latestWO.review.rating : null,
        paymentSummary,
        createdAt: sr.createdAt,
        updatedAt: sr.updatedAt,
      };
    });

    return res.json(formattedSRs);
  } catch (err) {
    next(err);
  }
};

export const getSRById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Find SR by either numeric ID or srNumber
    const whereClause = isNaN(id) ? { srNumber: id } : { id: Number(id) };

    const sr = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        workOrders: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
                transactionRef: true,
                createdAt: true,
              },
            },
            review: {
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!sr) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    // Customers can only view their own SRs
    if (userRole === "CUSTOMER" && sr.customerId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Add user-friendly status and scheduledAt
    const latestWO =
      sr.workOrders && sr.workOrders.length > 0
        ? sr.workOrders.reduce((latest, wo) =>
            wo.createdAt > latest.createdAt ? wo : latest,
          )
        : null;

    // Determine user-friendly status
    let userStatus = sr.status;
    let readableStatus = "";

    if (sr.status === "NEW" || sr.status === "OPEN") {
      userStatus = "PENDING_APPROVAL";
      readableStatus = "Pending Approval";
    } else if (sr.status === "CONVERTED_TO_WO" && latestWO) {
      if (latestWO.status === "PAID_VERIFIED") {
        userStatus = "COMPLETED";
        readableStatus = "Completed";
      } else if (latestWO.status === "CANCELLED") {
        userStatus = "CANCELLED";
        readableStatus = "Cancelled";
      } else if (latestWO.status === "ASSIGNED") {
        userStatus = "ACTIVE";
        readableStatus = "Assigned to Technician";
      } else if (latestWO.status === "ACCEPTED") {
        userStatus = "ACTIVE";
        readableStatus = "Technician On The Way";
      } else if (latestWO.status === "IN_PROGRESS") {
        userStatus = "ACTIVE";
        readableStatus = "Work In Progress";
      } else if (latestWO.status === "COMPLETED_PENDING_PAYMENT") {
        userStatus = "ACTIVE";
        readableStatus = "Awaiting Payment";
      } else {
        userStatus = "ACTIVE";
        readableStatus = "Active";
      }
    } else if (sr.status === "CANCELLED") {
      userStatus = "CANCELLED";
      readableStatus = "Cancelled";
    } else if (sr.status === "REJECTED") {
      userStatus = "REJECTED";
      readableStatus = "Rejected";
    }

    // Calculate detailed payment summary
    const paymentSummary =
      latestWO && latestWO.payments && latestWO.payments.length > 0
        ? {
            totalAmount: latestWO.payments.reduce(
              (sum, p) => sum + (p.amount || 0),
              0,
            ),
            paidAmount: latestWO.payments
              .filter((p) => p.status === "VERIFIED")
              .reduce((sum, p) => sum + (p.amount || 0), 0),
            pendingAmount: latestWO.payments
              .filter((p) => p.status !== "VERIFIED")
              .reduce((sum, p) => sum + (p.amount || 0), 0),
            paymentStatus: latestWO.payments.some(
              (p) => p.status === "VERIFIED",
            )
              ? "PAID"
              : "PENDING",
            payments: latestWO.payments.map((p) => ({
              id: p.id,
              amount: p.amount,
              status: p.status,
              paymentMethod: p.method, // preserve API response key
              transactionId: p.transactionRef, // map underlying field to expected key
              createdAt: p.createdAt,
            })),
          }
        : null;

    const response = {
      ...sr,
      srId: sr.id,
      status: userStatus,
      readableStatus: readableStatus,
      internalStatus: sr.status,
      preferredAppointmentDate: sr.preferredDate, // Customer's requested date
      preferredAppointmentTime: sr.preferredTime, // Customer's requested time slot
      scheduledAt: latestWO ? latestWO.scheduledAt : sr.preferredDate || null,
      woStatus: latestWO ? latestWO.status : null,
      assignedTechnician:
        latestWO && latestWO.technician ? latestWO.technician : null,
      technicianRating:
        latestWO && latestWO.review
          ? {
              rating: latestWO.review.rating,
              comment: latestWO.review.comment,
              createdAt: latestWO.review.createdAt,
            }
          : null,
      paymentSummary,
    };

    return res.json(response);
  } catch (err) {
    next(err);
  }
};

export const cancelSR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, cancelReason } = req.body; // Accept both field names
    const userRole = req.user.role;
    const userId = req.user.id;

    // Use either 'reason' or 'cancelReason' for backwards compatibility
    const finalReason = reason || cancelReason;

    // Find SR by either numeric ID or srNumber
    const whereClause = isNaN(id) ? { srNumber: id } : { id: Number(id) };

    // Find the service request
    const sr = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: {
        workOrders: true,
      },
    });

    if (!sr) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    // Authorization: Customers can only cancel their own SRs
    if (userRole === "CUSTOMER" && sr.customerId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if already cancelled
    if (sr.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "Service Request is already cancelled" });
    }

    // Check if already converted to work order
    if (sr.status === "CONVERTED_TO_WO" || sr.workOrders.length > 0) {
      return res.status(400).json({
        message:
          "Cannot cancel Service Request that has been converted to Work Order. Please cancel the Work Order instead.",
      });
    }

    // Update service request status to CANCELLED
    const updatedSR = await prisma.serviceRequest.update({
      where: {
        id: sr.id, // Use the actual SR id from the found record
      },
      data: {
        status: "CANCELLED",
        description: finalReason
          ? `${
              sr.description || ""
            }\n\nCancellation Reason: ${finalReason}`.trim()
          : sr.description,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
      },
    });

    // Create audit log for cancellation
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "SR_CANCELLED",
        entityType: "SERVICE_REQUEST", // Changed from 'resource' to 'entityType'
        entityId: sr.id, // Changed from 'resourceId' to 'entityId'
        metadataJson: JSON.stringify({
          // Changed from 'details' to 'metadataJson'
          srNumber: sr.srNumber,
          cancelReason: finalReason || "No reason provided",
          cancelledBy: userRole,
        }),
      },
    });

    // Send cancellation notification
    const { notifySRCancelled } =
      await import("../services/notification.service.js");
    await notifySRCancelled(updatedSR, userRole);

    return res.json({
      message: "Service Request cancelled successfully",
      serviceRequest: {
        ...updatedSR,
        srId: updatedSR.id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const rejectSR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, rejectReason } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Only dispatcher, admin, or call center can reject SRs
    if (!["DISPATCHER", "ADMIN", "CALL_CENTER"].includes(userRole)) {
      return res.status(403).json({
        message:
          "Access denied. Only dispatchers, admins, or call center can reject service requests.",
      });
    }

    const finalReason = reason || rejectReason;

    if (!finalReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Find SR by either numeric ID or srNumber
    const whereClause = isNaN(id) ? { srNumber: id } : { id: Number(id) };

    const sr = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: {
        workOrders: true,
      },
    });

    if (!sr) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    // Check if already rejected or cancelled
    if (sr.status === "REJECTED") {
      return res
        .status(400)
        .json({ message: "Service Request is already rejected" });
    }

    if (sr.status === "CANCELLED") {
      return res
        .status(400)
        .json({ message: "Cannot reject a cancelled Service Request" });
    }

    // Check if already converted to work order
    if (sr.status === "CONVERTED_TO_WO" || sr.workOrders.length > 0) {
      return res.status(400).json({
        message:
          "Cannot reject Service Request that has been converted to Work Order",
      });
    }

    // Update service request status to REJECTED
    const updatedSR = await prisma.serviceRequest.update({
      where: {
        id: sr.id,
      },
      data: {
        status: "REJECTED",
        description: `${
          sr.description || ""
        }\n\nRejection Reason: ${finalReason}`.trim(),
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
      },
    });

    // Create audit log for rejection
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "SR_REJECTED",
        entityType: "SERVICE_REQUEST",
        entityId: sr.id,
        metadataJson: JSON.stringify({
          srNumber: sr.srNumber,
          rejectReason: finalReason,
          rejectedBy: userRole,
        }),
      },
    });

    // Notify customer about rejection
    const { createNotification } =
      await import("../services/notification.service.js");
    await createNotification({
      userId: sr.customerId,
      type: "SR_REJECTED",
      title: "Service Request Rejected",
      message: `Your service request ${sr.srNumber} has been rejected. Reason: ${finalReason}`,
      relatedId: sr.id,
      relatedType: "SERVICE_REQUEST",
    });

    return res.json({
      message: "Service Request rejected successfully",
      serviceRequest: {
        ...updatedSR,
        srId: updatedSR.id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const searchCustomer = async (req, res, next) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Validate phone format (exactly 8 digits starting with 2, 3, or 4)
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone format. Must be exactly 8 digits starting with 2, 3, or 4 (e.g., 22345678, 31234567, 45678901)",
      });
    }

    // Search for customer by phone
    const customer = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        homeAddress: true,
        latitude: true,
        longitude: true,
        role: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return res.json({
        exists: false,
        message: "Customer not found. New customer registration required.",
      });
    }

    // Only return if it's a customer role
    if (customer.role !== "CUSTOMER") {
      return res.json({
        exists: false,
        message: "User exists but is not a customer.",
      });
    }

    return res.json({
      exists: true,
      customer,
    });
  } catch (err) {
    next(err);
  }
};

// Rebook Service - Create new SR based on completed SR/WO
export const rebookService = async (req, res, next) => {
  try {
    const { srId } = req.params;
    const customerId = req.user.id;
    const { preferredDate, preferredTime, description, address } = req.body;

    // Find original SR
    const originalSR = await prisma.serviceRequest.findUnique({
      where: { id: Number(srId) },
      include: {
        workOrders: {
          where: { status: "PAID_VERIFIED" },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!originalSR) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    // Verify customer owns this SR
    if (originalSR.customerId !== customerId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Create new SR with same service details
    const newSR = await prisma.serviceRequest.create({
      data: {
        srNumber: generateSRNumber(),
        customerId,
        createdById: customerId,
        categoryId: originalSR.categoryId,
        subserviceId: originalSR.subserviceId,
        serviceId: originalSR.serviceId,
        description: description || originalSR.description,
        priority: originalSR.priority,
        address: address || originalSR.address,
        latitude: originalSR.latitude,
        longitude: originalSR.longitude,
        paymentType: originalSR.paymentType,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        preferredTime: preferredTime || null,
        status: "NEW",
        source: "CUSTOMER_APP",
        isGuest: false,
      },
      include: {
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Notify about new service request
    const { notifyNewServiceRequest } =
      await import("../services/notification.service.js");
    await notifyNewServiceRequest(newSR);

    return res.status(201).json({
      message: "Service rebooked successfully",
      sr: {
        ...newSR,
        srId: newSR.id,
        status: "PENDING_APPROVAL", // User-friendly status
        readableStatus: "Pending Approval",
      },
    });
  } catch (err) {
    next(err);
  }
};

// Book Again - Simplified version that copies SR exactly with no customization
export const bookAgain = async (req, res, next) => {
  try {
    const { srId } = req.params;
    const customerId = req.user.id;

    // Find original SR
    const originalSR = await prisma.serviceRequest.findUnique({
      where: { id: Number(srId) },
      include: {
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!originalSR) {
      return res.status(404).json({ message: "Service Request not found" });
    }

    // Verify customer owns this SR
    if (originalSR.customerId !== customerId) {
      return res
        .status(403)
        .json({ message: "Not authorized to book this service again" });
    }

    // Create new SR with same service details (reset status, dates, assignments)
    const newSR = await prisma.serviceRequest.create({
      data: {
        srNumber: generateSRNumber(),
        customerId,
        createdById: customerId,
        categoryId: originalSR.categoryId,
        subserviceId: originalSR.subserviceId,
        serviceId: originalSR.serviceId,
        description: originalSR.description,
        priority: originalSR.priority,
        address: originalSR.address,
        streetAddress: originalSR.streetAddress,
        city: originalSR.city,
        landmark: originalSR.landmark,
        latitude: originalSR.latitude,
        longitude: originalSR.longitude,
        paymentType: originalSR.paymentType,
        preferredDate: null, // Reset - customer will schedule later
        preferredTime: null, // Reset
        status: "NEW", // Reset to NEW
        source: "CUSTOMER_APP",
        isGuest: false,
      },
      include: {
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
        service: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Notify about new service request
    const { notifyNewServiceRequest } =
      await import("../services/notification.service.js");
    await notifyNewServiceRequest(newSR);

    return res.status(201).json({
      message: "Service booked again successfully",
      sr: {
        ...newSR,
        srId: newSR.id,
        status: "PENDING_APPROVAL", // User-friendly status
        readableStatus: "Pending Approval",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Recent Services for Customer Dashboard
 * Returns last 5 completed services with simplified data
 */
export const getRecentServices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const recentSRs = await prisma.serviceRequest.findMany({
      where: {
        customerId: userId,
        status: { in: ["COMPLETED", "CONVERTED_TO_WO"] },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        subservice: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        workOrders: {
          where: {
            status: "PAID_VERIFIED",
          },
          select: {
            completedAt: true,
          },
          orderBy: {
            completedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const formattedServices = recentSRs.map((sr) => ({
      id: sr.id,
      srNumber: sr.srNumber,
      serviceName: sr.subservice?.name || sr.service?.name || "Service",
      categoryName: sr.category?.name || "General Service",
      date: sr.workOrders[0]?.completedAt || sr.createdAt,
      isCompleted:
        sr.status === "COMPLETED" ||
        (sr.workOrders && sr.workOrders.length > 0),
    }));

    return res.json(formattedServices);
  } catch (err) {
    next(err);
  }
};
