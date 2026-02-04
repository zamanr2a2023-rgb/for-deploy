/** @format */

// Test phone validation - Must be exactly 8 digits starting with 2, 3, or 4
import { isValidPhone, isValidLocalPhone } from "./src/utils/phone.js";

console.log("📞 Testing Phone Validation Rules\n");
console.log("✅ Valid: Exactly 8 digits starting with 2, 3, or 4");
console.log("❌ Invalid: Any other format\n");

const testCases = [
  // ✅ VALID - Starting with 2
  { phone: "22345678", expected: true, reason: "8 digits starting with 2" },
  { phone: "23456789", expected: true, reason: "8 digits starting with 2" },
  { phone: "29999999", expected: true, reason: "8 digits starting with 2" },

  // ✅ VALID - Starting with 3
  { phone: "31234567", expected: true, reason: "8 digits starting with 3" },
  { phone: "32345678", expected: true, reason: "8 digits starting with 3" },
  { phone: "39999999", expected: true, reason: "8 digits starting with 3" },

  // ✅ VALID - Starting with 4
  { phone: "45678901", expected: true, reason: "8 digits starting with 4" },
  { phone: "42345678", expected: true, reason: "8 digits starting with 4" },
  { phone: "49999999", expected: true, reason: "8 digits starting with 4" },

  // ❌ INVALID - Starting with 0
  { phone: "01234567", expected: false, reason: "Starts with 0 (invalid)" },
  { phone: "09999999", expected: false, reason: "Starts with 0 (invalid)" },

  // ❌ INVALID - Starting with 1
  { phone: "12345678", expected: false, reason: "Starts with 1 (invalid)" },
  { phone: "19999999", expected: false, reason: "Starts with 1 (invalid)" },

  // ❌ INVALID - Starting with 5
  { phone: "52345678", expected: false, reason: "Starts with 5 (invalid)" },
  { phone: "59999999", expected: false, reason: "Starts with 5 (invalid)" },

  // ❌ INVALID - Starting with 6
  { phone: "62345678", expected: false, reason: "Starts with 6 (invalid)" },
  { phone: "69999999", expected: false, reason: "Starts with 6 (invalid)" },

  // ❌ INVALID - Starting with 7
  { phone: "72345678", expected: false, reason: "Starts with 7 (invalid)" },
  { phone: "79999999", expected: false, reason: "Starts with 7 (invalid)" },

  // ❌ INVALID - Starting with 8
  { phone: "82345678", expected: false, reason: "Starts with 8 (invalid)" },
  { phone: "89999999", expected: false, reason: "Starts with 8 (invalid)" },

  // ❌ INVALID - Starting with 9
  { phone: "92345678", expected: false, reason: "Starts with 9 (invalid)" },
  { phone: "99999999", expected: false, reason: "Starts with 9 (invalid)" },

  // ❌ INVALID - Wrong length
  { phone: "2234567", expected: false, reason: "Only 7 digits (too short)" },
  { phone: "223456789", expected: false, reason: "9 digits (too long)" },
  { phone: "3123456", expected: false, reason: "Only 7 digits (too short)" },
  { phone: "312345678", expected: false, reason: "9 digits (too long)" },
  { phone: "456789", expected: false, reason: "Only 6 digits (too short)" },
  { phone: "4567890123", expected: false, reason: "10 digits (too long)" },

  // ✅ VALID - With country code
  { phone: "+22222345678", expected: true, reason: "With country code +222" },
  { phone: "+88022345678", expected: true, reason: "With country code +880" },
  { phone: "+25431234567", expected: true, reason: "With country code +254" },

  // ❌ INVALID - Empty or null
  { phone: "", expected: false, reason: "Empty string" },
  { phone: null, expected: false, reason: "Null value" },
  { phone: undefined, expected: false, reason: "Undefined value" },

  // ✅ VALID - With formatting (cleaned automatically)
  {
    phone: "2234-5678",
    expected: true,
    reason: "With dash (cleaned to 22345678)",
  },
  {
    phone: "223 456 78",
    expected: true,
    reason: "With spaces (cleaned to 22345678)",
  },
  {
    phone: "(223) 456-78",
    expected: true,
    reason: "With parentheses and dash (cleaned to 22345678)",
  },
];

let passed = 0;
let failed = 0;

console.log("═".repeat(80));
console.log("TEST RESULTS");
console.log("═".repeat(80) + "\n");

testCases.forEach((test, index) => {
  const result = isValidPhone(test.phone);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${test.reason}`);
    console.log(
      `   Input: "${test.phone}" → Result: ${result ? "VALID" : "INVALID"}`,
    );
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${test.reason}`);
    console.log(`   Input: "${test.phone}"`);
    console.log(`   Expected: ${test.expected ? "VALID" : "INVALID"}`);
    console.log(`   Got: ${result ? "VALID" : "INVALID"}`);
  }
  console.log("");
});

console.log("═".repeat(80));
console.log("SUMMARY");
console.log("═".repeat(80));
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
console.log("═".repeat(80));

if (failed === 0) {
  console.log(
    "\n🎉 All tests passed! Phone validation is working correctly.\n",
  );
} else {
  console.log("\n⚠️  Some tests failed. Please review the validation logic.\n");
  process.exit(1);
}
