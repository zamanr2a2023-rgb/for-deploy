/** @format */

// src/services/auth.service.js
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { signToken } from "../utils/jwt.js";
import { normalizePhoneForDB } from "../utils/phone.js";

// ✅ Set password after OTP verification (new registration/password reset flow)
export const setPasswordAfterOTP = async (userData) => {
  const { phone, password, name, email, tempToken, role } = userData;

  // Normalize phone number
  const normalizedPhone = normalizePhoneForDB(phone);

  // Verify temporary token - get the LATEST matching OTP record
  const otpRecord = await prisma.oTP.findFirst({
    where: {
      phone: normalizedPhone,
      tempToken,
      tempTokenExpiry: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    throw new Error("Invalid or expired temporary token");
  }

  console.log(`🔍 Found OTP record:`, {
    id: otpRecord.id,
    phone: otpRecord.phone,
    type: otpRecord.type,
    metadataJson: otpRecord.metadataJson,
    createdAt: otpRecord.createdAt,
  });

  // Get name and role from OTP metadata if not provided (from Step 1)
  let finalName = name;
  let finalRole = role;

  console.log(`📋 Request params - name: ${name}, role: ${role}`);

  if (otpRecord.metadataJson) {
    try {
      const metadata = JSON.parse(otpRecord.metadataJson);
      console.log(`📋 Parsed metadata from OTP:`, metadata);

      // Use metadata values if not explicitly provided in the request
      if (!finalName) finalName = metadata.name;
      if (!finalRole) finalRole = metadata.role;

      console.log(
        `📋 After metadata check - finalName: ${finalName}, finalRole: ${finalRole}`
      );
    } catch (e) {
      console.log("❌ Could not parse OTP metadata:", e);
    }
  } else {
    console.log(
      `⚠️  WARNING: OTP record has NO metadata! metadataJson is null/empty`
    );
    console.log(`⚠️  This means role was not stored in Step 1 (Send OTP)`);
  }

  console.log(`📋 Final name: ${finalName}`);
  console.log(`📋 Final role: ${finalRole}`);

  // If finalRole is still undefined/null after checking metadata, log warning
  if (!finalRole) {
    console.log(`⚠️  WARNING: No role found! Will default to TECH_FREELANCER`);
  }

  const existing = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  // If user exists and has a password, they're already registered
  if (existing && existing.passwordHash && existing.passwordHash !== "") {
    throw new Error("Phone already registered");
  }

  const hash = await bcrypt.hash(password, 10);
  const userRole = finalRole || "TECH_FREELANCER"; // Use role from OTP metadata or parameter, default to freelancer

  console.log(`👤 Creating/updating user with role: ${userRole}`);

  let user;

  // If guest user exists (no password or empty password), upgrade them to registered user with new role
  if (existing && (!existing.passwordHash || existing.passwordHash === "")) {
    console.log(
      `👤 Existing user found - ID: ${existing.id}, Current role: ${existing.role}`
    );
    console.log(`👤 Updating to new role: ${userRole}`);

    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        phone: normalizedPhone,
        passwordHash: hash,
        name: finalName || existing.name,
        email: email || existing.email,
        role: userRole, // UPDATE THE ROLE from metadata
        registrationSource:
          userRole === "CUSTOMER" ? "SELF_REGISTERED" : "ADMIN",
      },
    });

    console.log(`✅ User upgraded - ID: ${user.id}, New role: ${user.role}`);
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        passwordHash: hash,
        name: finalName || null,
        email: email || null,
        role: userRole,
        registrationSource:
          userRole === "CUSTOMER" ? "SELF_REGISTERED" : "ADMIN",
      },
    });

    console.log(`👤 New user registered: ${phone} as ${userRole}`);
  }

  // Create technician profile for freelancers
  if (user.role === "TECH_FREELANCER" || user.role === "TECH_INTERNAL") {
    const existingProfile = await prisma.technicianProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      const techType =
        user.role === "TECH_FREELANCER" ? "FREELANCER" : "INTERNAL";
      const defaults =
        await import("./defaultRates.service.js").then((m) =>
          m.getDefaultRatesForNewTechnician(techType)
        );
      await prisma.technicianProfile.create({
        data: {
          userId: user.id,
          type: techType,
          commissionRate: defaults.commissionRate,
          bonusRate: defaults.bonusRate,
          useCustomRate: false,
          baseSalary:
            user.role === "TECH_INTERNAL" ? defaults.baseSalary : null,
          status: "ACTIVE",
        },
      });

      // Create wallet for freelancers
      if (user.role === "TECH_FREELANCER") {
        await prisma.wallet.create({
          data: {
            technicianId: user.id,
            balance: 0,
          },
        });
      }

      console.log(`✅ Created technician profile for user ${user.id}`);
    }
  }

  // Clear temp token
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { tempToken: null, tempTokenExpiry: null },
  });

  const token = signToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
    message: "Account created successfully! Welcome to FSM.",
  };
};
export const registerUser = async (userData) => {
  const { phone, password, name, email, role, otp, tempToken } = userData;

  // Normalize phone number
  const normalizedPhone = normalizePhoneForDB(phone);

  // If tempToken provided, use new flow (OTP already verified)
  if (tempToken) {
    // Verify temp token
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        tempToken,
        tempTokenExpiry: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new Error(
        "Invalid or expired temporary token. Please verify OTP again."
      );
    }

    // Clear temp token
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { tempToken: null, tempTokenExpiry: null },
    });

    // Proceed with registration using tempToken flow
    const existing = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    // If user exists and has a password, they're already registered
    if (existing && existing.passwordHash && existing.passwordHash !== "") {
      throw new Error("Phone already registered");
    }

    const hash = await bcrypt.hash(password, 10);
    let user;

    // If guest user exists (no password), upgrade them to registered user
    if (existing && (!existing.passwordHash || existing.passwordHash === "")) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          phone: normalizedPhone,
          passwordHash: hash,
          name: name || existing.name,
          email: email || existing.email,
          role: role || "CUSTOMER",
        },
      });

      console.log(`👤 Guest user upgraded to registered: ${normalizedPhone}`);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          passwordHash: hash,
          name: name || null,
          email: email || null,
          role: role || "CUSTOMER",
        },
      });

      console.log(`👤 New user registered: ${normalizedPhone}`);
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      message: "Registration successful",
    };
  }

  // Legacy flow: If OTP code provided directly
  if (otp) {
    const existing = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    // If user exists and has a password, they're already registered
    if (existing && existing.passwordHash && existing.passwordHash !== "") {
      throw new Error("Phone already registered");
    }

    // Verify OTP before registration
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        code: otp,
        type: "REGISTRATION",
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      throw new Error("Invalid or expired OTP");
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    const hash = await bcrypt.hash(password, 10);
    let user;

    // If guest user exists (no password), upgrade them to registered user
    if (existing && (!existing.passwordHash || existing.passwordHash === "")) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          phone: normalizedPhone,
          passwordHash: hash,
          name: name || existing.name,
          email: email || existing.email,
          role: role || "CUSTOMER",
        },
      });

      console.log(`👤 Guest user upgraded to registered: ${normalizedPhone}`);
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          passwordHash: hash,
          name: name || null,
          email: email || null,
          role: role || "CUSTOMER",
        },
      });

      console.log(`👤 New user registered: ${normalizedPhone}`);
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      message: "Registration successful",
    };
  }

  // Neither tempToken nor OTP provided
  throw new Error("OTP verification is required before registration");
};

