/** @format */

// Script to decode JWT token and check which user is logged in
import jwt from "jsonwebtoken";

// Paste your Bearer token here (without "Bearer " prefix)
const token = "YOUR_TOKEN_HERE"; // Replace this with your actual token from Postman

try {
  const decoded = jwt.decode(token);
  console.log("\n🔍 Token Information:\n");
  console.log("User ID:", decoded.id);
  console.log("Phone:", decoded.phone);
  console.log("Role:", decoded.role);
  console.log("\nFull decoded token:", JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error("Error decoding token:", error.message);
  console.log(
    "\n⚠️ Please replace YOUR_TOKEN_HERE with your actual Bearer token from Postman"
  );
}
