/** @format */

// File Upload Test Utility for Technician Profiles
// This utility helps test file uploads and diagnose issues

import fs from "fs";
import path from "path";

export function createTestFiles() {
  const testDir = "uploads/test-files";
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create test files
  const files = [
    { name: "test-photo.jpg", content: "Test photo file for profile" },
    { name: "test-id-card.pdf", content: "Test ID card document" },
    { name: "test-residence-permit.pdf", content: "Test residence permit" },
    { name: "test-degree-1.pdf", content: "Test degree certificate 1" },
    { name: "test-degree-2.pdf", content: "Test degree certificate 2" }
  ];

  files.forEach(file => {
    const filePath = path.join(testDir, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`Created test file: ${filePath}`);
  });

  return files.map(f => path.join(testDir, f.name));
}

export function validateFileUploadStructure() {
  const requiredDirs = [
    "uploads",
    "uploads/profiles",
    "uploads/documents", 
    "uploads/payments",
    "uploads/wo-completion"
  ];

  let allGood = true;
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`❌ Missing directory: ${dir}`);
      allGood = false;
    } else {
      console.log(`✅ Directory exists: ${dir}`);
    }
  });

  return allGood;
}

export function checkFileReferences(technicianProfile) {
  const issues = [];
  
  if (technicianProfile.photoUrl) {
    const path = technicianProfile.photoUrl.replace('/uploads/', '');
    if (!fs.existsSync(`uploads/${path}`)) {
      issues.push(`Missing photo: ${technicianProfile.photoUrl}`);
    }
  }

  if (technicianProfile.idCardUrl) {
    const path = technicianProfile.idCardUrl.replace('/uploads/', '');
    if (!fs.existsSync(`uploads/${path}`)) {
      issues.push(`Missing ID card: ${technicianProfile.idCardUrl}`);
    }
  }

  if (technicianProfile.residencePermitUrl) {
    const path = technicianProfile.residencePermitUrl.replace('/uploads/', '');
    if (!fs.existsSync(`uploads/${path}`)) {
      issues.push(`Missing residence permit: ${technicianProfile.residencePermitUrl}`);
    }
  }

  if (technicianProfile.degreesUrl) {
    try {
      const degrees = typeof technicianProfile.degreesUrl === 'string' 
        ? JSON.parse(technicianProfile.degreesUrl) 
        : technicianProfile.degreesUrl;
        
      if (Array.isArray(degrees)) {
        degrees.forEach((degree, index) => {
          const url = degree.url || degree;
          if (url && url.includes('/uploads/')) {
            const path = url.replace('/uploads/', '');
            if (!fs.existsSync(`uploads/${path}`)) {
              issues.push(`Missing degree ${index + 1}: ${url}`);
            }
          }
        });
      }
    } catch (e) {
      issues.push(`Error parsing degrees: ${e.message}`);
    }
  }

  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🧪 Running file upload validation...");
  console.log("Directory structure:");
  validateFileUploadStructure();
  
  console.log("\nCreating test files:");
  createTestFiles();
}