// ✅ Login existing user (phone + password only)
export const loginUser = async (credentials) => {
  const { phone, password, fcmToken, deviceType, deviceName, deviceId } =
    credentials;

  // Normalize phone number
  const normalizedPhone = normalizePhoneForDB(phone);

  console.log(
    `🔐 Login attempt - Original: ${phone}, Normalized: ${normalizedPhone}`
  );

  // Find user by normalized phone first
  let user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  });

  // If not found, try with original phone (without normalization)
  if (!user) {
    console.log(`🔍 User not found with normalized phone, trying original...`);
    user = await prisma.user.findUnique({
      where: { phone: phone },
    });
  }

  // If still not found, try with leading zero removed
  if (!user && phone.startsWith("0")) {
    const withoutLeadingZero = phone.substring(1);
    console.log(`🔍 Trying without leading zero: ${withoutLeadingZero}`);
    user = await prisma.user.findUnique({
      where: { phone: withoutLeadingZero },
    });
  }

  // If still not found, try with leading zero added
  if (!user && !phone.startsWith("0")) {
    const withLeadingZero = "0" + phone;
    console.log(`🔍 Trying with leading zero: ${withLeadingZero}`);
    user = await prisma.user.findUnique({
      where: { phone: withLeadingZero },
    });
  }

  if (!user) {
    console.log(`❌ User not found for any phone format`);
    throw new Error("User not found");
  }

  console.log(
    `✅ User found: ${user.name} (ID: ${user.id}, Phone in DB: ${user.phone})`
  );

  if (user.isBlocked) {
    throw new Error(
      `Your account has been blocked. Reason: ${
        user.blockedReason || "No reason provided"
      }`
    );
  }

  // Verify password
  if (!user.passwordHash) {
    throw new Error(
      "Password not set for this account. Please complete registration."
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  // Generate JWT token
  const token = signToken({
    id: user.id,
    role: user.role,
    phone: user.phone,
  });

  // Save FCM token if provided
  if (fcmToken) {
    console.log(`📱 FCM Token received during login:`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   User Name: ${user.name}`);
    console.log(`   User Phone: ${user.phone}`);
    console.log(`   FCM Token: ${fcmToken}`);
    console.log(`   Device Type: ${deviceType || null}`);
    console.log(`   Device Name: ${deviceName || null}`);
    console.log(`   Device ID: ${deviceId || null}`);

    try {
      // Delete all previous FCM tokens for this user
      const deletedTokens = await prisma.fCMToken.deleteMany({
        where: {
          userId: user.id,
          token: { not: fcmToken }, // Don't delete the current token if it exists
        },
      });

      if (deletedTokens.count > 0) {
        console.log(
          `🗑️  Deleted ${deletedTokens.count} previous FCM token(s) for user ${user.id}`
        );
      }

      // Check if this FCM token already exists
      const existingToken = await prisma.fCMToken.findUnique({
        where: { token: fcmToken },
      });

      if (existingToken) {
        // Update existing token to point to current user and mark as active
        await prisma.fCMToken.update({
          where: { token: fcmToken },
          data: {
            userId: user.id,
            deviceType: deviceType || existingToken.deviceType,
            deviceName: deviceName || existingToken.deviceName,
            deviceId: deviceId || existingToken.deviceId,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });
        console.log(`✅ FCM Token updated in database for user ${user.id}`);
      } else {
        // Create new FCM token record
        await prisma.fCMToken.create({
          data: {
            userId: user.id,
            token: fcmToken,
            deviceType: deviceType || null,
            deviceName: deviceName || null,
            deviceId: deviceId || null,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });
        console.log(`✅ FCM Token saved to database for user ${user.id}`);
      }
    } catch (fcmError) {
      console.error(`❌ Error saving FCM token:`, fcmError.message);
      // Don't throw error - login should still succeed even if FCM save fails
    }
  } else {
    console.log(`📱 FCM Token during login:`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   User Name: ${user.name}`);
    console.log(`   User Phone: ${user.phone}`);
    console.log(`   FCM Token: null`);
    console.log(`   Device Type: null`);
    console.log(`   Device Name: null`);
    console.log(`   Device ID: null`);
  }

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
  };
};

