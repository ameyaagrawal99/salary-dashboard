import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CityType, FinancialStrategy, MultiplierMethod } from './ugc-data';
import type { Benefits } from './salary-calculator';

export type TooltipMode = 'detailed' | 'concise';
export type EnforcementMode = 'soft' | 'hard';
export type HraMode = 'percent' | 'lumpsum';

export interface LevelBenefits {
  [level: string]: Benefits;
}

export interface PositionBenefits {
  [positionId: number]: Benefits;
}

export interface PositionPremiumRange {
  minPremium: number;
  maxPremium: number;
}

export interface PositionSalaryCap {
  minWPUSalaryAnnual: number;
  maxWPUSalaryAnnual: number;
  maxWPUCTCAnnual: number;
}

export interface HraConfig {
  providingHousing: boolean;
  stillProvideHra: boolean;
  hraMode: HraMode;
  lumpSumValue: number;
}

export interface GlobalSettings {
  multiplierMethod: MultiplierMethod;
  baseMultiplier: number;
  daPercentage: number;
  cityType: CityType;
  isTPTACity: boolean;
  financialStrategy: FinancialStrategy;
  annualPremium: number;
  tooltipMode: TooltipMode;
  globalBenefits: Benefits;
  levelBenefits: LevelBenefits;
  positionBenefits: PositionBenefits;
  enforcementMode: EnforcementMode;
  positionPremiumRanges: Record<number, PositionPremiumRange>;
  positionSalaryCaps: Record<number, PositionSalaryCap>;
  hraConfig: HraConfig;
  eighthCpcFitmentFactor: number;
  eighthCpcDaPercent: number;
  wpuBasePay: '7th' | '8th' | 'both';
}

const DEFAULT_GLOBAL_BENEFITS: Benefits = {
  housing: 36250,
  professionalDev: 8333,
  ppfPercent: 12,
  gratuityPercent: 4.81,
  healthInsurance: 1250,
};

const DEFAULT_LEVEL_BENEFITS: LevelBenefits = {
  "10": { housing: 36250, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
  "11": { housing: 36250, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
  "12": { housing: 36250, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
  "13A": { housing: 40417, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
  "14": { housing: 54167, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
  "15": { housing: 54167, professionalDev: 8333, ppfPercent: 12, gratuityPercent: 4.81, healthInsurance: 1250 },
};

const SETTINGS_VERSION = 7;

const DEFAULT_HRA_CONFIG: HraConfig = {
  providingHousing: true,
  stillProvideHra: false,
  hraMode: 'percent',
  lumpSumValue: 0,
};

const DEFAULT_POSITION_SALARY_CAPS: Record<number, PositionSalaryCap> = {
  1: { minWPUSalaryAnnual: 1500000, maxWPUSalaryAnnual: 2300000, maxWPUCTCAnnual: 0 },
  2: { minWPUSalaryAnnual: 1500000, maxWPUSalaryAnnual: 2300000, maxWPUCTCAnnual: 0 },
  3: { minWPUSalaryAnnual: 1500000, maxWPUSalaryAnnual: 2300000, maxWPUCTCAnnual: 0 },
  4: { minWPUSalaryAnnual: 2200000, maxWPUSalaryAnnual: 3200000, maxWPUCTCAnnual: 0 },
  5: { minWPUSalaryAnnual: 3200000, maxWPUSalaryAnnual: 4200000, maxWPUCTCAnnual: 0 },
  6: { minWPUSalaryAnnual: 3200000, maxWPUSalaryAnnual: 4200000, maxWPUCTCAnnual: 0 },
};

const DEFAULT_SETTINGS: GlobalSettings = {
  multiplierMethod: 'methodA',
  baseMultiplier: 1.3,
  daPercentage: 58,
  cityType: 'Y',
  isTPTACity: false,
  financialStrategy: 'multiplier',
  annualPremium: 300000,
  tooltipMode: 'detailed',
  globalBenefits: DEFAULT_GLOBAL_BENEFITS,
  levelBenefits: DEFAULT_LEVEL_BENEFITS,
  positionBenefits: {},
  enforcementMode: 'soft',
  positionPremiumRanges: {},
  positionSalaryCaps: DEFAULT_POSITION_SALARY_CAPS,
  hraConfig: DEFAULT_HRA_CONFIG,
  eighthCpcFitmentFactor: 2.28,
  eighthCpcDaPercent: 0,
  wpuBasePay: '7th',
};

interface SettingsContextType {
  settings: GlobalSettings;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  getBenefitsForPosition: (positionId: number, level: string) => Benefits;
  setBenefitsForPosition: (positionId: number, benefits: Benefits) => void;
  clearPositionBenefits: (positionId: number) => void;
  getBenefitsSource: (positionId: number, level: string) => 'position' | 'level' | 'global';
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const saved = localStorage.getItem('wpu-goa-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedVersion = parseInt(localStorage.getItem('wpu-goa-settings-version') || '0');
        if (savedVersion >= SETTINGS_VERSION) {
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
        localStorage.removeItem('wpu-goa-settings');
      }
      localStorage.setItem('wpu-goa-settings-version', SETTINGS_VERSION.toString());
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const persist = useCallback((next: GlobalSettings) => {
    try {
      localStorage.setItem('wpu-goa-settings', JSON.stringify(next));
      localStorage.setItem('wpu-goa-settings-version', SETTINGS_VERSION.toString());
    } catch {}
  }, []);

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, [persist]);

  const getBenefitsForPosition = useCallback((positionId: number, level: string): Benefits => {
    if (settings.positionBenefits[positionId]) {
      return settings.positionBenefits[positionId];
    }
    if (settings.levelBenefits[level]) {
      return settings.levelBenefits[level];
    }
    return settings.globalBenefits;
  }, [settings.positionBenefits, settings.levelBenefits, settings.globalBenefits]);

  const setBenefitsForPosition = useCallback((positionId: number, benefits: Benefits) => {
    setSettings(prev => {
      const next = {
        ...prev,
        positionBenefits: { ...prev.positionBenefits, [positionId]: benefits }
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const clearPositionBenefits = useCallback((positionId: number) => {
    setSettings(prev => {
      const { [positionId]: _, ...rest } = prev.positionBenefits;
      const next = { ...prev, positionBenefits: rest };
      persist(next);
      return next;
    });
  }, [persist]);

  const getBenefitsSource = useCallback((positionId: number, level: string): 'position' | 'level' | 'global' => {
    if (settings.positionBenefits[positionId]) return 'position';
    if (settings.levelBenefits[level]) return 'level';
    return 'global';
  }, [settings.positionBenefits, settings.levelBenefits]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.removeItem('wpu-goa-settings'); } catch {}
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      getBenefitsForPosition,
      setBenefitsForPosition,
      clearPositionBenefits,
      getBenefitsSource,
      resetToDefaults
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
