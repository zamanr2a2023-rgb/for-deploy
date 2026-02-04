/** @format */
// Diagnostic script to check dispatch technician statistics
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDispatchStats() {
  console.log("=== DISPATCH TECHNICIAN STATISTICS CHECK ===\n");

  try {
    // 1. Get all technicians with their status
    const allTechnicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      select: {
        id: true,
        name: true,
        role: true,
        isBlocked: true,
        locationStatus: true,
        technicianProfile: {
          select: {
            status: true,
            type: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    console.log(`📊 Total Technicians: ${allTechnicians.length}\n`);

    // 2. Categorize by actual data - PROPERLY MUTUALLY EXCLUSIVE
    const blocked = allTechnicians.filter((t) => t.isBlocked === true);
    const unblocked = allTechnicians.filter((t) => t.isBlocked === false);

    const online = unblocked.filter((t) => t.locationStatus === "ONLINE");
    const busy = unblocked.filter((t) => t.locationStatus === "BUSY");
    const offline = unblocked.filter(
      (t) => t.locationStatus === "OFFLINE" || t.locationStatus === null,
    );

    console.log("=== AVAILABILITY STATUS (Mutually Exclusive) ===");
    console.log(`Blocked (isBlocked=true): ${blocked.length}`);
    console.log(`Online (available): ${online.length}`);
    console.log(`Busy (on job): ${busy.length}`);
    console.log(`Offline (OFFLINE or NULL): ${offline.length}`);
    console.log(
      `Sum: ${blocked.length + online.length + busy.length + offline.length}`,
    );

    // 3. Check TechnicianProfile status breakdown (employment status)
    const activeProfile = unblocked.filter(
      (t) => t.technicianProfile?.status === "ACTIVE",
    );
    const inactiveProfile = unblocked.filter(
      (t) => t.technicianProfile?.status === "INACTIVE",
    );

    console.log("\n=== EMPLOYMENT STATUS (Profile) ===");
    console.log(`Profile ACTIVE: ${activeProfile.length}`);
    console.log(`Profile INACTIVE: ${inactiveProfile.length}`);

    // 4. Show detailed list
    console.log("\n=== DETAILED TECHNICIAN LIST ===");
    console.log(
      "ID | Name                 | isBlocked | locationStatus | profile.status",
    );
    console.log("-".repeat(80));

    for (const t of allTechnicians) {
      console.log(
        `${String(t.id).padEnd(3)} | ${(t.name || "").substring(0, 20).padEnd(20)} | ${String(t.isBlocked).padEnd(9)} | ${(t.locationStatus || "NULL").padEnd(14)} | ${t.technicianProfile?.status || "NO PROFILE"}`,
      );
    }

    // 5. Verify correct summary
    console.log("\n=== EXPECTED SUMMARY OUTPUT ===");
    console.log(`{`);
    console.log(`  total: ${allTechnicians.length},`);
    console.log(`  blocked: ${blocked.length},`);
    console.log(`  online: ${online.length},`);
    console.log(`  busy: ${busy.length},`);
    console.log(`  offline: ${offline.length},`);
    console.log(`  profileActive: ${activeProfile.length},`);
    console.log(`  profileInactive: ${inactiveProfile.length}`);
    console.log(`}`);

    console.log(
      "\n✅ All categories are now mutually exclusive for availability status!",
    );
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDispatchStats();
