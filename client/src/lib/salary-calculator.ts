import {
  PAY_MATRIX,
  ACADEMIC_LEVELS,
  type CityType,
  type FinancialStrategy,
  type MultiplierMethod,
  HRA_RATES,
  TA_RATES,
  DESIGNATION_SALARY_RANGES,
  WPU_SALARY_BANDS,
  PHD_TIER_INCREMENTS,
  ADDITIONAL_QUALIFICATIONS,
  MAX_TOTAL_INCREMENTS,
  ASSOC_PROF_EXPERIENCE_THRESHOLD,
  WPU_CELL_INCREMENT_RATE,
  type OfferDesignation,
  type PhDTier,
} from './ugc-data';
import type { HraConfig, PositionPremiumRange, PositionSalaryCap, EnforcementMode } from './settings-context';

export interface Benefits {
  housing: number;
  professionalDev: number;
  ppfPercent: number;
  gratuityPercent: number;
  healthInsurance: number;
}

export interface UGCSalaryBreakdown {
  basic: number;
  da: number;
  hra: number;
  hraMode: 'percent' | 'lumpsum' | 'none';
  ta: number;
  specialAllowance: number;
  totalMonthly: number;
  totalAnnual: number;
}

export interface EnforcementStatus {
  salaryCapped: boolean;
  salaryBelowMin: boolean;
  ctcCapped: boolean;
  premiumBelowMin: boolean;
  premiumAboveMax: boolean;
  originalSalaryAnnual: number;
  originalCTCAnnual: number;
}

export interface WPUSalaryBreakdown {
  basic: number;
  da: number;
  hra: number;
  hraMode: 'percent' | 'lumpsum' | 'none';
  ta: number;
  specialAllowance: number;
  multiplierBonus: number;
  premiumMonthly: number;
  totalSalaryMonthly: number;
  totalSalaryAnnual: number;
  benefits: BenefitsBreakdown;
  totalCTCMonthly: number;
  totalCTCAnnual: number;
  method: MultiplierMethod;
  strategy: FinancialStrategy;
  enforcement: EnforcementStatus;
}

export interface BenefitsBreakdown {
  housing: number;
  professionalDev: number;
  ppfAmount: number;
  gratuityAmount: number;
  healthInsurance: number;
  totalMonthly: number;
  totalAnnual: number;
}

export interface ComparisonResult {
  ugc: UGCSalaryBreakdown;
  wpu: WPUSalaryBreakdown;
  premiumAmountMonthly: number;
  premiumAmountAnnual: number;
  premiumPercentage: number;
}

export interface EighthCPCSalaryBreakdown {
  fitmentFactor: number;
  seventhBasic: number;
  basic: number;
  da: number;
  hra: number;
  hraMode: 'percent' | 'lumpsum' | 'none';
  ta: number;
  specialAllowance: number;
  totalMonthly: number;
  totalAnnual: number;
  incrementOverSeventhPercent: number;
}

export function getCellAmount(level: string, cellIndex: number): number {
  const cells = PAY_MATRIX[level];
  if (!cells || cellIndex < 0 || cellIndex >= cells.length) return 0;
  return cells[cellIndex];
}

export function getCellsForLevel(level: string): { cell: number; amount: number; experience: string }[] {
  const cells = PAY_MATRIX[level];
  if (!cells) return [];
  return cells.map((amount, idx) => ({
    cell: idx + 1,
    amount,
    experience: `${idx} yr${idx !== 1 ? 's' : ''} exp`
  }));
}

export function suggestCellFromExperience(level: string, yearsOfExperience: number): number {
  const cells = PAY_MATRIX[level];
  if (!cells) return 0;
  const cellIndex = Math.min(yearsOfExperience, cells.length - 1);
  return Math.max(0, cellIndex);
}

export function getLevelInfo(level: string) {
  return ACADEMIC_LEVELS.find(l => l.level === level);
}

export function calculateDA(basic: number, daPercent: number): number {
  return Math.round(basic * (daPercent / 100));
}

