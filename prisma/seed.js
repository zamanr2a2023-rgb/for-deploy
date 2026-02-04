/** @format */

// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create Admin User
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "1111111111" },
    update: {},
    create: {
      phone: "1111111111",
      name: "System Admin",
      email: "admin@fsm.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Created admin user:", admin.phone);
  console.log("Admin ID:", admin.id);

  // Create Dispatcher
  const dispatcherPassword = await bcrypt.hash("dispatcher123", 10);
  const dispatcher = await prisma.user.upsert({
    where: { phone: "2222222222" },
    update: {},
    create: {
      phone: "2222222222",
      name: "Main Dispatcher",
      email: "dispatcher@fsm.com",
      passwordHash: dispatcherPassword,
      role: "DISPATCHER",
    },
  });
  console.log("✅ Created dispatcher user:", dispatcher.phone);

  // Create Call Center Agent
  const callCenterPassword = await bcrypt.hash("callcenter123", 10);
  const callCenter = await prisma.user.upsert({
    where: { phone: "3333333333" },
    update: {},
    create: {
      phone: "3333333333",
      name: "Call Center Agent",
      email: "callcenter@fsm.com",
      passwordHash: callCenterPassword,
      role: "CALL_CENTER",
    },
  });
  console.log("✅ Created call center user:", callCenter.phone);

  // Create Internal Technician
  const techInternalPassword = await bcrypt.hash("tech123", 10);
  const techInternal = await prisma.user.upsert({
    where: { phone: "4444444444" },
    update: {},
    create: {
      phone: "4444444444",
      name: "John Technician",
      email: "tech.internal@fsm.com",
      passwordHash: techInternalPassword,
      role: "TECH_INTERNAL",
      lastLatitude: 23.8103, // Dhaka, Bangladesh - Mohakhali area
      lastLongitude: 90.4125,
      locationStatus: "ONLINE",
      locationUpdatedAt: new Date(),
      homeAddress: "456 Mohakhali C/A, Dhaka-1212, Bangladesh",
    },
  });

  await prisma.technicianProfile.upsert({
    where: { userId: techInternal.id },
    update: {},
    create: {
      userId: techInternal.id,
      type: "INTERNAL",
      commissionRate: 0.15, // 15% for internal technicians
      bonusRate: 0.05,
      baseSalary: 30000,
      specialization: "AC Repair, HVAC",
      status: "ACTIVE",
      department: "Field Services",
      joinDate: new Date("2022-03-15"),
      position: "HVAC Specialist",
      degreesUrl: JSON.stringify([
        {
          name: "HVAC Master Certification",
          url: "/uploads/cert-hvac-1.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "AC Repair Specialist",
          url: "/uploads/cert-hvac-2.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "Refrigeration License",
          url: "/uploads/cert-hvac-3.pdf",
          verifiedAt: new Date(),
        },
      ]),
    },
  });
  console.log("✅ Created internal technician:", techInternal.phone);

  // Create Freelancer Technician
  const techFreelancerPassword = await bcrypt.hash("freelancer123", 10);
  const techFreelancer = await prisma.user.upsert({
    where: { phone: "5555555555" },
    update: {},
    create: {
      phone: "5555555555",
      name: "Mike Freelancer",
      email: "tech.freelancer@fsm.com",
      passwordHash: techFreelancerPassword,
      role: "TECH_FREELANCER",
      lastLatitude: 23.7465, // Dhaka, Bangladesh - Dhanmondi area
      lastLongitude: 90.3763,
      locationStatus: "ONLINE",
      locationUpdatedAt: new Date(),
      homeAddress: "789 Dhanmondi Road 27, Dhaka-1209, Bangladesh",
    },
  });

  await prisma.technicianProfile.upsert({
    where: { userId: techFreelancer.id },
    update: {},
    create: {
      userId: techFreelancer.id,
      type: "FREELANCER",
      commissionRate: 0.4, // 40% for freelancers (higher than internal)
      bonusRate: 0.05,
      specialization: "Electrical, Plumbing",
      status: "ACTIVE",
      department: "Field Services",
      joinDate: new Date("2023-01-15"),
      position: "Senior Technician",
      degreesUrl: JSON.stringify([
        {
          name: "Electrical Engineering Diploma",
          url: "/uploads/cert-1.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "Plumbing License",
          url: "/uploads/cert-2.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "HVAC Certification",
          url: "/uploads/cert-3.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "Safety Training Certificate",
          url: "/uploads/cert-4.pdf",
          verifiedAt: new Date(),
        },
        {
          name: "Advanced Electrical Systems",
          url: "/uploads/cert-5.pdf",
          verifiedAt: new Date(),
        },
      ]),
    },
  });

  await prisma.wallet.upsert({
    where: { technicianId: techFreelancer.id },
    update: {},
    create: {
      technicianId: techFreelancer.id,
      balance: 0,
    },
  });
  console.log("✅ Created freelancer technician:", techFreelancer.phone);

  // Create Categories
  const hvac = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "HVAC Services",
      description: "Heating, Ventilation, and Air Conditioning",
      image: "https://example.com/images/hvac.jpg",
    },
  });

  const electrical = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Electrical Services",
      description: "All electrical repairs and installations",
      image: "https://example.com/images/electrical.jpg",
    },
  });

  const plumbing = await prisma.category.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Plumbing Services",
      description: "Plumbing repairs and installations",
      image: "https://example.com/images/plumbing.jpg",
    },
  });

  console.log("✅ Created categories");

  // Create Services (Category → Service - no baseRate)
  const hvacRepair = await prisma.service.upsert({
    where: { id: 1 },
    update: {},
    create: {
      categoryId: hvac.id,
      name: "AC Repair",
      description: "Air conditioner repair and maintenance",
    },
  });

  const hvacInstall = await prisma.service.upsert({
    where: { id: 2 },
    update: {},
    create: {
      categoryId: hvac.id,
      name: "AC Installation",
      description: "New air conditioner installation",
    },
  });

  const electricalRepair = await prisma.service.upsert({
    where: { id: 3 },
    update: {},
    create: {
      categoryId: electrical.id,
      name: "Electrical Repair",
      description: "General electrical repairs",
    },
  });

  const plumbingRepair = await prisma.service.upsert({
    where: { id: 4 },
    update: {},
    create: {
      categoryId: plumbing.id,
      name: "Plumbing Repair",
      description: "General plumbing repairs",
    },
  });

  console.log("✅ Created services");

  // Create Subservices (Service → Subservice with baseRate)
  const acNotCooling = await prisma.subservice.upsert({
    where: { id: 1 },
    update: {},
    create: {
      serviceId: hvacRepair.id,
      name: "AC Not Cooling",
      description: "Fix air conditioner cooling issues",
      baseRate: 500,
    },
  });

  const acFilterCleaning = await prisma.subservice.upsert({
    where: { id: 2 },
    update: {},
    create: {
      serviceId: hvacRepair.id,
      name: "AC Filter Cleaning",
      description: "Clean and replace AC filters",
      baseRate: 200,
    },
  });

  const splitAcInstall = await prisma.subservice.upsert({
    where: { id: 3 },
    update: {},
    create: {
      serviceId: hvacInstall.id,
      name: "Split AC Installation",
      description: "Install new split AC unit",
      baseRate: 2000,
    },
  });

  const electricalOutlet = await prisma.subservice.upsert({
    where: { id: 4 },
    update: {},
    create: {
      serviceId: electricalRepair.id,
      name: "Outlet Repair",
      description: "Fix electrical outlet issues",
      baseRate: 300,
    },
  });

  const plumbingLeak = await prisma.subservice.upsert({
    where: { id: 5 },
    update: {},
    create: {
      serviceId: plumbingRepair.id,
      name: "Pipe Leak Repair",
      description: "Fix leaking pipes",
      baseRate: 400,
    },
  });

  console.log("✅ Created subservices");

  // Create sample customer
  const customerPassword = await bcrypt.hash("customer123", 10);
  const customer = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: {
      phone: "9999999999",
      name: "Jane Customer",
      email: "customer@example.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
      latitude: 23.7808, // Dhaka, Bangladesh - Gulshan area
      longitude: 90.4106,
      homeAddress: "123 Gulshan Avenue, Dhaka-1212, Bangladesh",
    },
  });
  console.log("✅ Created sample customer:", customer.phone);

  // Create more customers for testing
  const customer2Password = await bcrypt.hash("customer123", 10);
  const customer2 = await prisma.user.upsert({
    where: { phone: "8888888888" },
    update: {
      passwordHash: customer2Password,
      name: "Robert Smith",
      email: "robert@example.com",
      role: "CUSTOMER",
      latitude: 23.7265, // Dhaka, Bangladesh - Mirpur area
      longitude: 90.3854,
      homeAddress: "789 Mirpur Road, Dhaka-1216, Bangladesh",
      isBlocked: true,
      blockedReason: "Multiple customer complaints",
      blockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      blockedById: admin.id,
    },
    create: {
      phone: "8888888888",
      name: "Robert Smith",
      email: "robert@example.com",
      passwordHash: customer2Password,
      role: "CUSTOMER",
      latitude: 23.7265, // Dhaka, Bangladesh - Mirpur area
      longitude: 90.3854,
      homeAddress: "789 Mirpur Road, Dhaka-1216, Bangladesh",
      isBlocked: true,
      blockedReason: "Multiple customer complaints",
      blockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      blockedById: admin.id,
    },
  });

  const customer3Password = await bcrypt.hash("customer123", 10);
  const customer3 = await prisma.user.upsert({
    where: { phone: "7777777777" },
    update: {},
    create: {
      phone: "7777777777",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      passwordHash: customer3Password,
      role: "CUSTOMER",
      latitude: 23.7515, // Dhaka, Bangladesh - Banani area
      longitude: 90.3996,
      homeAddress: "456 Banani Road 11, Dhaka-1213, Bangladesh",
    },
  });
  console.log("✅ Created additional customers");

  // Create more technicians
  const tech2Password = await bcrypt.hash("tech123", 10);
  const tech2 = await prisma.user.upsert({
    where: { phone: "6666666666" },
    update: {},
    create: {
      phone: "6666666666",
      name: "David Electrician",
      email: "david@fsm.com",
      passwordHash: tech2Password,
      role: "TECH_FREELANCER",
      lastLatitude: 23.8594, // Dhaka, Bangladesh - Uttara area
      lastLongitude: 90.3963,
      locationStatus: "ONLINE",
      locationUpdatedAt: new Date(),
      homeAddress: "321 Uttara Sector 7, Dhaka-1230, Bangladesh",
    },
  });

  await prisma.technicianProfile.upsert({
    where: { userId: tech2.id },
    update: {},
    create: {
      userId: tech2.id,
      type: "FREELANCER",
      commissionRate: 0.35,
      bonusRate: 0.05,
      specialization: "Electrical, AC Repair",
      status: "ACTIVE",
    },
  });

  await prisma.wallet.upsert({
    where: { technicianId: tech2.id },
    update: {},
    create: {
      technicianId: tech2.id,
      balance: 0, // Start with 0, will be updated with commission
    },
  });
  console.log("✅ Created additional technicians");

  // Create System Configuration
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      freelancerCommissionRate: 0.05, // Fixed 5% commission for freelancers
      internalEmployeeBonusRate: 0.05, // Fixed 5% bonus for internal employees
      internalEmployeeBaseSalary: 30000,
      nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      payoutFrequency: "WEEKLY",
    },
  });
  console.log("✅ Created system configuration");

  // Create Service Requests
  const sr1 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + Date.now(),
      customerId: customer.id,
      createdById: callCenter.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acNotCooling.id,
      description: "AC not cooling properly, making strange noise",
      priority: "HIGH",
      address: "123 Customer Lane, Nairobi",
      streetAddress: "123 Customer Lane",
      city: "Nairobi",
      landmark: "Near City Mall",
      latitude: -1.286389,
      longitude: 36.817223,
      paymentType: "MOBILE_MONEY",
      status: "CONVERTED_TO_WO",
      source: "CALL_CENTER",
      isGuest: false,
    },
  });

  const sr2 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 1),
      customerId: customer2.id,
      categoryId: electrical.id,
      serviceId: electricalRepair.id,
      description: "Power outlet not working in bedroom",
      priority: "MEDIUM",
      address: "789 Smith Road, Nairobi",
      streetAddress: "789 Smith Road",
      city: "Nairobi",
      latitude: -1.295,
      longitude: 36.82,
      paymentType: "CASH",
      status: "OPEN",
      source: "CUSTOMER_APP",
      isGuest: false,
    },
  });

  const sr3 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 2),
      customerId: customer3.id,
      categoryId: hvac.id,
      serviceId: hvacInstall.id,
      subserviceId: splitAcInstall.id,
      description: "Need new AC installation in living room",
      priority: "LOW",
      address: "456 Johnson Ave, Nairobi",
      streetAddress: "456 Johnson Ave",
      city: "Nairobi",
      latitude: -1.28,
      longitude: 36.815,
      paymentType: "MOBILE_MONEY",
      status: "NEW",
      source: "CUSTOMER_APP",
      isGuest: false,
    },
  });
  console.log("✅ Created service requests");

  // Create Work Orders
  const wo1 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + Date.now(),
      srId: sr1.id,
      customerId: customer.id,
      technicianId: techInternal.id,
      dispatcherId: dispatcher.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acNotCooling.id,
      address: sr1.address,
      latitude: sr1.latitude,
      longitude: sr1.longitude,
      estimatedDuration: 120,
      paymentType: sr1.paymentType,
      priority: sr1.priority,
      status: "PAID_VERIFIED",
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
      completedAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ),
      paidVerifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      notes: "Customer prefers morning appointment",
      completionNotes: "Replaced AC compressor, cleaned filters, refilled gas",
      materialsUsed: JSON.stringify([
        { item: "AC Compressor", qty: 1, cost: 3000 },
        { item: "Gas Refill", qty: 1, cost: 1500 },
      ]),
    },
  });

  const wo2CreatedAt = new Date(Date.now() - 25 * 60 * 1000); // Created 25 mins ago
  const wo2 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 1),
      srId: sr1.id,
      customerId: customer2.id,
      technicianId: techFreelancer.id,
      dispatcherId: dispatcher.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acFilterCleaning.id,
      address: "789 Smith Road, Nairobi",
      latitude: -1.295,
      longitude: 36.82,
      estimatedDuration: 60,
      paymentType: "CASH",
      priority: "HIGH",
      status: "IN_PROGRESS",
      scheduledAt: new Date(), // Today
      createdAt: wo2CreatedAt,
      acceptedAt: new Date(wo2CreatedAt.getTime() + 10 * 60 * 1000), // Accepted 10 mins after creation
      startedAt: new Date(),
      notes: "Urgent repair needed",
    },
  });

  const wo3CreatedAt = new Date(Date.now() - 60 * 60 * 1000); // Created 1 hour ago
  const wo3 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 2),
      srId: sr2.id,
      customerId: customer3.id,
      technicianId: techFreelancer.id,
      dispatcherId: dispatcher.id,
      categoryId: electrical.id,
      serviceId: electricalRepair.id,
      address: "456 Johnson Ave, Nairobi",
      latitude: -1.28,
      longitude: 36.815,
      estimatedDuration: 90,
      paymentType: "MOBILE_MONEY",
      priority: "MEDIUM",
      status: "ASSIGNED",
      scheduledAt: new Date(), // Today
      createdAt: wo3CreatedAt,
      acceptedAt: new Date(wo3CreatedAt.getTime() + 15 * 60 * 1000), // Accepted 15 mins after creation
      notes: "Check all electrical outlets in bedroom",
    },
  });

  // Create additional completed work orders for this week and month stats
  const completedWO1ThisWeek = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 3),
      srId: sr3.id,
      customerId: customer.id,
      technicianId: techFreelancer.id,
      dispatcherId: dispatcher.id,
      categoryId: plumbing.id,
      serviceId: plumbingRepair.id,
      address: "123 Customer Lane, Nairobi",
      latitude: -1.286389,
      longitude: 36.817223,
      estimatedDuration: 120,
      paymentType: "MOBILE_MONEY",
      priority: "MEDIUM",
      status: "PAID_VERIFIED",
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      startedAt: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000
      ),
      completedAt: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
      ),
      paidVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completionNotes: "Fixed plumbing leak",
    },
  });

  const completedWO2ThisWeek = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 4),
      srId: sr3.id,
      customerId: customer2.id,
      technicianId: techFreelancer.id,
      dispatcherId: dispatcher.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acNotCooling.id,
      address: "789 Smith Road, Nairobi",
      latitude: -1.295,
      longitude: 36.82,
      estimatedDuration: 90,
      paymentType: "CASH",
      priority: "HIGH",
      status: "PAID_VERIFIED",
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000
      ),
      completedAt: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
      paidVerifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completionNotes: "AC cooling issue resolved",
    },
  });

  console.log("✅ Created work orders");

  // Create Payments
  const payment1 = await prisma.payment.create({
    data: {
      woId: wo1.id,
      technicianId: techInternal.id,
      amount: 5000,
      method: "MOBILE_MONEY",
      transactionRef: "MPESA-ABC123456",
      proofUrl: "/uploads/payment-proof-1.jpg",
      status: "VERIFIED",
      verifiedById: admin.id,
      verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  const payment2 = await prisma.payment.create({
    data: {
      woId: wo2.id,
      technicianId: techFreelancer.id,
      amount: 2000,
      method: "CASH",
      transactionRef: "CASH-20251123-001",
      proofUrl: "/uploads/payment-proof-2.jpg",
      status: "PENDING_VERIFICATION",
    },
  });

  const paymentThisWeek1 = await prisma.payment.create({
    data: {
      woId: completedWO1ThisWeek.id,
      technicianId: techFreelancer.id,
      amount: 1500,
      method: "MOBILE_MONEY",
      transactionRef: "MPESA-XYZ789012",
      proofUrl: "/uploads/payment-proof-3.jpg",
      status: "VERIFIED",
      verifiedById: admin.id,
      verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const paymentThisWeek2 = await prisma.payment.create({
    data: {
      woId: completedWO2ThisWeek.id,
      technicianId: techFreelancer.id,
      amount: 3000,
      method: "CASH",
      transactionRef: "CASH-20251201-002",
      proofUrl: "/uploads/payment-proof-4.jpg",
      status: "VERIFIED",
      verifiedById: admin.id,
      verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Created payments");

  // Create Commissions (using 5% rate as per SystemConfig)
  const COMMISSION_RATE = 0.05; // 5% - Must match SystemConfig

  await prisma.commission.create({
    data: {
      woId: wo1.id,
      technicianId: techInternal.id,
      type: "BONUS",
      rate: COMMISSION_RATE,
      amount: Math.round(5000 * COMMISSION_RATE * 100) / 100, // 5% of 5000 = 250
      status: "EARNED",
      paymentId: payment1.id,
    },
  });

  await prisma.commission.create({
    data: {
      woId: wo2.id,
      technicianId: techFreelancer.id,
      type: "COMMISSION",
      rate: COMMISSION_RATE,
      amount: Math.round(2000 * COMMISSION_RATE * 100) / 100, // 5% of 2000 = 100
      status: "EARNED",
      paymentId: payment2.id,
    },
  });

  await prisma.commission.create({
    data: {
      woId: completedWO1ThisWeek.id,
      technicianId: techFreelancer.id,
      type: "COMMISSION",
      rate: COMMISSION_RATE,
      amount: Math.round(1500 * COMMISSION_RATE * 100) / 100, // 5% of 1500 = 75
      status: "EARNED",
      paymentId: paymentThisWeek1.id,
    },
  });

  await prisma.commission.create({
    data: {
      woId: completedWO2ThisWeek.id,
      technicianId: techFreelancer.id,
      type: "COMMISSION",
      rate: COMMISSION_RATE,
      amount: Math.round(3000 * COMMISSION_RATE * 100) / 100, // 5% of 3000 = 150
      status: "EARNED",
      paymentId: paymentThisWeek2.id,
    },
  });

  console.log("✅ Created commissions");

  // Update wallet balances and create transactions for BOTH freelancer AND internal technicians

  // 1. Freelancer Wallet (Mike Freelancer)
  const freelancerWallet = await prisma.wallet.findUnique({
    where: { technicianId: techFreelancer.id },
  });

  if (freelancerWallet) {
    // Total commissions: 100 + 75 + 150 = 325 (5% of payments)
    const freelancerCommissionTotal = 100 + 75 + 150; // 325

    await prisma.wallet.update({
      where: { technicianId: techFreelancer.id },
      data: { balance: freelancerCommissionTotal },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: freelancerWallet.id,
        technicianId: techFreelancer.id,
        type: "CREDIT",
        sourceType: "COMMISSION",
        sourceId: wo2.id,
        amount: 100, // 5% of 2000
        description: "Commission for WO-" + wo2.woNumber,
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: freelancerWallet.id,
        technicianId: techFreelancer.id,
        type: "CREDIT",
        sourceType: "COMMISSION",
        sourceId: completedWO1ThisWeek.id,
        amount: 75, // 5% of 1500
        description: "Commission for completed work order this week",
      },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: freelancerWallet.id,
        technicianId: techFreelancer.id,
        type: "CREDIT",
        sourceType: "COMMISSION",
        sourceId: completedWO2ThisWeek.id,
        amount: 150, // 5% of 3000
        description: "Commission for completed work order this week",
      },
    });
  }

  // 2. Internal Technician Wallet (John Technician)
  // Create wallet for internal technician if not exists
  let internalWallet = await prisma.wallet.findUnique({
    where: { technicianId: techInternal.id },
  });

  if (!internalWallet) {
    internalWallet = await prisma.wallet.create({
      data: {
        technicianId: techInternal.id,
        balance: 0,
      },
    });
  }

  // Total bonus: 250 (5% of 5000)
  const internalBonusTotal = 250;

  await prisma.wallet.update({
    where: { technicianId: techInternal.id },
    data: { balance: internalBonusTotal },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: internalWallet.id,
      technicianId: techInternal.id,
      type: "CREDIT",
      sourceType: "BONUS",
      sourceId: wo1.id,
      amount: 250, // 5% of 5000
      description: "Bonus for WO-" + wo1.woNumber,
    },
  });

  console.log("✅ Updated wallet balances");

  // Create Reviews
  await prisma.review.create({
    data: {
      woId: wo1.id,
      customerId: customer.id,
      technicianId: techInternal.id,
      rating: 5,
      comment:
        "Excellent service! Very professional and fixed the AC perfectly.",
    },
  });

  await prisma.review.create({
    data: {
      woId: wo2.id,
      customerId: customer2.id,
      technicianId: techFreelancer.id,
      rating: 4,
      comment: "Good work, arrived on time and completed the job efficiently.",
    },
  });
  console.log("✅ Created reviews");

  // Create Technician Check-ins
  await prisma.technicianCheckin.create({
    data: {
      woId: wo1.id,
      technicianId: techInternal.id,
      latitude: -1.286389,
      longitude: 36.817223,
    },
  });

  await prisma.technicianCheckin.create({
    data: {
      woId: wo2.id,
      technicianId: techFreelancer.id,
      latitude: -1.295,
      longitude: 36.82,
    },
  });
  console.log("✅ Created technician check-ins");

  // Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "USER_CREATED",
        entityType: "USER",
        entityId: techInternal.id,
        metadataJson: JSON.stringify({ role: "TECH_INTERNAL" }),
      },
      {
        userId: dispatcher.id,
        action: "WO_CREATED",
        entityType: "WORK_ORDER",
        entityId: wo1.id,
        metadataJson: JSON.stringify({ woNumber: wo1.woNumber }),
      },
      {
        userId: techInternal.id,
        action: "WO_COMPLETED",
        entityType: "WORK_ORDER",
        entityId: wo1.id,
      },
      {
        userId: admin.id,
        action: "PAYMENT_VERIFIED",
        entityType: "PAYMENT",
        entityId: payment1.id,
        metadataJson: JSON.stringify({ amount: 5000 }),
      },
    ],
  });
  console.log("✅ Created audit logs");

  // Create sample notification
  await prisma.notification.createMany({
    data: [
      {
        userId: techInternal.id,
        type: "WO_ASSIGNED",
        title: "New Work Order Assigned",
        message: "You have been assigned work order " + wo1.woNumber,
        dataJson: JSON.stringify({ woId: wo1.id, woNumber: wo1.woNumber }),
        isRead: true,
        readAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: techFreelancer.id,
        type: "WO_ASSIGNED",
        title: "New Work Order Assigned",
        message: "You have been assigned work order " + wo2.woNumber,
        dataJson: JSON.stringify({ woId: wo2.id, woNumber: wo2.woNumber }),
        isRead: false,
      },
      {
        userId: customer.id,
        type: "WO_COMPLETED",
        title: "Work Order Completed",
        message: "Your work order " + wo1.woNumber + " has been completed",
        dataJson: JSON.stringify({ woId: wo1.id, woNumber: wo1.woNumber }),
        isRead: true,
        readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  console.log("✅ Created notifications");

  // Create OTP Records
  await prisma.oTP.createMany({
    data: [
      {
        phone: "9999999999",
        code: "123456",
        type: "REGISTRATION",
        isUsed: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        userId: customer.id,
      },
      {
        phone: "5555555555",
        code: "654321",
        type: "LOGIN",
        isUsed: true,
        expiresAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        userId: techFreelancer.id,
      },
      {
        phone: "8888888888",
        code: "789012",
        type: "PASSWORD_RESET",
        isUsed: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        userId: customer2.id,
      },
      {
        phone: "7777777777",
        code: "345678",
        type: "REGISTRATION",
        isUsed: true,
        expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        userId: customer3.id,
      },
      {
        phone: "1234567890",
        code: "111222",
        type: "REGISTRATION",
        isUsed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      {
        phone: "9876543210",
        code: "999888",
        type: "LOGIN",
        isUsed: false,
        expiresAt: new Date(Date.now() + 8 * 60 * 1000),
      },
    ],
  });
  console.log("✅ Created OTP records");

  // Create Payout Requests (amounts should be within wallet balance)
  const payoutReq1 = await prisma.payoutRequest.create({
    data: {
      technicianId: techFreelancer.id,
      amount: 50, // Request 50 Tk (within the 325 Tk balance)
      status: "APPROVED",
      reason: "Emergency medical expense",
      paymentMethod: "MOBILE_BANKING",
      reviewedById: admin.id,
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const payoutReq2 = await prisma.payoutRequest.create({
    data: {
      technicianId: tech2.id,
      amount: 100, // Request 100 Tk
      status: "PENDING",
      reason: "Need funds for equipment purchase",
      paymentMethod: "BANK_ACCOUNT",
    },
  });

  const payoutReq3 = await prisma.payoutRequest.create({
    data: {
      technicianId: techFreelancer.id,
      amount: 100, // Request 100 Tk
      status: "REJECTED",
      reason: "Urgent personal expense",
      paymentMethod: "CASH",
      reviewedById: admin.id,
      reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("✅ Created payout requests");

  // Create Payouts
  const payout1 = await prisma.payout.create({
    data: {
      technicianId: techFreelancer.id,
      totalAmount: 100, // Only 100 Tk (5% of 2000) as per correct calculation
      type: "WEEKLY",
      status: "COMPLETED",
      processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
    },
  });

  // Link one commission to payout and update wallet
  // Only update commission for wo2 which is already created with EARNED status
  // This simulates a partial payout
  console.log("✅ Created payouts");

  // Create more Service Requests for variety
  const sr4 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 3),
      customerId: customer.id,
      categoryId: plumbing.id,
      serviceId: plumbingRepair.id,
      description: "Leaking pipe under kitchen sink",
      priority: "HIGH",
      address: "123 Customer Lane, Nairobi",
      streetAddress: "123 Customer Lane",
      city: "Nairobi",
      latitude: -1.286389,
      longitude: 36.817223,
      paymentType: "CASH",
      status: "CANCELLED",
      source: "CUSTOMER_APP",
      isGuest: false,
    },
  });

  const sr5 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 4),
      customerId: customer3.id,
      createdById: callCenter.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acNotCooling.id,
      description: "AC making loud noise, need urgent check",
      priority: "HIGH",
      address: "456 Johnson Ave, Nairobi",
      streetAddress: "456 Johnson Ave",
      city: "Nairobi",
      landmark: "Opposite Central Park",
      latitude: -1.28,
      longitude: 36.815,
      attachments: JSON.stringify([
        "/uploads/sr-photo-1.jpg",
        "/uploads/sr-photo-2.jpg",
      ]),
      paymentType: "MOBILE_MONEY",
      status: "OPEN",
      source: "CALL_CENTER",
      isGuest: false,
    },
  });

  const sr6 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 5),
      customerId: customer2.id,
      categoryId: electrical.id,
      serviceId: electricalRepair.id,
      description: "All lights flickering in living room",
      priority: "MEDIUM",
      address: "789 Smith Road, Nairobi",
      streetAddress: "789 Smith Road",
      city: "Nairobi",
      latitude: -1.295,
      longitude: 36.82,
      paymentType: "MOBILE_MONEY",
      status: "NEW",
      source: "CUSTOMER_APP",
      isGuest: false,
    },
  });

  const sr7 = await prisma.serviceRequest.create({
    data: {
      srNumber: "SR-" + (Date.now() + 6),
      customerId: customer.id,
      createdById: callCenter.id,
      categoryId: hvac.id,
      serviceId: hvacInstall.id,
      subserviceId: splitAcInstall.id,
      description: "Guest request: Install AC in bedroom",
      priority: "LOW",
      address: "Hotel Grande, Downtown Nairobi",
      streetAddress: "Hotel Grande, Main Street",
      city: "Nairobi",
      landmark: "Next to City Bank",
      latitude: -1.2835,
      longitude: 36.8185,
      paymentType: "CASH",
      status: "NEW",
      source: "CALL_CENTER",
      isGuest: true,
    },
  });
  console.log("✅ Created additional service requests");

  // Create more Work Orders for different statuses
  const wo4 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 3),
      srId: sr5.id,
      customerId: customer3.id,
      technicianId: techInternal.id,
      dispatcherId: dispatcher.id,
      categoryId: hvac.id,
      serviceId: hvacRepair.id,
      subserviceId: acNotCooling.id,
      address: sr5.address,
      latitude: sr5.latitude,
      longitude: sr5.longitude,
      estimatedDuration: 90,
      paymentType: sr5.paymentType,
      priority: sr5.priority,
      status: "ACCEPTED",
      scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      acceptedAt: new Date(),
      notes: "Check for refrigerant leak",
    },
  });

  const wo5 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 4),
      srId: sr1.id,
      customerId: customer.id,
      technicianId: tech2.id,
      dispatcherId: dispatcher.id,
      categoryId: hvac.id,
      serviceId: hvacInstall.id,
      subserviceId: splitAcInstall.id,
      address: "123 Customer Lane, Nairobi",
      latitude: -1.286389,
      longitude: 36.817223,
      estimatedDuration: 180,
      paymentType: "MOBILE_MONEY",
      priority: "MEDIUM",
      status: "COMPLETED_PENDING_PAYMENT",
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      startedAt: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000
      ),
      completedAt: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ),
      notes: "New split AC installation",
      completionNotes:
        "Successfully installed 1.5 ton split AC, tested cooling",
      materialsUsed: JSON.stringify([
        { item: "Split AC Unit 1.5 ton", qty: 1, cost: 15000 },
        { item: "Copper Piping", qty: 5, cost: 2500 },
        { item: "Installation Kit", qty: 1, cost: 1500 },
      ]),
    },
  });

  const wo6 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 5),
      srId: sr2.id,
      customerId: customer2.id,
      dispatcherId: dispatcher.id,
      categoryId: electrical.id,
      serviceId: electricalRepair.id,
      address: sr2.address,
      latitude: sr2.latitude,
      longitude: sr2.longitude,
      estimatedDuration: 60,
      paymentType: sr2.paymentType,
      priority: sr2.priority,
      status: "UNASSIGNED",
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      notes: "Awaiting technician assignment",
    },
  });

  const wo7 = await prisma.workOrder.create({
    data: {
      woNumber: "WO-" + (Date.now() + 6),
      srId: sr4.id,
      customerId: customer.id,
      technicianId: techFreelancer.id,
      dispatcherId: dispatcher.id,
      categoryId: plumbing.id,
      serviceId: plumbingRepair.id,
      address: sr4.address,
      latitude: sr4.latitude,
      longitude: sr4.longitude,
      estimatedDuration: 45,
      paymentType: sr4.paymentType,
      priority: sr4.priority,
      status: "CANCELLED",
      scheduledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      cancelledAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      cancelReason: "Customer found alternative service",
      notes: "Customer cancelled before technician arrived",
    },
  });
  console.log("✅ Created additional work orders");

  // Create more Payments
  const payment3 = await prisma.payment.create({
    data: {
      woId: wo5.id,
      technicianId: tech2.id,
      amount: 19000,
      method: "MOBILE_MONEY",
      transactionRef: "MPESA-XYZ789012",
      status: "PENDING_VERIFICATION",
    },
  });

  const payment4 = await prisma.payment.create({
    data: {
      woId: wo1.id,
      technicianId: techInternal.id,
      amount: 5000,
      method: "CASH",
      transactionRef: "CASH-20251120-001",
      proofUrl: "/uploads/payment-proof-3.jpg",
      status: "REJECTED",
      verifiedById: admin.id,
      verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      rejectedReason: "Unclear receipt image, please re-upload",
    },
  });
  console.log("✅ Created additional payments");

  // Create more Commissions (using correct 5% rate)
  await prisma.commission.createMany({
    data: [
      {
        woId: wo5.id,
        technicianId: tech2.id,
        type: "COMMISSION",
        rate: 0.05,
        amount: Math.round(19000 * 0.05 * 100) / 100, // 5% of 19000 = 950
        status: "EARNED", // Correct status
        paymentId: payment3.id,
      },
      {
        woId: wo4.id,
        technicianId: techInternal.id,
        type: "BONUS",
        rate: 0.05,
        amount: 0, // Not yet completed
        status: "EARNED", // Correct status
      },
    ],
  });
  console.log("✅ Created additional commissions");

  // Create more Reviews
  await prisma.review.create({
    data: {
      woId: wo5.id,
      customerId: customer.id,
      technicianId: tech2.id,
      rating: 5,
      comment:
        "Amazing work! Installation was perfect and technician was very knowledgeable.",
    },
  });
  console.log("✅ Created additional reviews");

  // Create more Check-ins
  await prisma.technicianCheckin.createMany({
    data: [
      {
        woId: wo4.id,
        technicianId: techInternal.id,
        latitude: -1.28,
        longitude: 36.815,
      },
      {
        woId: wo5.id,
        technicianId: tech2.id,
        latitude: -1.286389,
        longitude: 36.817223,
      },
    ],
  });
  console.log("✅ Created additional check-ins");

  // Create more Wallet Transactions (using correct amounts matching commissions)
  const tech2Wallet = await prisma.wallet.findUnique({
    where: { technicianId: tech2.id },
  });

  if (tech2Wallet) {
    // Update tech2 wallet balance to match commission (950) + initial balance (1500)
    // But we need to ensure transactions match the balance
    // Initial balance: 1500, Commission: 950 = Total 2450
    await prisma.wallet.update({
      where: { technicianId: tech2.id },
      data: { balance: 950 }, // Only the earned commission amount
    });

    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: tech2Wallet.id,
          technicianId: tech2.id,
          type: "CREDIT",
          sourceType: "COMMISSION",
          sourceId: wo5.id,
          amount: 950, // 5% of 19000
          description: "Commission for AC installation - " + wo5.woNumber,
        },
      ],
    });
  }

  const freelancerWallet2 = await prisma.wallet.findUnique({
    where: { technicianId: techFreelancer.id },
  });

  if (freelancerWallet2) {
    await prisma.walletTransaction.createMany({
      data: [
        {
          walletId: freelancerWallet2.id,
          technicianId: techFreelancer.id,
          type: "PAYOUT",
          sourceType: "PAYOUT",
          sourceId: payout1.id,
          amount: -500,
          description: "Weekly payout batch - Week 47",
        },
        {
          walletId: freelancerWallet2.id,
          technicianId: techFreelancer.id,
          type: "BONUS",
          sourceType: "MANUAL",
          amount: 200,
          description: "Performance bonus for excellent ratings",
        },
      ],
    });
  }
  console.log("✅ Created additional wallet transactions");

  // Create more Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: dispatcher.id,
        action: "WO_CREATED",
        entityType: "WORK_ORDER",
        entityId: wo2.id,
        metadataJson: JSON.stringify({ woNumber: wo2.woNumber }),
      },
      {
        userId: dispatcher.id,
        action: "WO_CREATED",
        entityType: "WORK_ORDER",
        entityId: wo3.id,
        metadataJson: JSON.stringify({ woNumber: wo3.woNumber }),
      },
      {
        userId: techFreelancer.id,
        action: "WO_ACCEPTED",
        entityType: "WORK_ORDER",
        entityId: wo2.id,
      },
      {
        userId: techFreelancer.id,
        action: "WO_START",
        entityType: "WORK_ORDER",
        entityId: wo2.id,
      },
      {
        userId: tech2.id,
        action: "WO_COMPLETED",
        entityType: "WORK_ORDER",
        entityId: wo5.id,
      },
      {
        userId: admin.id,
        action: "PAYMENT_REJECTED",
        entityType: "PAYMENT",
        entityId: payment4.id,
        metadataJson: JSON.stringify({ reason: "Unclear receipt image" }),
      },
      {
        userId: admin.id,
        action: "PAYOUT_REQUEST_APPROVED",
        entityType: "PAYOUT_REQUEST",
        entityId: payoutReq1.id,
        metadataJson: JSON.stringify({ amount: 500 }),
      },
      {
        userId: admin.id,
        action: "PAYOUT_REQUEST_REJECTED",
        entityType: "PAYOUT_REQUEST",
        entityId: payoutReq3.id,
        metadataJson: JSON.stringify({ reason: "Insufficient balance" }),
      },
      {
        userId: admin.id,
        action: "USER_CREATED",
        entityType: "USER",
        entityId: tech2.id,
        metadataJson: JSON.stringify({ role: "TECH_FREELANCER" }),
      },
      {
        userId: dispatcher.id,
        action: "TECHNICIAN_BLOCKED",
        entityType: "USER",
        entityId: techFreelancer.id,
        metadataJson: JSON.stringify({ reason: "Test block - removed" }),
      },
      {
        userId: admin.id,
        action: "TECHNICIAN_UNBLOCKED",
        entityType: "USER",
        entityId: techFreelancer.id,
      },
      {
        userId: callCenter.id,
        action: "SR_CREATED",
        entityType: "SERVICE_REQUEST",
        entityId: sr1.id,
        metadataJson: JSON.stringify({ srNumber: sr1.srNumber }),
      },
      {
        userId: callCenter.id,
        action: "SR_CREATED",
        entityType: "SERVICE_REQUEST",
        entityId: sr5.id,
        metadataJson: JSON.stringify({ srNumber: sr5.srNumber }),
      },
    ],
  });
  console.log("✅ Created additional audit logs");

  // Create more Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: tech2.id,
        type: "WO_ASSIGNED",
        title: "New Work Order Assigned",
        message: "You have been assigned work order " + wo3.woNumber,
        dataJson: JSON.stringify({ woId: wo3.id, woNumber: wo3.woNumber }),
        isRead: false,
      },
      {
        userId: tech2.id,
        type: "WO_ASSIGNED",
        title: "New AC Installation Job",
        message: "You have been assigned work order " + wo5.woNumber,
        dataJson: JSON.stringify({ woId: wo5.id, woNumber: wo5.woNumber }),
        isRead: true,
        readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: customer2.id,
        type: "SR_CREATED",
        title: "Service Request Created",
        message: "Your service request " + sr2.srNumber + " has been created",
        dataJson: JSON.stringify({ srId: sr2.id, srNumber: sr2.srNumber }),
        isRead: true,
        readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: customer3.id,
        type: "WO_ACCEPTED",
        title: "Technician Accepted Your Job",
        message: "Technician has accepted work order " + wo4.woNumber,
        dataJson: JSON.stringify({ woId: wo4.id, woNumber: wo4.woNumber }),
        isRead: false,
      },
      {
        userId: techInternal.id,
        type: "PAYMENT_VERIFIED",
        title: "Payment Verified",
        message: "Your payment of 5000 KES has been verified",
        dataJson: JSON.stringify({ paymentId: payment1.id, amount: 5000 }),
        isRead: true,
        readAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        userId: techFreelancer.id,
        type: "PAYOUT_APPROVED",
        title: "Payout Request Approved",
        message: "Your payout request of 500 KES has been approved",
        dataJson: JSON.stringify({
          payoutRequestId: payoutReq1.id,
          amount: 500,
        }),
        isRead: true,
        readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: techFreelancer.id,
        type: "PAYOUT_REJECTED",
        title: "Payout Request Rejected",
        message: "Your payout request of 300 KES has been rejected",
        dataJson: JSON.stringify({
          payoutRequestId: payoutReq3.id,
          reason: "Insufficient balance",
        }),
        isRead: false,
      },
      {
        userId: tech2.id,
        type: "REVIEW_RECEIVED",
        title: "New 5-Star Review!",
        message: "You received a 5-star review from Jane Customer",
        dataJson: JSON.stringify({ woId: wo5.id, rating: 5 }),
        isRead: false,
      },
    ],
  });
  console.log("✅ Created additional notifications");

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📝 Test Credentials:");
  console.log("Admin: 1111111111 / admin123");
  console.log("Dispatcher: 2222222222 / dispatcher123");
  console.log("Call Center: 3333333333 / callcenter123");
  console.log("Internal Tech: 4444444444 / tech123");
  console.log("Freelancer: 5555555555 / freelancer123");
  console.log("Freelancer 2: 6666666666 / tech123");
  console.log("Customer 1: 9999999999 / customer123");
  console.log("Customer 2: 8888888888 / customer123");
  console.log("Customer 3: 7777777777 / customer123");
  console.log("\n📊 Comprehensive Test Data Summary:");
  console.log(
    "- 9 Users (1 Admin, 1 Dispatcher, 1 Call Center, 3 Technicians, 3 Customers)"
  );
  console.log(
    "- 7 Service Requests (1 Converted, 2 Open, 2 New, 1 Cancelled, 1 Guest)"
  );
  console.log(
    "- 7 Work Orders (1 Paid, 1 In Progress, 1 Accepted, 1 Assigned, 1 Unassigned, 1 Completed Pending, 1 Cancelled)"
  );
  console.log("- 4 Payments (1 Verified, 2 Pending, 1 Rejected)");
  console.log("- 4 Commissions (1 Paid Out, 2 Pending, 1 Booked)");
  console.log("- 3 Reviews (2x 5 stars, 1x 4 stars)");
  console.log("- 6 OTP Records (4 Used, 2 Active)");
  console.log("- 3 Payout Requests (1 Approved, 1 Pending, 1 Rejected)");
  console.log("- 1 Payout (Weekly batch processed)");
  console.log("- 4 Technician Check-ins");
  console.log("- 5 Wallet Transactions");
  console.log("- 17 Audit Logs");
  console.log("- 11 Notifications (5 Read, 6 Unread)");
  console.log("- 3 Categories (HVAC, Electrical, Plumbing)");
  console.log("- 3 Subservices");
  console.log("- 3 Services");
  console.log("- 1 System Config");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