// ✅ Change user password
export const changeUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.passwordHash) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid old password");
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

  return { message: "Password changed successfully" };
};

// ✅ Logout user
export const logoutUser = async (userId) => {
  // Create audit log for logout action
  await prisma.auditLog.create({
    data: {
      userId,
      action: "USER_LOGOUT",
      entityType: "USER",
      entityId: userId,
    },
  });

  return { success: true };
};

// ✅ Get user profile
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      isBlocked: true,
      blockedReason: true,
      homeAddress: true,
      latitude: true,
      longitude: true,
      lastLatitude: true,
      lastLongitude: true,
      locationStatus: true,
      locationUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
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
          photoUrl: true,
          idCardUrl: true,
          residencePermitUrl: true,
          residencePermitFrom: true,
          residencePermitTo: true,
          degreesUrl: true,
          department: true,
          joinDate: true,
          position: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
          mobileBankingType: true,
          mobileBankingNumber: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If customer, add statistics
  if (user.role === "CUSTOMER") {
    // Get total COMPLETED bookings count (SRs that have at least one PAID_VERIFIED work order)
    const completedSRs = await prisma.serviceRequest.findMany({
      where: {
        customerId: userId,
        workOrders: {
          some: {
            status: "PAID_VERIFIED",
          },
        },
      },
      select: {
        id: true,
      },
    });

    const totalBookings = completedSRs.length;

    // Get total spent (sum of all verified payments for this customer)
    const payments = await prisma.payment.aggregate({
      where: {
        workOrder: {
          customerId: userId,
        },
        status: "VERIFIED",
      },
      _sum: {
        amount: true,
      },
    });

    const totalSpent = payments._sum.amount || 0;

    // Business hours (default company hours - can be made configurable later)
    const businessHours = {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 6:00 PM",
      saturday: "10:00 AM - 4:00 PM",
      sunday: "Closed",
    };

    return {
      ...user,
      totalBookings,
      totalSpent,
      businessHours,
    };
  }

  // If technician, parse specialization and degrees
  if (
    (user.role === "TECH_INTERNAL" || user.role === "TECH_FREELANCER") &&
    user.technicianProfile
  ) {
    // Parse specialization from string to array
    let skills = [];
    if (user.technicianProfile.specialization) {
      try {
        skills =
          typeof user.technicianProfile.specialization === "string"
            ? JSON.parse(user.technicianProfile.specialization)
            : user.technicianProfile.specialization;
      } catch {
        skills = user.technicianProfile.specialization
          .split(",")
          .map((s) => s.trim());
      }
    }

    // Parse degrees/certifications from JSON
    let certifications = [];
    if (user.technicianProfile.degreesUrl) {
      try {
        certifications =
          typeof user.technicianProfile.degreesUrl === "string"
            ? JSON.parse(user.technicianProfile.degreesUrl)
            : user.technicianProfile.degreesUrl;
      } catch {
        certifications = [];
      }
    }

    // Calculate response time (average time to accept jobs)
    const acceptedJobs = await prisma.workOrder.findMany({
      where: {
        technicianId: userId,
        status: {
          in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "PAID_VERIFIED"],
        },
        acceptedAt: { not: null },
      },
      select: {
        createdAt: true,
        acceptedAt: true,
      },
      take: 20, // Last 20 accepted jobs
    });

    let avgResponseMinutes = 0;
    if (acceptedJobs.length > 0) {
      const totalMinutes = acceptedJobs.reduce((sum, job) => {
        const diffMs = new Date(job.acceptedAt) - new Date(job.createdAt);
        const minutes = Math.abs(diffMs / 1000 / 60); // Use absolute value to handle any timing issues
        return sum + minutes;
      }, 0);
      avgResponseMinutes = Math.round(totalMinutes / acceptedJobs.length);
    }

    // Calculate current week bonus
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekBonus = await prisma.commission.aggregate({
      where: {
        technicianId: userId,
        createdAt: { gte: startOfWeek },
        status: { in: ["BOOKED", "PAID_OUT"] },
      },
      _sum: { amount: true },
    });

    const profile = user.technicianProfile;
    const isFreelancer = user.role === "TECH_FREELANCER";

    // Get system config for display (systemDefault* fields)
    const systemConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    // Effective rates: when useCustomRate is true use profile; when false use current default (RateStructure → SystemConfig → 0.05)
    const {
      getDefaultCommissionRate,
      getDefaultBonusRate,
    } = await import("./defaultRates.service.js");

    let effectiveCommissionRate;
    let commissionRateUpdatedAt;
    if (profile.useCustomRate && profile.commissionRate != null) {
      effectiveCommissionRate = profile.commissionRate;
      commissionRateUpdatedAt = profile.updatedAt;
    } else {
      effectiveCommissionRate = await getDefaultCommissionRate();
      commissionRateUpdatedAt = systemConfig?.updatedAt ?? null;
    }

    let effectiveBonusRate;
    let bonusRateUpdatedAt;
    if (profile.useCustomRate && profile.bonusRate != null) {
      effectiveBonusRate = profile.bonusRate;
      bonusRateUpdatedAt = profile.updatedAt;
    } else {
      effectiveBonusRate = await getDefaultBonusRate();
      bonusRateUpdatedAt = systemConfig?.updatedAt ?? null;
    }

    const bonusRate = isFreelancer
      ? effectiveCommissionRate
      : effectiveBonusRate;
    const rateUpdatedAt = isFreelancer
      ? commissionRateUpdatedAt
      : bonusRateUpdatedAt;

    // Get priority distribution (what priority levels they handle)
    const priorityCounts = await prisma.workOrder.groupBy({
      by: ["priority"],
      where: {
        technicianId: userId,
        status: { not: "CANCELLED" },
      },
      _count: { priority: true },
    });

    const priorityStats = {
      low:
        priorityCounts.find((p) => p.priority === "LOW")?._count.priority || 0,
      medium:
        priorityCounts.find((p) => p.priority === "MEDIUM")?._count.priority ||
        0,
      high:
        priorityCounts.find((p) => p.priority === "HIGH")?._count.priority || 0,
    };

    const totalJobs =
      priorityStats.low + priorityStats.medium + priorityStats.high;
    const priorityPercentages = {
      low:
        totalJobs > 0 ? Math.round((priorityStats.low / totalJobs) * 100) : 0,
      medium:
        totalJobs > 0
          ? Math.round((priorityStats.medium / totalJobs) * 100)
          : 0,
      high:
        totalJobs > 0 ? Math.round((priorityStats.high / totalJobs) * 100) : 0,
    };

    // Current system defaults (RateStructure → SystemConfig) for comparison when useCustomRate is true
    const systemDefaultCommission =
      systemConfig?.freelancerCommissionRate ?? 0.05;
    const systemDefaultBonus = systemConfig?.internalEmployeeBonusRate ?? 0.05;

    return {
      ...user,
      technicianProfile: {
        ...user.technicianProfile,
        // Show effective rate (when useCustomRate false = current default from RateStructure/SystemConfig)
        commissionRate: effectiveCommissionRate,
        bonusRate: effectiveBonusRate,
        systemDefaultCommissionRate: systemDefaultCommission,
        systemDefaultBonusRate: systemDefaultBonus,
        commissionRatePercentage: `${(effectiveCommissionRate * 100).toFixed(
          1
        )}%`,
        bonusRatePercentage: `${(effectiveBonusRate * 100).toFixed(1)}%`,
        systemDefaultCommissionPercentage: `${(systemDefaultCommission * 100).toFixed(1)}%`,
        systemDefaultBonusPercentage: `${(systemDefaultBonus * 100).toFixed(1)}%`,
        // Add updatedAt for rate changes
        rateUpdatedAt: rateUpdatedAt,
        skills, // Array of skills for UI
        certifications, // Array of certifications for UI
        // 15.1 Response Time
        responseTime: {
          minutes: avgResponseMinutes,
          formatted:
            avgResponseMinutes < 60
              ? `${avgResponseMinutes} min`
              : `${Math.floor(avgResponseMinutes / 60)}h ${
                  avgResponseMinutes % 60
                }m`,
          status:
            avgResponseMinutes <= 30
              ? "excellent"
              : avgResponseMinutes <= 60
              ? "good"
              : "average",
        },
        // 15.2 Bonus Information
        bonus: {
          thisWeek: weekBonus._sum.amount || 0,
          rate: bonusRate,
          ratePercentage: bonusRate * 100,
          type: isFreelancer ? "Commission" : "Bonus",
          updatedAt: rateUpdatedAt,
        },
        // 15.3 Priority Status Distribution
        priorityStatus: {
          counts: priorityStats,
          percentages: priorityPercentages,
          mostCommon:
            priorityStats.high >= priorityStats.medium &&
            priorityStats.high >= priorityStats.low
              ? "HIGH"
              : priorityStats.medium >= priorityStats.low
              ? "MEDIUM"
              : "LOW",
        },
      },
    };
  }

  return user;
};

// ✅ Update user profile
export const updateUserProfile = async (userId, updates) => {
  // If email is being updated, check if it's already in use
  if (updates.email) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: updates.email,
        NOT: { id: userId },
      },
    });

    if (existingEmail) {
      throw new Error("Email already in use");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};