export function calculateHRA(basic: number, cityType: CityType, hraConfig?: HraConfig): { amount: number; mode: 'percent' | 'lumpsum' | 'none' } {
  if (hraConfig) {
    if (hraConfig.providingHousing && !hraConfig.stillProvideHra) {
      return { amount: 0, mode: 'none' };
    }
    if (hraConfig.hraMode === 'lumpsum') {
      return { amount: hraConfig.lumpSumValue, mode: 'lumpsum' };
    }
  }
  const rate = HRA_RATES[cityType].rate;
  return { amount: Math.round(basic * (rate / 100)), mode: 'percent' };
}

export function calculateTA(level: string, daPercent: number, isTPTACity: boolean = false): number {
  const levelNum = level === "13A" ? 13 : parseInt(level);
  let taBase: number;

  if (levelNum >= 9) {
    taBase = isTPTACity ? TA_RATES.level9Plus.tptaCity : TA_RATES.level9Plus.otherCity;
  } else if (levelNum >= 3) {
    taBase = isTPTACity ? TA_RATES.level3to8.tptaCity : TA_RATES.level3to8.otherCity;
  } else {
    taBase = isTPTACity ? TA_RATES.level1to2.tptaCity : TA_RATES.level1to2.otherCity;
  }

  const daOnTA = Math.round(taBase * (daPercent / 100));
  return taBase + daOnTA;
}

export function calculateUGCSalary(
  basic: number,
  daPercent: number,
  cityType: CityType,
  level: string,
  specialAllowance: number = 0,
  isTPTACity: boolean = false,
  hraConfig?: HraConfig
): UGCSalaryBreakdown {
  const da = calculateDA(basic, daPercent);
  const hraResult = calculateHRA(basic, cityType, hraConfig);
  const ta = calculateTA(level, daPercent, isTPTACity);
  const totalMonthly = basic + da + hraResult.amount + ta + specialAllowance;

  return {
    basic,
    da,
    hra: hraResult.amount,
    hraMode: hraResult.mode,
    ta,
    specialAllowance,
    totalMonthly,
    totalAnnual: totalMonthly * 12
  };
}

export function calculateBenefits(basic: number, benefits: Benefits): BenefitsBreakdown {
  const ppfAmount = Math.round(basic * (benefits.ppfPercent / 100));
  const gratuityAmount = Math.round(basic * (benefits.gratuityPercent / 100));

  const totalMonthly = benefits.housing + benefits.professionalDev + ppfAmount + gratuityAmount + benefits.healthInsurance;

  return {
    housing: benefits.housing,
    professionalDev: benefits.professionalDev,
    ppfAmount,
    gratuityAmount,
    healthInsurance: benefits.healthInsurance,
    totalMonthly,
    totalAnnual: totalMonthly * 12
  };
}

