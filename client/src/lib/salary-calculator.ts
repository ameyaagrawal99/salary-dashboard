import {
  PAY_MATRIX,
  ACADEMIC_LEVELS,
  type CityType,
  type FinancialStrategy,
  type MultiplierMethod,
  HRA_RATES,
  TA_RATES,
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
