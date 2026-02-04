/** @format */

// Quick test to verify specializations endpoint works locally
import fetch from "node-fetch";

async function testSpecializationsEndpoint() {
  try {
    // First, let's try without auth to see the error
    console.log("Testing GET /api/specializations without auth...");
    const response1 = await fetch("http://localhost:4000/api/specializations");
    console.log("Status:", response1.status);
    const data1 = await response1.text();
    console.log("Response:", data1.substring(0, 200));
    console.log("---");

    // Now let's test the root endpoint to verify server is running
    console.log("Testing GET / (root)...");
    const response2 = await fetch("http://localhost:4000/");
    console.log("Status:", response2.status);
    const data2 = await response2.json();
    console.log("Response:", data2);
    console.log("---");

    // Test the API status endpoint
    console.log("Testing GET /api/status...");
    const response3 = await fetch("http://localhost:4000/api/status");
    console.log("Status:", response3.status);
    const data3 = await response3.json();
    console.log("Response:", data3);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSpecializationsEndpoint();