export function calculateWPUSalary(
  ugcSalary: UGCSalaryBreakdown,
  multiplier: number,
  annualPremium: number,
  strategy: FinancialStrategy,
  method: MultiplierMethod,
  benefits: Benefits,
  daPercent: number,
  cityType: CityType,
  level: string,
  specialAllowance: number = 0,
  isTPTACity: boolean = false,
  hraConfig?: HraConfig,
  enforcementMode: EnforcementMode = 'soft',
  premiumRange?: PositionPremiumRange,
  salaryCap?: PositionSalaryCap
): WPUSalaryBreakdown {
  let wpuBasic: number;
  let wpuDA: number;
  let wpuHRA: number;
  let hraMode: 'percent' | 'lumpsum' | 'none' = ugcSalary.hraMode;
  let wpuTA: number;
  let multiplierBonus: number;

  if (method === 'methodA') {
    wpuBasic = ugcSalary.basic;
    wpuDA = ugcSalary.da;
    const hraResult = calculateHRA(ugcSalary.basic, cityType, hraConfig);
    wpuHRA = hraResult.amount;
    hraMode = hraResult.mode;
    wpuTA = ugcSalary.ta;
    const baseSalaryForMultiplier = wpuBasic + wpuDA + wpuHRA + wpuTA + specialAllowance;
    multiplierBonus = Math.round(baseSalaryForMultiplier * (multiplier - 1.0));
  } else {
    wpuBasic = Math.round(ugcSalary.basic * multiplier);
    wpuDA = calculateDA(wpuBasic, daPercent);
    const hraResult = calculateHRA(wpuBasic, cityType, hraConfig);
    wpuHRA = hraResult.amount;
    hraMode = hraResult.mode;
    wpuTA = calculateTA(level, daPercent, isTPTACity);
    multiplierBonus = 0;
  }

  const baseSalaryMonthly = wpuBasic + wpuDA + wpuHRA + wpuTA + specialAllowance + multiplierBonus;
  const premiumMonthly = Math.round(annualPremium / 12);

  const multiplierResult = baseSalaryMonthly;
  const premiumResult = ugcSalary.totalMonthly + premiumMonthly;

  let totalSalaryMonthly: number;
  let actualMultiplierBonus = multiplierBonus;
  let actualPremiumMonthly = premiumMonthly;

  switch (strategy) {
    case 'multiplier':
      totalSalaryMonthly = multiplierResult;
      actualPremiumMonthly = 0;
      break;
    case 'premium':
      totalSalaryMonthly = premiumResult;
      actualMultiplierBonus = 0;
      if (method === 'methodB') {
        wpuBasic = ugcSalary.basic;
        wpuDA = ugcSalary.da;
        wpuHRA = ugcSalary.hra;
        hraMode = ugcSalary.hraMode;
        wpuTA = ugcSalary.ta;
      }
      break;
    case 'both':
      totalSalaryMonthly = baseSalaryMonthly + premiumMonthly;
      break;
    case 'higher':
      if (multiplierResult >= premiumResult) {
        totalSalaryMonthly = multiplierResult;
        actualPremiumMonthly = 0;
      } else {
        totalSalaryMonthly = premiumResult;
        actualMultiplierBonus = 0;
        if (method === 'methodB') {
          wpuBasic = ugcSalary.basic;
          wpuDA = ugcSalary.da;
          wpuHRA = ugcSalary.hra;
          hraMode = ugcSalary.hraMode;
          wpuTA = ugcSalary.ta;
        }
      }
      break;
    case 'lower':
      if (multiplierResult <= premiumResult) {
        totalSalaryMonthly = multiplierResult;
        actualPremiumMonthly = 0;
      } else {
        totalSalaryMonthly = premiumResult;
        actualMultiplierBonus = 0;
        if (method === 'methodB') {
          wpuBasic = ugcSalary.basic;
          wpuDA = ugcSalary.da;
          wpuHRA = ugcSalary.hra;
          hraMode = ugcSalary.hraMode;
          wpuTA = ugcSalary.ta;
        }
      }
      break;
  }

  const benefitsBreakdown = calculateBenefits(wpuBasic, benefits);

  let totalCTCMonthly = totalSalaryMonthly + benefitsBreakdown.totalMonthly;

  const originalSalaryAnnual = totalSalaryMonthly * 12;
  const originalCTCAnnual = totalCTCMonthly * 12;

  let salaryCapped = false;
  let salaryBelowMin = false;
  let ctcCapped = false;
  let premiumBelowMin = false;
  let premiumAboveMax = false;

  if (premiumRange) {
    if (premiumRange.maxPremium > 0 && annualPremium > premiumRange.maxPremium) {
      premiumAboveMax = true;
    }
    if (premiumRange.minPremium > 0 && annualPremium < premiumRange.minPremium) {
      premiumBelowMin = true;
    }
  }

  if (salaryCap) {
    if (salaryCap.minWPUSalaryAnnual > 0 && totalSalaryMonthly * 12 < salaryCap.minWPUSalaryAnnual) {
      salaryBelowMin = true;
    }
    if (salaryCap.maxWPUSalaryAnnual > 0 && totalSalaryMonthly * 12 > salaryCap.maxWPUSalaryAnnual) {
      salaryCapped = true;
    }

    const computedMaxCTC = salaryCap.maxWPUCTCAnnual > 0
      ? salaryCap.maxWPUCTCAnnual
      : (salaryCap.maxWPUSalaryAnnual > 0 ? salaryCap.maxWPUSalaryAnnual + benefitsBreakdown.totalAnnual : 0);

    if (computedMaxCTC > 0 && totalCTCMonthly * 12 > computedMaxCTC) {
      ctcCapped = true;
    }

    if (enforcementMode === 'hard') {
      if (salaryCapped) {
        totalSalaryMonthly = Math.round(salaryCap.maxWPUSalaryAnnual / 12);
      }
      totalCTCMonthly = totalSalaryMonthly + benefitsBreakdown.totalMonthly;
      if (computedMaxCTC > 0 && totalCTCMonthly * 12 > computedMaxCTC) {
        totalCTCMonthly = Math.round(computedMaxCTC / 12);
        ctcCapped = true;
      }
    }
  }

  return {
    basic: wpuBasic,
    da: wpuDA,
    hra: wpuHRA,
    hraMode,
    ta: wpuTA,
    specialAllowance,
    multiplierBonus: actualMultiplierBonus,
    premiumMonthly: actualPremiumMonthly,
    totalSalaryMonthly,
    totalSalaryAnnual: totalSalaryMonthly * 12,
    benefits: benefitsBreakdown,
    totalCTCMonthly,
    totalCTCAnnual: totalCTCMonthly * 12,
    method,
    strategy,
    enforcement: {
      salaryCapped,
      salaryBelowMin,
      ctcCapped,
      premiumBelowMin,
      premiumAboveMax,
      originalSalaryAnnual,
      originalCTCAnnual,
    }
  };
}

