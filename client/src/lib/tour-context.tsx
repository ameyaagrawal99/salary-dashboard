import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;          // matches data-tour-id on the DOM element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  navigateTo?: string;        // wouter path to navigate before showing this step
  scrollIntoView?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the WPU GOA Salary Calculator!',
    description:
      'This tool helps you understand, calculate, and compare faculty compensation — from standard UGC 7th CPC pay to WPU GOA\'s enhanced salary packages. This quick walkthrough will take you through every feature. Click Next to begin.',
    position: 'center',
    navigateTo: '/',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description:
      'Use these three tabs to switch between views: Calculator for individual salary calculations, All Positions for a side-by-side comparison across all faculty levels, and Bulk Hiring for estimating total staffing costs.',
    targetId: 'tour-nav',
    position: 'bottom',
    navigateTo: '/',
  },
  {
    id: 'position-experience',
    title: 'Step 1 — Position & Experience',
    description:
      'Start by selecting the faculty position (e.g., Assistant Professor Level 10) and drag the experience slider. The Pay Cell updates automatically based on years of service — or you can override it manually from the dropdown.',
    targetId: 'tour-position-experience',
    position: 'right',
    scrollIntoView: true,
  },
  {
    id: 'allowances',
    title: 'Step 2 — Allowances',
    description:
      'Set the Dearness Allowance (DA) percentage — currently 58% for central government employees. Click "DA History" to see how DA has changed over time. Also select the city classification (X/Y/Z) which determines the House Rent Allowance (HRA) rate.',
    targetId: 'tour-allowances',
    position: 'right',
    scrollIntoView: true,
  },
  {
    id: 'financial-strategy',
    title: 'Step 3 — Financial Strategy',
    description:
      'Choose how WPU GOA\'s salary premium is structured. The Multiplier strategy applies a fixed factor to the UGC base pay. Percentage and Absolute strategies add a premium on top. Hybrid combines both. Adjust the multiplier or annual premium amount to model different offers.',
    targetId: 'tour-financial-strategy',
    position: 'right',
    scrollIntoView: true,
  },
  {
    id: 'benefits',
    title: 'Step 4 — Benefits Package',
    description:
      'Add benefits that form part of the Cost-to-Company (CTC): housing allowance, professional development, PPF, gratuity, and health insurance. These can be set globally in Settings or customised per position here.',
    targetId: 'tour-benefits',
    position: 'right',
    scrollIntoView: true,
  },
  {
    id: 'salary-results',
    title: 'Step 5 — Salary Results',
    description:
      'This panel shows a live comparison: the UGC 7th CPC monthly pay vs the WPU GOA salary and full CTC. The green badge at the bottom shows the premium WPU GOA pays over UGC — both as an amount and a percentage.',
    targetId: 'tour-salary-results',
    position: 'left',
    scrollIntoView: true,
  },
  {
    id: 'breakdown',
    title: 'Step 6 — Detailed Breakdown',
    description:
      'Dig into every salary component side by side. Toggle between Monthly and Annual views. Use the tabs to see a combined comparison, UGC-only, or WPU GOA-only breakdown including Basic Pay, DA, HRA, Transport Allowance, Multiplier Bonus, and all benefits.',
    targetId: 'tour-breakdown',
    position: 'left',
    scrollIntoView: true,
  },
  {
    id: 'chart',
    title: 'Step 7 — Salary Composition Chart',
    description:
      'This donut chart visualises how the WPU GOA salary is composed. Hover over segments to see exact amounts for Basic Pay, DA, HRA, Transport, Multiplier Bonus, Premium, and Benefits.',
    targetId: 'tour-chart',
    position: 'left',
    scrollIntoView: true,
  },
  {
    id: 'comparison-page',
    title: 'Step 8 — Compare All Positions',
    description:
      'The All Positions page shows all 8 faculty levels simultaneously. Use the filter to show or hide specific positions. The bar chart and table let you instantly compare UGC vs WPU GOA salaries and the premium for each role.',
    targetId: 'tour-comparison-chart',
    position: 'bottom',
    navigateTo: '/comparison',
    scrollIntoView: true,
  },
  {
    id: 'bulk-hiring',
    title: 'Step 9 — Bulk Hiring Calculator',
    description:
      'Planning to hire multiple faculty members? Add positions here, set the count and experience, and the calculator instantly shows the total UGC cost vs total WPU GOA CTC across your entire hiring plan.',
    targetId: 'tour-bulk-stats',
    position: 'bottom',
    navigateTo: '/bulk-hiring',
    scrollIntoView: true,
  },
  {
    id: 'settings',
    title: 'Step 10 — Settings',
    description:
      'Click the Settings icon to configure global defaults: DA rate, city type, enforcement rules (soft/hard salary caps), HRA mode, and per-position premium ranges. Changes here apply across the whole tool.',
    targetId: 'tour-settings-button',
    position: 'bottom',
    navigateTo: '/',
    scrollIntoView: true,
  },
  {
    id: 'done',
    title: "You're all set!",
    description:
      'That covers every feature of the WPU GOA Salary Calculator. You can start the tour again anytime using the "Tour" button in the header. Happy calculating!',
    position: 'center',
  },
];

interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children, onNavigate }: { children: ReactNode; onNavigate: (path: string) => void }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    const firstStep = TOUR_STEPS[0];
    if (firstStep.navigateTo) onNavigate(firstStep.navigateTo);
  }, [onNavigate]);

  const endTour = useCallback(() => {
    setIsActive(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        setIsActive(false);
        return prev;
      }
      const nextTourStep = TOUR_STEPS[next];
      if (nextTourStep.navigateTo) onNavigate(nextTourStep.navigateTo);
      return next;
    });
  }, [onNavigate]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => {
      const prevIdx = Math.max(0, prev - 1);
      const prevTourStep = TOUR_STEPS[prevIdx];
      if (prevTourStep.navigateTo) onNavigate(prevTourStep.navigateTo);
      return prevIdx;
    });
  }, [onNavigate]);

  const value: TourContextValue = {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep],
    startTour,
    endTour,
    nextStep,
    prevStep,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}
