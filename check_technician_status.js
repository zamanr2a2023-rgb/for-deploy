/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTechnicianStatus() {
  try {
    console.log("=== TECHNICIAN STATUS DIAGNOSTIC ===\n");

    // Get all technicians
    const allTechnicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        locationStatus: true,
        locationUpdatedAt: true,
        technicianProfile: {
          select: {
            status: true,
            type: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    console.log(`Total Technicians: ${allTechnicians.length}\n`);

    // Group by locationStatus
    const byLocationStatus = {};
    allTechnicians.forEach((t) => {
      const status = t.locationStatus || "NULL/UNDEFINED";
      if (!byLocationStatus[status]) {
        byLocationStatus[status] = [];
      }
      byLocationStatus[status].push(t);
    });

    console.log("=== BY LOCATION STATUS ===");
    Object.keys(byLocationStatus).forEach((status) => {
      console.log(
        `\n${status}: ${byLocationStatus[status].length} technicians`,
      );
      byLocationStatus[status].forEach((t) => {
        console.log(
          `  - ${t.name} (ID: ${t.id}, Profile: ${t.technicianProfile?.status || "NO_PROFILE"}, Blocked: ${t.isBlocked})`,
        );
      });
    });

    // Summary counts
    console.log("\n=== SUMMARY COUNTS ===");
    const online = allTechnicians.filter(
      (t) => t.locationStatus === "ONLINE",
    ).length;
    const busy = allTechnicians.filter(
      (t) => t.locationStatus === "BUSY",
    ).length;
    const offline = allTechnicians.filter(
      (t) => t.locationStatus === "OFFLINE",
    ).length;
    const nullStatus = allTechnicians.filter((t) => !t.locationStatus).length;
    const blocked = allTechnicians.filter((t) => t.isBlocked).length;
    const withProfile = allTechnicians.filter(
      (t) => t.technicianProfile,
    ).length;
    const activeProfile = allTechnicians.filter(
      (t) => t.technicianProfile?.status === "ACTIVE",
    ).length;

    console.log(`ONLINE: ${online}`);
    console.log(`BUSY: ${busy}`);
    console.log(`OFFLINE (explicit): ${offline}`);
    console.log(`NULL/No Status: ${nullStatus}`);
    console.log(`Blocked: ${blocked}`);
    console.log(`With Profile: ${withProfile}`);
    console.log(`Active Profile: ${activeProfile}`);

    // The issue: Offline count should include NULL status
    console.log("\n=== ISSUE ANALYSIS ===");
    console.log(
      `Current "offline" logic counts: ${offline} (only explicit OFFLINE)`,
    );
    console.log(
      `Should count as offline: ${offline + nullStatus} (OFFLINE + NULL)`,
    );
    console.log(
      `Difference: ${nullStatus} technicians with NULL locationStatus are not counted!`,
    );

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTechnicianStatus();