export function calculateComparison(
  level: string,
  cellIndex: number,
  daPercent: number,
  cityType: CityType,
  multiplier: number,
  annualPremium: number,
  strategy: FinancialStrategy,
  method: MultiplierMethod,
  benefits: Benefits,
  specialAllowance: number = 0,
  isTPTACity: boolean = false,
  hraConfig?: HraConfig,
  enforcementMode: EnforcementMode = 'soft',
  premiumRange?: PositionPremiumRange,
  salaryCap?: PositionSalaryCap
): ComparisonResult {
  const basic = getCellAmount(level, cellIndex);

  const ugc = calculateUGCSalary(basic, daPercent, cityType, level, specialAllowance, isTPTACity);
  const wpu = calculateWPUSalary(ugc, multiplier, annualPremium, strategy, method, benefits, daPercent, cityType, level, specialAllowance, isTPTACity, hraConfig, enforcementMode, premiumRange, salaryCap);

  const premiumAmountMonthly = wpu.totalCTCMonthly - ugc.totalMonthly;
  const premiumAmountAnnual = premiumAmountMonthly * 12;
  const premiumPercentage = ugc.totalMonthly > 0 ? (premiumAmountMonthly / ugc.totalMonthly) * 100 : 0;

  return {
    ugc,
    wpu,
    premiumAmountMonthly,
    premiumAmountAnnual,
    premiumPercentage
  };
}

export function calculate8thCPCSalary(
  seventhBasic: number,
  fitmentFactor: number,
  daPercent: number,
  cityType: CityType,
  level: string,
  specialAllowance: number = 0,
  isTPTACity: boolean = false,
  hraConfig?: HraConfig,
  seventhTotalMonthly: number = 0
): EighthCPCSalaryBreakdown {
  const basic = Math.round(seventhBasic * fitmentFactor);
  const da = calculateDA(basic, daPercent);
  const hraResult = calculateHRA(basic, cityType, hraConfig);
  const ta = calculateTA(level, daPercent, isTPTACity);
  const totalMonthly = basic + da + hraResult.amount + ta + specialAllowance;
  const incrementOverSeventhPercent = seventhTotalMonthly > 0
    ? ((totalMonthly - seventhTotalMonthly) / seventhTotalMonthly) * 100
    : 0;

  return {
    fitmentFactor,
    seventhBasic,
    basic,
    da,
    hra: hraResult.amount,
    hraMode: hraResult.mode,
    ta,
    specialAllowance,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
    incrementOverSeventhPercent,
  };
}

