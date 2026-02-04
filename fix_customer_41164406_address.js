/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateCustomerAddress() {
  try {
    // First, check current customer state
    const customer = await prisma.user.findUnique({
      where: { phone: "41164406" },
    });

    console.log("Current customer data:");
    console.log(JSON.stringify(customer, null, 2));

    if (!customer) {
      console.log("Customer not found!");
      await prisma.$disconnect();
      return;
    }

    // Update the customer's home address based on their GPS coordinates
    // Customer location appears to be in Mauritania (lat: 18.10, lng: -16.01)
    const updatedUser = await prisma.user.update({
      where: { phone: "41164406" },
      data: {
        homeAddress: "Nouakchott, Mauritania",
      },
    });

    console.log("\nCustomer address updated successfully:");
    console.log(JSON.stringify(updatedUser, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error updating address:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateCustomerAddress();
