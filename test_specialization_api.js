/** @format */

// test_specialization_api.js
// Test script to verify the specialization API endpoints work correctly

import fetch from "node-fetch";

const BASE_URL = "http://localhost:4000/api";
const ADMIN_CREDENTIALS = {
  phone: "20000001",
  password: "admin123",
};

let authToken = null;

async function login() {
  console.log("🔑 Logging in as admin...");

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  authToken = data.token;
  console.log(`✅ Login successful! User: ${data.user.name}`);
  return data;
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    console.error(`❌ API Error [${response.status}] ${endpoint}:`, data);
    throw new Error(
      `API request failed: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function testSpecializationAPI() {
  console.log("🧪 Testing Specialization API Endpoints...\n");

  try {
    // Step 1: Login
    await login();

    // Step 2: Get all specializations
    console.log("\n📋 Testing GET /api/specializations");
    const allSpecs = await apiRequest("/specializations");
    console.log(`✅ Retrieved ${allSpecs.data.length} specializations`);
    console.log(
      "   Specializations:",
      allSpecs.data.map((s) => s.name).join(", "),
    );

    // Step 3: Get only active specializations
    console.log("\n📋 Testing GET /api/specializations?activeOnly=true");
    const activeSpecs = await apiRequest("/specializations?activeOnly=true");
    console.log(
      `✅ Retrieved ${activeSpecs.data.length} active specializations`,
    );

    // Step 4: Create a new specialization
    console.log("\n✨ Testing POST /api/specializations");
    const newSpec = await apiRequest("/specializations", {
      method: "POST",
      body: JSON.stringify({
        name: "API Test Specialization",
        description: "Created via API test",
      }),
    });
    console.log(
      `✅ Created specialization: ${newSpec.data.name} (ID: ${newSpec.data.id})`,
    );
    const createdId = newSpec.data.id;

    // Step 5: Get specialization by ID
    console.log(`\n🔍 Testing GET /api/specializations/${createdId}`);
    const singleSpec = await apiRequest(`/specializations/${createdId}`);
    console.log(`✅ Retrieved specialization: ${singleSpec.data.name}`);

    // Step 6: Update the specialization
    console.log(`\n✏️ Testing PUT /api/specializations/${createdId}`);
    const updatedSpec = await apiRequest(`/specializations/${createdId}`, {
      method: "PUT",
      body: JSON.stringify({
        description: "Updated description via API test",
        isActive: true,
      }),
    });
    console.log(`✅ Updated specialization: ${updatedSpec.data.name}`);

    // Step 7: Get specialization statistics
    console.log("\n📊 Testing GET /api/specializations/stats");
    const stats = await apiRequest("/specializations/stats");
    console.log(
      `✅ Retrieved statistics for ${stats.data.specializations.length} specializations`,
    );
    console.log(
      `   Summary: ${stats.data.summary.total} total, ${stats.data.summary.active} active`,
    );

    // Step 8: Test duplicate name prevention
    console.log("\n⚠️ Testing duplicate name prevention");
    try {
      await apiRequest("/specializations", {
        method: "POST",
        body: JSON.stringify({
          name: "API Test Specialization", // Same name as before
          description: "This should fail",
        }),
      });
      console.log("❌ Duplicate prevention failed - should not reach here");
    } catch (error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("400")
      ) {
        console.log("✅ Duplicate name prevention working correctly");
      } else {
        throw error;
      }
    }

    // Step 9: Deactivate the specialization
    console.log(`\n🔄 Testing deactivation of specialization ${createdId}`);
    const deactivatedSpec = await apiRequest(`/specializations/${createdId}`, {
      method: "PUT",
      body: JSON.stringify({
        isActive: false,
      }),
    });
    console.log(`✅ Deactivated specialization: ${deactivatedSpec.data.name}`);

    // Step 10: Verify activeOnly filter excludes deactivated
    console.log("\n📋 Verifying active-only filter excludes deactivated");
    const finalActiveSpecs = await apiRequest(
      "/specializations?activeOnly=true",
    );
    const isExcluded = !finalActiveSpecs.data.some((s) => s.id === createdId);
    console.log(
      `✅ Deactivated specialization ${isExcluded ? "correctly excluded" : "❌ wrongly included"} from active list`,
    );

    // Step 11: Clean up - delete the test specialization
    console.log(`\n🗑️ Testing DELETE /api/specializations/${createdId}`);
    const deletedSpec = await apiRequest(`/specializations/${createdId}`, {
      method: "DELETE",
    });
    console.log(`✅ Deleted specialization: ${deletedSpec.data.name}`);

    console.log("\n🎉 All API tests completed successfully!");
  } catch (error) {
    console.error("\n❌ API test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testSpecializationAPI();