export function formatCurrency(amount: number, compact: boolean = false): string {
  if (compact) {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toLocaleString('en-IN');
  }
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatCurrencyINR(amount: number): string {
  return `₹${formatCurrency(amount)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFER DECISION CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateProfile {
  isFresher: boolean;
  yearsExperience: number;
  currentBasicMonthly: number;   // monthly basic pay at current employer; 0 for fresher
  designation: OfferDesignation;
  phdTier: PhDTier;
  additionalQualIds: string[];   // from ADDITIONAL_QUALIFICATIONS.id
}

export interface OfferBreakdown {
  grossAnnual: number;
  basicMonthly: number;
  daMonthly: number;
  hraMonthly: number;
  grossMonthly: number;
  ppfAnnual: number;
  gratuityAnnual: number;
  perksAnnual: number;
  ctcAnnual: number;
  hraIncluded: boolean;
}

export interface OfferDecisionResult {
  recommendedGrossAnnual: number;
  breakdown: OfferBreakdown;
  // Decision trail — for the management Offer Worksheet
  bandLabel: string;
  phdIncrements: number;
  additionalIncrements: number;
  totalIncrements: number;
  incrementPercent: number;
  hikeFloorGrossAnnual: number;   // 0 if fresher
  hikeFloorWasApplied: boolean;
  // Analytics
  positionInRangePercent: number; // 0–100
  withinRange: boolean;
  isCapped: boolean;
  isTBD: boolean;
  isAssocProfCandidate: boolean;
}

/**
 * Back-calculate basic, DA, and HRA from a target WPU gross salary.
 * When HRA is not included (housing provided as perk), basic absorbs everything.
 */
export function backCalculateFromGross(
  targetGrossAnnual: number,
  daPercent: number,
  hraIncluded: boolean,
  cityType: CityType,
): { basicMonthly: number; daMonthly: number; hraMonthly: number } {
  const daRate = daPercent / 100;
  const hraRate = hraIncluded ? HRA_RATES[cityType].rate / 100 : 0;
  const basicMonthly = Math.round(targetGrossAnnual / ((1 + daRate + hraRate) * 12));
  const daMonthly = Math.round(basicMonthly * daRate);
  const hraMonthly = Math.round(basicMonthly * hraRate);
  return { basicMonthly, daMonthly, hraMonthly };
}

/**
 * Compute the WPU gross salary for a given number of quality increments applied
 * to a band's minimum. Each increment multiplies the running total by (1 + incrementPercent/100),
 * capped at the band maximum. Excess increments carry the candidate upward through subsequent bands.
 *
 * @param designation  - used to find the right sequence of bands
 * @param bandMinGross - starting gross for the candidate's experience band
 * @param totalIncrements - number of quality increments to apply
 * @param incrementPercent - percentage per step (e.g. 20 for 20%)
 * @param designationMaxGross - hard ceiling from the designation range
 */
export function computeSlabGross(
  bandMinGross: number,
  totalIncrements: number,
  incrementPercent: number,
  designationMaxGross: number,
): number {
  let result = bandMinGross;
  const factor = 1 + incrementPercent / 100;
  for (let i = 0; i < totalIncrements; i++) {
    result = Math.round(result * factor);
    if (result >= designationMaxGross) return designationMaxGross;
  }
  return result;
}

/** Build the OfferBreakdown from a final gross and supporting parameters */
function buildBreakdown(
  grossAnnual: number,
  daPercent: number,
  hraIncluded: boolean,
  cityType: CityType,
  ppfPercent: number,
  gratuityPercent: number,
  perksAnnual: number,
): OfferBreakdown {
  const { basicMonthly, daMonthly, hraMonthly } = backCalculateFromGross(
    grossAnnual, daPercent, hraIncluded, cityType,
  );
  const grossMonthly = basicMonthly + daMonthly + hraMonthly;
  const ppfAnnual = Math.round(basicMonthly * 12 * (ppfPercent / 100));
  const gratuityAnnual = Math.round(basicMonthly * 12 * (gratuityPercent / 100));
  const ctcAnnual = grossAnnual + ppfAnnual + gratuityAnnual + perksAnnual;
  return {
    grossAnnual,
    basicMonthly,
    daMonthly,
    hraMonthly,
    grossMonthly,
    ppfAnnual,
    gratuityAnnual,
    perksAnnual,
    ctcAnnual,
    hraIncluded,
  };
}

/**
 * Main offer decision calculator.
 *
 * Algorithm:
 *  1. Find the designation range; return isTBD if not yet configured.
 *  2. Flag if candidate experience ≥ 12 years (Assoc Prof threshold).
 *  3. Find the WPU salary band for the candidate's experience level.
 *  4. Resolve total quality increments (PhD tier + additional, capped at MAX_TOTAL_INCREMENTS).
 *  5. Compute band-based gross using computeSlabGross().
 *  6. For experienced candidates, compute the hike floor gross.
 *  7. Recommended gross = max(band gross, hike floor); clamp to designation max.
 *  8. Back-calculate salary breakdown and compute CTC.
 */
export function calculateOfferDecision(
  candidate: CandidateProfile,
  incrementPercent: number,
  hikePercent: number,
  daPercent: number,
  hraIncluded: boolean,
  cityType: CityType,
  ppfPercent: number,
  gratuityPercent: number,
): OfferDecisionResult {
  const range = DESIGNATION_SALARY_RANGES.find(r => r.designation === candidate.designation);
  if (!range || range.minGrossAnnual === 0) {
    const fallback = buildBreakdown(0, daPercent, hraIncluded, cityType, ppfPercent, gratuityPercent, 0);
    return {
      recommendedGrossAnnual: 0,
      breakdown: fallback,
      bandLabel: '—',
      phdIncrements: 0,
      additionalIncrements: 0,
      totalIncrements: 0,
      incrementPercent,
      hikeFloorGrossAnnual: 0,
      hikeFloorWasApplied: false,
      positionInRangePercent: 0,
      withinRange: false,
      isCapped: false,
      isTBD: true,
      isAssocProfCandidate: candidate.yearsExperience >= ASSOC_PROF_EXPERIENCE_THRESHOLD,
    };
  }

  const isAssocProfCandidate = candidate.yearsExperience >= ASSOC_PROF_EXPERIENCE_THRESHOLD;

  // Find the appropriate band for this designation and experience
  const designationBands = WPU_SALARY_BANDS.filter(b => b.designation === candidate.designation);
  let band = designationBands.find(
    b => candidate.yearsExperience >= b.minYearsExp && candidate.yearsExperience < b.maxYearsExp,
  );
  // If experience exceeds all defined bands, use the highest band available
  if (!band && designationBands.length > 0) {
    band = designationBands[designationBands.length - 1];
  }

  const bandLabel = band?.label ?? '—';
  const bandMinGross = band?.minGrossAnnual ?? range.minGrossAnnual;

  // Resolve quality increments
  const phdIncrements = PHD_TIER_INCREMENTS[candidate.phdTier] ?? 0;
  const additionalIncrements = candidate.additionalQualIds.reduce((sum, id) => {
    const qual = ADDITIONAL_QUALIFICATIONS.find(q => q.id === id);
    return sum + (qual?.increments ?? 0);
  }, 0);
  const totalIncrements = Math.min(phdIncrements + additionalIncrements, MAX_TOTAL_INCREMENTS);

  // Compute slab gross from band placement + quality increments
  const bandGross = computeSlabGross(bandMinGross, totalIncrements, incrementPercent, range.maxGrossAnnual);

  // Compute hike floor for experienced candidates
  let hikeFloorGrossAnnual = 0;
  let hikeFloorWasApplied = false;
  if (!candidate.isFresher && candidate.currentBasicMonthly > 0) {
    const newBasicMonthly = Math.round(candidate.currentBasicMonthly * (1 + hikePercent / 100));
    const newDaMonthly = Math.round(newBasicMonthly * (daPercent / 100));
    hikeFloorGrossAnnual = (newBasicMonthly + newDaMonthly) * 12;
  }

  let recommendedGrossAnnual = Math.max(bandGross, hikeFloorGrossAnnual);
  if (hikeFloorGrossAnnual > bandGross) hikeFloorWasApplied = true;

  // Enforce designation minimum and maximum
  recommendedGrossAnnual = Math.max(recommendedGrossAnnual, range.minGrossAnnual);
  const isCapped = recommendedGrossAnnual > range.maxGrossAnnual;
  recommendedGrossAnnual = Math.min(recommendedGrossAnnual, range.maxGrossAnnual);

  const rangeSpan = range.maxGrossAnnual - range.minGrossAnnual;
  const positionInRangePercent = rangeSpan > 0
    ? Math.round(((recommendedGrossAnnual - range.minGrossAnnual) / rangeSpan) * 100)
    : 0;

  const breakdown = buildBreakdown(
    recommendedGrossAnnual, daPercent, hraIncluded, cityType,
    ppfPercent, gratuityPercent, range.additionalPerksAnnual,
  );

  return {
    recommendedGrossAnnual,
    breakdown,
    bandLabel,
    phdIncrements,
    additionalIncrements,
    totalIncrements,
    incrementPercent,
    hikeFloorGrossAnnual,
    hikeFloorWasApplied,
    positionInRangePercent,
    withinRange: !isCapped && recommendedGrossAnnual >= range.minGrossAnnual,
    isCapped,
    isTBD: false,
    isAssocProfCandidate,
  };
}

// ─── WPU Pay Scale Reference Table ───────────────────────────────────────────

/** One cell in the WPU pay scale (mirrors a single UGC pay matrix cell) */
export interface WpuPayScaleCell {
  cellNumber: number;
  basicMonthly: number;
  daMonthly: number;
  hraMonthly: number;
  wpuGrossAnnual: number;
  band: string;   // e.g. 'Band 1 — Entry (L10)' or '—' if outside defined bands
}

/**
 * Generate the WPU pay scale reference table using UGC-style 3% cell progression.
 *
 * Algorithm:
 *  1. Back-calculate the entry basic from WPU minimum gross (₹15L for Asst Prof).
 *  2. Apply WPU_CELL_INCREMENT_RATE (3%) per cell iteratively — mirrors UGC progression.
 *  3. For each cell, compute WPU gross and determine which band it falls into.
 *  4. Stop when gross exceeds the designation maximum (₹28L for Asst Prof).
 *
 * The table updates live with the DA % and HRA settings passed in.
 */
export function generateWpuPayScaleTable(
  daPercent: number,
  hraIncluded: boolean,
  cityType: CityType,
): WpuPayScaleCell[] {
  const apRange = DESIGNATION_SALARY_RANGES.find(r => r.designation === 'assistant_professor');
  if (!apRange || apRange.minGrossAnnual === 0) return [];

  const hraRate = hraIncluded ? (HRA_RATES[cityType]?.rate ?? 0) : 0;
  const daRate = daPercent / 100;

  // Back-calculate entry basic from minimum WPU gross
  const entryBasic = apRange.minGrossAnnual / ((1 + daRate + hraRate) * 12);

  const cells: WpuPayScaleCell[] = [];
  let basicMonthly = entryBasic;
  let cellNumber = 1;

  while (true) {
    const daMonthly = basicMonthly * daRate;
    const hraMonthly = basicMonthly * hraRate;
    const wpuGrossAnnual = Math.round((basicMonthly + daMonthly + hraMonthly) * 12);

    if (wpuGrossAnnual > apRange.maxGrossAnnual) break;

    // Determine which band this cell falls into
    const matchingBand = WPU_SALARY_BANDS.find(
      b => b.designation === 'assistant_professor'
        && wpuGrossAnnual >= b.minGrossAnnual
        && wpuGrossAnnual <= b.maxGrossAnnual,
    );
    const band = matchingBand?.label ?? '—';

    cells.push({
      cellNumber,
      basicMonthly: Math.round(basicMonthly),
      daMonthly: Math.round(daMonthly),
      hraMonthly: Math.round(hraMonthly),
      wpuGrossAnnual,
      band,
    });

    basicMonthly = basicMonthly * (1 + WPU_CELL_INCREMENT_RATE);
    cellNumber++;
  }

  return cells;
}
