/** @format */

// simple_health_check.js
import fetch from "node-fetch";

async function healthCheck() {
  try {
    console.log("🏥 Checking server health...");

    const response = await fetch("http://localhost:4000/health", {
      method: "GET",
      timeout: 5000,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Server is healthy:", data);
    } else {
      console.log("❌ Server returned non-OK status:", response.status);
      const text = await response.text();
      console.log("Response:", text);
    }
  } catch (error) {
    console.error("❌ Health check failed:", error.message);

    // Try the root endpoint instead
    try {
      console.log("🔄 Trying root endpoint...");
      const rootResponse = await fetch("http://localhost:4000/", {
        method: "GET",
        timeout: 5000,
      });

      if (rootResponse.ok) {
        const data = await rootResponse.json();
        console.log("✅ Root endpoint works:", data);
      } else {
        console.log("❌ Root endpoint failed too");
      }
    } catch (rootError) {
      console.error("❌ Root endpoint also failed:", rootError.message);
    }
  }
}

healthCheck();
