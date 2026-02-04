/** @format */

// Decode the token to see which user ID it contains
import jwt from "jsonwebtoken";

// You need to paste your actual token here (without 'Bearer ')
const token = "PASTE_YOUR_TOKEN_HERE";

try {
  // Decode without verification to see the payload
  const decoded = jwt.decode(token);

  console.log("\n🔑 Token Information:\n");
  console.log("User ID:", decoded?.userId || decoded?.id);
  console.log("Role:", decoded?.role);
  console.log("Phone:", decoded?.phone);
  console.log("\nFull decoded token:", JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error("❌ Error decoding token:", error.message);
  console.log("\n💡 To use this script:");
  console.log("1. Copy your Bearer token from Postman");
  console.log("2. Edit check_token_user.js");
  console.log("3. Replace PASTE_YOUR_TOKEN_HERE with your actual token");
  console.log("4. Run: node check_token_user.js");
}
