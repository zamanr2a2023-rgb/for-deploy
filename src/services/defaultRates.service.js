/** @format */

// src/services/defaultRates.service.js
// Single source for default commission, bonus, and base salary when creating/updating technician profiles.
// Uses RateStructure (isDefault=true) first, then SystemConfig, then fallback constants.

import { prisma } from "../prisma.js";

const FALLBACK_COMMISSION = 0.05;
const FALLBACK_BONUS = 0.05;
const FALLBACK_BASE_SALARY = 0;

/**
 * Get default commission rate for FREELANCER technicians.
 * Priority: RateStructure (COMMISSION + FREELANCER + isDefault) → SystemConfig.freelancerCommissionRate → 0.05
 */
export async function getDefaultCommissionRate() {
  const rateStruct = await prisma.rateStructure.findFirst({
    where: {
      type: "COMMISSION",
      techType: "FREELANCER",
      isDefault: true,
    },
  });
  if (rateStruct != null) return rateStruct.rate;

  const config = await prisma.systemConfig.findFirst({
    orderBy: { id: "asc" },
  });
  if (
    config?.freelancerCommissionRate != null &&
    config.freelancerCommissionRate !== undefined
  ) {
    return config.freelancerCommissionRate;
  }
  return FALLBACK_COMMISSION;
}

/**
 * Get default bonus rate for INTERNAL technicians.
 * Priority: RateStructure (BONUS + INTERNAL + isDefault) → SystemConfig.internalEmployeeBonusRate → 0.05
 */
export async function getDefaultBonusRate() {
  const rateStruct = await prisma.rateStructure.findFirst({
    where: {
      type: "BONUS",
      techType: "INTERNAL",
      isDefault: true,
    },
  });
  if (rateStruct != null) return rateStruct.rate;

  const config = await prisma.systemConfig.findFirst({
    orderBy: { id: "asc" },
  });
  if (
    config?.internalEmployeeBonusRate != null &&
    config.internalEmployeeBonusRate !== undefined
  ) {
    return config.internalEmployeeBonusRate;
  }
  return FALLBACK_BONUS;
}

/**
 * Get default base salary for INTERNAL technicians.
 * Source: SystemConfig.internalEmployeeBaseSalary only (RateStructure has no base salary).
 */
export async function getDefaultBaseSalary() {
  const config = await prisma.systemConfig.findFirst({
    orderBy: { id: "asc" },
  });
  if (
    config?.internalEmployeeBaseSalary != null &&
    config.internalEmployeeBaseSalary !== undefined
  ) {
    return config.internalEmployeeBaseSalary;
  }
  return FALLBACK_BASE_SALARY;
}

/**
 * Get all default rates for creating a new technician profile.
 * @param { 'FREELANCER' | 'INTERNAL' } techType
 * @returns { Promise<{ commissionRate: number, bonusRate: number, baseSalary: number | null }> }
 */
export async function getDefaultRatesForNewTechnician(techType) {
  const isInternal = techType === "INTERNAL";
  const [commissionRate, bonusRate, baseSalary] = await Promise.all([
    getDefaultCommissionRate(),
    getDefaultBonusRate(),
    isInternal ? getDefaultBaseSalary() : Promise.resolve(null),
  ]);
  return {
    commissionRate,
    bonusRate,
    baseSalary: isInternal ? baseSalary : null,
  };
}
