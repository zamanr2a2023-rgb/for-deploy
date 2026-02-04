/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTechnicianLocations() {
  try {
    console.log("=== TECHNICIAN LOCATION DIAGNOSTIC ===\n");

    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      select: {
        id: true,
        name: true,
        locationStatus: true,
        locationUpdatedAt: true,
        lastLatitude: true,
        lastLongitude: true,
        latitude: true,
        longitude: true,
        technicianProfile: {
          select: {
            status: true,
            type: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    console.log(`Total Technicians: ${technicians.length}\n`);

    console.log("=== TECHNICIAN LOCATION DATA ===");
    technicians.forEach((t) => {
      console.log(`\n${t.name} (ID: ${t.id}):`);
      console.log(`  locationStatus: ${t.locationStatus || "NULL"}`);
      console.log(
        `  profileStatus: ${t.technicianProfile?.status || "NO_PROFILE"}`,
      );
      console.log(`  lastLatitude: ${t.lastLatitude || "NULL"}`);
      console.log(`  lastLongitude: ${t.lastLongitude || "NULL"}`);
      console.log(`  latitude (customer field): ${t.latitude || "NULL"}`);
      console.log(`  longitude (customer field): ${t.longitude || "NULL"}`);
      console.log(`  locationUpdatedAt: ${t.locationUpdatedAt || "NULL"}`);
    });

    // Check issues
    console.log("\n=== ISSUES FOUND ===");

    const withoutLocationStatus = technicians.filter((t) => !t.locationStatus);
    console.log(
      `\n1. Technicians WITHOUT locationStatus: ${withoutLocationStatus.length}`,
    );
    withoutLocationStatus.forEach((t) =>
      console.log(`   - ${t.name} (ID: ${t.id})`),
    );

    const withoutLastCoords = technicians.filter(
      (t) => !t.lastLatitude || !t.lastLongitude,
    );
    console.log(
      `\n2. Technicians WITHOUT lastLatitude/lastLongitude: ${withoutLastCoords.length}`,
    );
    withoutLastCoords.forEach((t) =>
      console.log(`   - ${t.name} (ID: ${t.id})`),
    );

    const withoutLocationUpdate = technicians.filter(
      (t) => !t.locationUpdatedAt,
    );
    console.log(
      `\n3. Technicians WITHOUT locationUpdatedAt: ${withoutLocationUpdate.length}`,
    );
    withoutLocationUpdate.forEach((t) =>
      console.log(`   - ${t.name} (ID: ${t.id})`),
    );

    // Summary by locationStatus
    console.log("\n=== LOCATION STATUS SUMMARY ===");
    const statusCounts = {};
    technicians.forEach((t) => {
      const status = t.locationStatus || "NULL";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check the map endpoint logic
    console.log("\n=== MAP ENDPOINT ANALYSIS ===");
    const now = new Date();
    const ONLINE_THRESHOLD_MINUTES = 15;

    let wouldShowOnline = 0;
    let wouldShowOffline = 0;
    let wouldBeFiltered = 0;

    technicians.forEach((t) => {
      const profile = t.technicianProfile;
      const hasCoords =
        (t.latitude || t.lastLatitude) && (t.longitude || t.lastLongitude);

      if (!profile) {
        wouldBeFiltered++;
        return;
      }

      if (!hasCoords) {
        wouldBeFiltered++;
        return;
      }

      // Current logic uses profile.status NOT locationStatus
      const isMobileAppOnline = profile.status === "ACTIVE";

      if (!isMobileAppOnline) {
        wouldBeFiltered++; // Gets filtered out unless has active job
        return;
      }

      // Check recent activity
      const lastActivity = t.locationUpdatedAt || new Date(0);
      const minutesSinceActivity = (now - new Date(lastActivity)) / 1000 / 60;
      const isRecentlyActive = minutesSinceActivity < ONLINE_THRESHOLD_MINUTES;

      if (isMobileAppOnline && isRecentlyActive) {
        wouldShowOnline++;
      } else {
        wouldShowOffline++;
      }
    });

    console.log(`Would show as ONLINE: ${wouldShowOnline}`);
    console.log(`Would show as OFFLINE: ${wouldShowOffline}`);
    console.log(`Would be FILTERED OUT: ${wouldBeFiltered}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTechnicianLocations();
