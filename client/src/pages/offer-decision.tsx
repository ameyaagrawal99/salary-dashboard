import { useState, useMemo, useCallback } from 'react';
import {
  Target, ChevronDown, ChevronUp, AlertTriangle, Info, TrendingUp, BarChart2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/numeric-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useSettings } from '@/lib/settings-context';
import type { EnforcementMode, SalaryInputMode, CalculationMode, MitHybridMode } from '@/lib/settings-context';
import {
  DESIGNATION_SALARY_RANGES,
  PHD_TIER_LABELS,
  PHD_TIER_INCREMENTS,
  ADDITIONAL_QUALIFICATIONS,
  ASSOC_PROF_EXPERIENCE_THRESHOLD,
  type PhDTier,
  type OfferDesignation,
} from '@/lib/ugc-data';
import {
  calculateOfferDecision,
  generateWpuPayScaleTable,
  backCalculateFromGross,
  type CandidateProfile,
  type OfferBreakdown,
} from '@/lib/salary-calculator';

// ─── Local helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtL(n: number): string {
  return `₹${(n / 100000).toFixed(1)}L`;
}

function pct(current: number, offered: number): string {
  if (!current || current <= 0) return '—';
  const delta = ((offered - current) / current) * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

const BAND_ROW_BG: Record<string, string> = {
  'Band 1 — Entry (L10)': 'bg-blue-50 dark:bg-blue-950/30',
  'Band 2 — Senior Scale (L11)': 'bg-violet-50 dark:bg-violet-950/30',
  'Band 3 — Selection Grade (L12)': 'bg-amber-50 dark:bg-amber-950/30',
};

const BAND_BADGE_CLASS: Record<string, string> = {
  'Band 1 — Entry (L10)':
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  'Band 2 — Senior Scale (L11)':
    'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  'Band 3 — Selection Grade (L12)':
    'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
};

// ─── Breakdown display sub-component ──────────────────────────────────────────

function BreakdownDisplay({
  bd, label, daPercent, ppfPercent,
}: {
  bd: OfferBreakdown;
  label: string;
  daPercent: number;
  ppfPercent: number;
}) {
  const rows = [
    { label: 'Basic Pay', monthly: bd.basicMonthly, annual: bd.basicMonthly * 12 },
    { label: `DA (${daPercent}%)`, monthly: bd.daMonthly, annual: bd.daMonthly * 12 },
    ...(bd.hraIncluded ? [{ label: 'HRA', monthly: bd.hraMonthly, annual: bd.hraMonthly * 12 }] : []),
    { label: 'TA (Travel Allowance)', monthly: bd.taMonthly, annual: bd.taMonthly * 12 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-mono font-bold text-xl">{fmt(bd.grossAnnual)} / yr</p>
      </div>

      <div className="font-mono text-xs border rounded-md overflow-hidden">
        {/* Monthly / Annual header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 bg-muted/30 px-3 py-1.5 text-muted-foreground text-[10px] uppercase tracking-wider border-b">
          <span>Component</span>
          <span className="text-right">Monthly</span>
          <span className="text-right">Annual</span>
        </div>

        {/* Basic + DA + HRA + TA rows */}
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1 border-b border-border/40">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-right">{fmt(Math.round(row.monthly))}</span>
            <span className="text-right">{fmt(Math.round(row.annual))}</span>
          </div>
        ))}

        {/* Gross total (Basic+DA+HRA — TA listed separately above for transparency) */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 font-semibold border-b bg-muted/20">
          <span>Gross (Basic+DA{bd.hraIncluded ? '+HRA' : ''})</span>
          <span className="text-right">{fmt(Math.round(bd.grossMonthly))}</span>
          <span className="text-right">{fmt(bd.grossAnnual)}</span>
        </div>

        {/* PPF / Gratuity / Perks */}
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-1 border-b border-border/40 text-muted-foreground">
          <span>PPF ({ppfPercent}% of basic)</span>
          <span className="text-right">{fmt(bd.ppfAnnual)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-1 border-b border-border/40 text-muted-foreground">
          <span>Gratuity (4.81% of basic)</span>
          <span className="text-right">{fmt(bd.gratuityAnnual)}</span>
        </div>
        {bd.perksAnnual > 0 && (
          <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-1 border-b border-border/40 text-muted-foreground">
            <span>Perks (Housing + CPDA + Health)</span>
            <span className="text-right">{fmt(bd.perksAnnual)}</span>
          </div>
        )}

        {/* CTC */}
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-2 font-bold text-sm bg-muted/30">
          <span>Total CTC (incl. TA)</span>
          <span className="text-right">{fmt(bd.ctcAnnual)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function OfferDecisionPage() {
  const { settings, updateSettings } = useSettings();
  const defaults = settings.offerDecisionDefaults;

  // Candidate state
  const [designation, setDesignation] = useState<OfferDesignation>('assistant_professor');
  const [isFresher, setIsFresher] = useState(true);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [phdTier, setPhdTier] = useState<PhDTier>('iit_iisc');
  const [additionalQualIds, setAdditionalQualIds] = useState<string[]>([]);

  // Current salary tab state
  const [salaryInputMode, setSalaryInputMode] = useState<SalaryInputMode>(defaults.salaryInputMode);
  const [currentBasicMonthly, setCurrentBasicMonthly] = useState(50000);
  const [currentGrossMonthly, setCurrentGrossMonthly] = useState(80000);
  const [currentCtcAnnual, setCurrentCtcAnnual] = useState(1200000);

  // Offer settings (synced from saved defaults on mount)
  const [incrementPercent, setIncrementPercent] = useState(defaults.incrementPercent);
  const [hikePercent, setHikePercent] = useState(defaults.hikePercent);
  const [hraIncluded, setHraIncluded] = useState(defaults.hraIncluded);
  const [offerEnforcementMode, setOfferEnforcementMode] = useState<EnforcementMode>(
    defaults.offerEnforcementMode,
  );
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(defaults.calculationMode);
  const [mitHybridMode, setMitHybridMode] = useState<MitHybridMode>(defaults.mitHybridMode);

  // Custom target override
  const [customTargetGross, setCustomTargetGross] = useState(0);
  const [isRefTableOpen, setIsRefTableOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const activeRange = useMemo(
    () => DESIGNATION_SALARY_RANGES.find(r => r.designation === designation),
    [designation],
  );

  const wpuPayScale = useMemo(
    () => generateWpuPayScaleTable(settings.daPercentage, hraIncluded, settings.cityType),
    [settings.daPercentage, hraIncluded, settings.cityType],
  );

  /** Convert whichever salary tab is active → a single annual gross equivalent */
  const currentGrossEquivalentAnnual = useMemo(() => {
    if (isFresher) return 0;
    switch (salaryInputMode) {
      case 'basic':
        return currentBasicMonthly * (1 + settings.daPercentage / 100) * 12;
      case 'gross':
        return currentGrossMonthly * 12;
      case 'ctc': {
        const perks = activeRange?.additionalPerksAnnual ?? 0;
        const benefitRatio =
          (settings.globalBenefits.ppfPercent + settings.globalBenefits.gratuityPercent) / 100
          / (1 + settings.daPercentage / 100);
        return Math.max(0, (currentCtcAnnual - perks) / (1 + benefitRatio));
      }
    }
  }, [
    salaryInputMode, currentBasicMonthly, currentGrossMonthly, currentCtcAnnual,
    isFresher, settings.daPercentage, settings.globalBenefits, activeRange,
  ]);

  const candidate: CandidateProfile = useMemo(() => ({
    isFresher,
    yearsExperience: isFresher ? 0 : yearsExperience,
    currentGrossEquivalentAnnual: isFresher ? 0 : currentGrossEquivalentAnnual,
    designation,
    phdTier,
    additionalQualIds,
  }), [isFresher, yearsExperience, currentGrossEquivalentAnnual, designation, phdTier, additionalQualIds]);

  const result = useMemo(() => calculateOfferDecision(
    candidate,
    incrementPercent,
    hikePercent,
    settings.daPercentage,
    hraIncluded,
    settings.cityType,
    settings.globalBenefits.ppfPercent,
    settings.globalBenefits.gratuityPercent,
    settings.isTPTACity,
    calculationMode,
    mitHybridMode,
    wpuPayScale,
  ), [candidate, incrementPercent, hikePercent, settings, hraIncluded, calculationMode, mitHybridMode, wpuPayScale]);

  const customBreakdown = useMemo((): OfferBreakdown | null => {
    if (!customTargetGross || customTargetGross <= 0) return null;
    const { basicMonthly, daMonthly, hraMonthly } = backCalculateFromGross(
      customTargetGross, settings.daPercentage, hraIncluded, settings.cityType,
    );
    const grossMonthly = basicMonthly + daMonthly + hraMonthly;
    const taMonthly = settings.isTPTACity ? 7200 : 3600;
    const taAnnual = taMonthly * 12;
    const ppfAnnual = Math.round(basicMonthly * 12 * (settings.globalBenefits.ppfPercent / 100));
    const gratuityAnnual = Math.round(
      basicMonthly * 12 * (settings.globalBenefits.gratuityPercent / 100),
    );
    const perksAnnual = activeRange?.additionalPerksAnnual ?? 0;
    return {
      grossAnnual: customTargetGross,
      basicMonthly: Math.round(basicMonthly),
      daMonthly: Math.round(daMonthly),
      hraMonthly: Math.round(hraMonthly),
      taMonthly,
      grossMonthly: Math.round(grossMonthly),
      ppfAnnual,
      gratuityAnnual,
      perksAnnual,
      ctcAnnual: customTargetGross + taAnnual + ppfAnnual + gratuityAnnual + perksAnnual,
      hraIncluded,
    };
  }, [customTargetGross, settings, hraIncluded, activeRange]);

  const customRangePercent = useMemo(() => {
    if (!customTargetGross || !activeRange || activeRange.minGrossAnnual === 0) return 0;
    const span = activeRange.maxGrossAnnual - activeRange.minGrossAnnual;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(100,
      Math.round(((customTargetGross - activeRange.minGrossAnnual) / span) * 100),
    ));
  }, [customTargetGross, activeRange]);

  const isCustomOverRange = Boolean(
    customTargetGross > 0
    && activeRange
    && activeRange.maxGrossAnnual > 0
    && customTargetGross > activeRange.maxGrossAnnual,
  );
  const isCustomUnderRange = Boolean(
    customTargetGross > 0
    && activeRange
    && activeRange.minGrossAnnual > 0
    && customTargetGross < activeRange.minGrossAnnual,
  );

  /** "Current" salary breakdown for analytics — back-calculated from gross equivalent */
  const currentBreakdown = useMemo((): OfferBreakdown | null => {
    if (isFresher || currentGrossEquivalentAnnual <= 0) return null;
    const { basicMonthly, daMonthly, hraMonthly } = backCalculateFromGross(
      currentGrossEquivalentAnnual, settings.daPercentage, hraIncluded, settings.cityType,
    );
    const grossMonthly = basicMonthly + daMonthly + hraMonthly;
    const taMonthly = settings.isTPTACity ? 7200 : 3600;
    const ppfAnnual = Math.round(basicMonthly * 12 * (settings.globalBenefits.ppfPercent / 100));
    const gratuityAnnual = Math.round(basicMonthly * 12 * (settings.globalBenefits.gratuityPercent / 100));
    const perksAnnual = activeRange?.additionalPerksAnnual ?? 0;
    return {
      grossAnnual: Math.round(currentGrossEquivalentAnnual),
      basicMonthly: Math.round(basicMonthly),
      daMonthly: Math.round(daMonthly),
      hraMonthly: Math.round(hraMonthly),
      taMonthly,
      grossMonthly: Math.round(grossMonthly),
      ppfAnnual,
      gratuityAnnual,
      perksAnnual,
      ctcAnnual: Math.round(currentGrossEquivalentAnnual) + taMonthly * 12 + ppfAnnual + gratuityAnnual + perksAnnual,
      hraIncluded,
    };
  }, [isFresher, currentGrossEquivalentAnnual, settings, hraIncluded, activeRange]);

  /** MIT equivalent breakdown for analytics */
  const mitBreakdown = useMemo((): OfferBreakdown | null => {
    if (!result.mitEquivalentGrossAnnual) return null;
    const { basicMonthly, daMonthly, hraMonthly } = backCalculateFromGross(
      result.mitEquivalentGrossAnnual, settings.daPercentage, hraIncluded, settings.cityType,
    );
    const grossMonthly = basicMonthly + daMonthly + hraMonthly;
    const taMonthly = settings.isTPTACity ? 7200 : 3600;
    const ppfAnnual = Math.round(basicMonthly * 12 * (settings.globalBenefits.ppfPercent / 100));
    const gratuityAnnual = Math.round(basicMonthly * 12 * (settings.globalBenefits.gratuityPercent / 100));
    const perksAnnual = activeRange?.additionalPerksAnnual ?? 0;
    return {
      grossAnnual: result.mitEquivalentGrossAnnual,
      basicMonthly: Math.round(basicMonthly),
      daMonthly: Math.round(daMonthly),
      hraMonthly: Math.round(hraMonthly),
      taMonthly,
      grossMonthly: Math.round(grossMonthly),
      ppfAnnual,
      gratuityAnnual,
      perksAnnual,
      ctcAnnual: result.mitEquivalentGrossAnnual + taMonthly * 12 + ppfAnnual + gratuityAnnual + perksAnnual,
      hraIncluded,
    };
  }, [result.mitEquivalentGrossAnnual, settings, hraIncluded, activeRange]);

  const showAnalytics = !isFresher && currentGrossEquivalentAnnual > 0 && !result.isTBD;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const toggleQualification = useCallback((id: string) => {
    setAdditionalQualIds(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id],
    );
  }, []);

  const handleSaveDefaults = useCallback(() => {
    updateSettings({
      offerDecisionDefaults: {
        incrementPercent,
        hikePercent,
        hraIncluded,
        offerEnforcementMode,
        salaryInputMode,
        calculationMode,
        mitHybridMode,
      },
    });
  }, [updateSettings, incrementPercent, hikePercent, hraIncluded, offerEnforcementMode, salaryInputMode, calculationMode, mitHybridMode]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Offer Decision</h2>
          <p className="text-sm text-muted-foreground">
            Structured salary recommendation based on UGC bands, qualifications, and experience
          </p>
        </div>
      </div>

      {/* ── Input cards (2-column on desktop) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Candidate Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Candidate Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Designation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Position Being Offered</Label>
              <Select
                value={designation}
                onValueChange={(v) => setDesignation(v as OfferDesignation)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATION_SALARY_RANGES.map(r => (
                    <SelectItem key={r.designation} value={r.designation}>
                      {r.label}
                      {r.minGrossAnnual === 0 ? ' (range TBD)' : ` — ${fmtL(r.minGrossAnnual)} to ${fmtL(r.maxGrossAnnual)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fresher toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-sm font-medium cursor-pointer">Fresh hire (no prior salary)</Label>
                <p className="text-xs text-muted-foreground">Turn off to enter candidate's current salary</p>
              </div>
              <Switch checked={isFresher} onCheckedChange={setIsFresher} />
            </div>

            {/* Experience & current salary — experienced only */}
            {!isFresher && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Years of Relevant Experience
                  </Label>
                  <NumericInput
                    value={yearsExperience}
                    onChange={setYearsExperience}
                    min={0}
                    max={40}
                    step={1}
                    className="h-9"
                  />
                  {yearsExperience >= ASSOC_PROF_EXPERIENCE_THRESHOLD && (
                    <Alert className="py-2 mt-1">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>{yearsExperience} years</strong> exceeds the Assistant Professor maximum
                        (12 years per UGC CAS). Consider offering Associate Professor.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Current Salary Tabs */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Current Salary
                  </Label>
                  <Tabs value={salaryInputMode} onValueChange={v => setSalaryInputMode(v as SalaryInputMode)}>
                    <TabsList className="h-8 w-full">
                      <TabsTrigger value="basic" className="flex-1 text-xs h-7">Basic (₹/mo)</TabsTrigger>
                      <TabsTrigger value="gross" className="flex-1 text-xs h-7">Gross (₹/mo)</TabsTrigger>
                      <TabsTrigger value="ctc" className="flex-1 text-xs h-7">CTC (₹/yr)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="mt-2 space-y-1">
                      <NumericInput
                        value={currentBasicMonthly}
                        onChange={setCurrentBasicMonthly}
                        min={0}
                        step={1000}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        DA ({settings.daPercentage}%) added for gross comparison.
                        Gross equiv ≈ {fmt(Math.round(currentBasicMonthly * (1 + settings.daPercentage / 100) * 12))} / yr
                      </p>
                    </TabsContent>

                    <TabsContent value="gross" className="mt-2 space-y-1">
                      <NumericInput
                        value={currentGrossMonthly}
                        onChange={setCurrentGrossMonthly}
                        min={0}
                        step={1000}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Monthly gross (Basic + DA). Annual equiv = {fmt(currentGrossMonthly * 12)}
                      </p>
                    </TabsContent>

                    <TabsContent value="ctc" className="mt-2 space-y-1">
                      <NumericInput
                        value={currentCtcAnnual}
                        onChange={setCurrentCtcAnnual}
                        min={0}
                        step={50000}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Benefits stripped to estimate gross ≈ {fmt(Math.round(currentGrossEquivalentAnnual))} / yr
                        <span className="italic"> (approximate)</span>
                      </p>
                    </TabsContent>
                  </Tabs>

                  <p className="text-xs text-muted-foreground">
                    Offer will be at least {hikePercent}% above this salary
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* PhD Tier */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">PhD Institution Tier</Label>
              <RadioGroup
                value={phdTier}
                onValueChange={(v) => setPhdTier(v as PhDTier)}
                className="space-y-2.5"
              >
                {(Object.keys(PHD_TIER_LABELS) as PhDTier[]).map(tier => (
                  <div key={tier} className="flex items-start gap-2.5">
                    <RadioGroupItem value={tier} id={`phd-${tier}`} className="mt-0.5 shrink-0" />
                    <Label htmlFor={`phd-${tier}`} className="cursor-pointer leading-tight space-y-0.5">
                      <span className="font-medium text-sm">
                        {PHD_TIER_LABELS[tier].label}
                        <span className="text-muted-foreground font-normal ml-2 text-xs">
                          (+{PHD_TIER_INCREMENTS[tier]} increment{PHD_TIER_INCREMENTS[tier] !== 1 ? 's' : ''})
                        </span>
                      </span>
                      <p className="text-xs text-muted-foreground font-normal">
                        {PHD_TIER_LABELS[tier].description}
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Additional qualifications */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Additional Qualifications
                <span className="ml-2 font-normal">(select all that apply)</span>
              </Label>
              {ADDITIONAL_QUALIFICATIONS.map(qual => (
                <div key={qual.id} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`qual-${qual.id}`}
                    checked={additionalQualIds.includes(qual.id)}
                    onCheckedChange={() => toggleQualification(qual.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <Label htmlFor={`qual-${qual.id}`} className="cursor-pointer leading-tight space-y-0.5">
                    <span className="font-medium text-sm">
                      {qual.label}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        (+{qual.increments})
                      </span>
                    </span>
                    <p className="text-xs text-muted-foreground font-normal">{qual.description}</p>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Offer Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Offer Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Quality Increment Step %
              </Label>
              <NumericInput
                value={incrementPercent}
                onChange={setIncrementPercent}
                min={1}
                max={50}
                step={1}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Each qualification increment multiplies the band base by this percentage.
                Default 20%. Use 3% for fine-grained UGC-aligned steps.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Minimum Hike % over Current Salary
              </Label>
              <NumericInput
                value={hikePercent}
                onChange={setHikePercent}
                min={0}
                max={100}
                step={5}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Offer gross will be at least this % above the candidate's current salary.
                Ignored for fresh hires. Default 20%.
              </p>
            </div>

            <Separator />

            {/* Calculation Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Calculation Mode
              </Label>
              <RadioGroup
                value={calculationMode}
                onValueChange={(v) => setCalculationMode(v as CalculationMode)}
                className="space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value="standard" id="mode-standard" className="mt-0.5 shrink-0" />
                  <Label htmlFor="mode-standard" className="cursor-pointer leading-tight">
                    <span className="font-medium text-sm">Standard</span>
                    <p className="text-xs text-muted-foreground font-normal">
                      Band placement + quality increments. Hike floor = {hikePercent}% on current salary.
                    </p>
                  </Label>
                </div>
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value="mit_hybrid" id="mode-mit" className="mt-0.5 shrink-0" />
                  <Label htmlFor="mode-mit" className="cursor-pointer leading-tight">
                    <span className="font-medium text-sm">MIT Equivalent Hybrid</span>
                    <p className="text-xs text-muted-foreground font-normal">
                      Anchors offer to what the candidate would have earned at MIT
                      for their years of experience. Compares against current salary.
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {/* MIT Hybrid sub-options */}
              {calculationMode === 'mit_hybrid' && (
                <div className="mt-1 pl-6 space-y-2">
                  {!isFresher && result.mitEquivalentGrossAnnual > 0 && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                      MIT equivalent at <strong>{yearsExperience} yrs</strong>:
                      Cell <strong>{result.mitEquivalentCell}</strong> →{' '}
                      <strong>{fmt(result.mitEquivalentGrossAnnual)}</strong> / yr
                    </p>
                  )}
                  <Label className="text-xs font-medium text-muted-foreground">
                    When current salary is BELOW MIT equivalent:
                  </Label>
                  <RadioGroup
                    value={mitHybridMode}
                    onValueChange={(v) => setMitHybridMode(v as MitHybridMode)}
                    className="space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="cap" id="mit-cap" className="mt-0.5 shrink-0" />
                      <Label htmlFor="mit-cap" className="cursor-pointer leading-tight">
                        <span className="font-medium text-xs">Cap at MIT equivalent</span>
                        <p className="text-[11px] text-muted-foreground font-normal">
                          Offer = min(current × (1+hike%), MIT equiv).
                          Conservative — doesn't exceed MIT rate.
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="floor" id="mit-floor" className="mt-0.5 shrink-0" />
                      <Label htmlFor="mit-floor" className="cursor-pointer leading-tight">
                        <span className="font-medium text-xs">Floor at MIT equivalent</span>
                        <p className="text-[11px] text-muted-foreground font-normal">
                          Offer = max(current × (1+hike%), MIT equiv).
                          Candidate-friendly — always brings them to MIT level.
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium cursor-pointer">
                    Include HRA in Gross
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Off (default): Housing is a separate perk — basic is higher.
                    On: HRA is part of gross — candidate arranges own housing.
                  </p>
                </div>
                <Switch checked={hraIncluded} onCheckedChange={setHraIncluded} />
              </div>
              {hraIncluded && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                  Using city type <strong>{settings.cityType}</strong> HRA rate.
                  Change city type in global Settings (top right).
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Enforcement Mode
              </Label>
              <RadioGroup
                value={offerEnforcementMode}
                onValueChange={(v) => setOfferEnforcementMode(v as EnforcementMode)}
                className="space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value="soft" id="enf-soft" className="mt-0.5 shrink-0" />
                  <Label htmlFor="enf-soft" className="cursor-pointer leading-tight">
                    <span className="font-medium text-sm">Soft stop</span>
                    <p className="text-xs text-muted-foreground font-normal">
                      Warn when offer exceeds the approved range — management can still override
                    </p>
                  </Label>
                </div>
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value="hard" id="enf-hard" className="mt-0.5 shrink-0" />
                  <Label htmlFor="enf-hard" className="cursor-pointer leading-tight">
                    <span className="font-medium text-sm">Hard stop</span>
                    <p className="text-xs text-muted-foreground font-normal">
                      Block display of any offer outside the approved range
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 rounded p-2">
              <p>
                <span className="font-medium">DA rate:</span> {settings.daPercentage}%
                {'  ·  '}
                <span className="font-medium">City type:</span> {settings.cityType}
                {'  ·  '}
                <span className="font-medium">TA:</span> {settings.isTPTACity ? '₹7,200' : '₹3,600'}/mo
              </p>
              <p className="italic">Shared settings — change in the global Settings menu (top right).</p>
            </div>

            <Button size="sm" variant="outline" className="w-full" onClick={handleSaveDefaults}>
              Save as Defaults
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Offer Worksheet ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Offer Worksheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* TBD state */}
          {result.isTBD ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Salary range not configured</AlertTitle>
              <AlertDescription>
                The range for <strong>{activeRange?.label ?? designation}</strong> has not been set yet.
                Once management decides the minimum and maximum gross, update the values in{' '}
                <code className="text-xs bg-muted rounded px-1">ugc-data.ts → DESIGNATION_SALARY_RANGES</code>.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Assoc Prof flag */}
              {result.isAssocProfCandidate && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Consider Associate Professor</AlertTitle>
                  <AlertDescription>
                    This candidate has <strong>{candidate.yearsExperience} years</strong> of experience,
                    which exceeds the typical Assistant Professor maximum (12 years per UGC CAS).
                    Please review if they qualify for the Associate Professor position.
                  </AlertDescription>
                </Alert>
              )}

              {/* Recommended gross — hero number */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Recommended Gross Offer
                    </p>
                    <p className="text-4xl font-bold font-mono leading-none tracking-tight">
                      {fmt(result.recommendedGrossAnnual)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      per year &nbsp;·&nbsp; {fmt(Math.round(result.recommendedGrossAnnual / 12))} per month
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${BAND_BADGE_CLASS[result.bandLabel] ?? ''}`}
                    >
                      {result.bandLabel}
                    </Badge>
                    {result.mitHybridUsed && (
                      <Badge variant="secondary" className="text-xs">
                        MIT Hybrid ({mitHybridMode === 'cap' ? 'Cap' : 'Floor'})
                      </Badge>
                    )}
                    {result.isCapped && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Capped at designation maximum
                      </p>
                    )}
                  </div>
                </div>

                {/* Range progress bar */}
                {activeRange && activeRange.minGrossAnnual > 0 && (
                  <div className="space-y-1">
                    <Progress value={result.positionInRangePercent} className="h-2.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmtL(activeRange.minGrossAnnual)}</span>
                      <span className="font-medium text-foreground">
                        {result.positionInRangePercent}% of range
                      </span>
                      <span>{fmtL(activeRange.maxGrossAnnual)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Decision trail */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision Trail
                </p>
                <div className="font-mono text-sm space-y-2 border rounded-md p-3 bg-muted/10">
                  <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                    <span className="text-muted-foreground">Experience band:</span>
                    <span className="font-medium">{result.bandLabel}</span>
                  </div>
                  <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                    <span className="text-muted-foreground">PhD tier:</span>
                    <span className="font-medium">
                      {PHD_TIER_LABELS[phdTier].label}
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        (+{result.phdIncrements} increment{result.phdIncrements !== 1 ? 's' : ''})
                      </span>
                    </span>
                  </div>
                  {result.additionalIncrements > 0 && (
                    <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                      <span className="text-muted-foreground">Additional quals:</span>
                      <span className="font-medium">
                        +{result.additionalIncrements} increment{result.additionalIncrements !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-[12rem_1fr] gap-x-2 font-semibold">
                    <span className="text-muted-foreground font-normal">Total increments:</span>
                    <span>
                      {result.totalIncrements} × {result.incrementPercent}% step
                      {result.isCapped && (
                        <span className="text-amber-600 dark:text-amber-400 ml-2 text-xs font-normal">
                          (cap reached)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* MIT Hybrid trail rows */}
                  {result.mitHybridUsed && result.mitEquivalentGrossAnnual > 0 && (
                    <>
                      <Separator className="my-1" />
                      <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                        <span className="text-muted-foreground">MIT equiv (Cell {result.mitEquivalentCell}):</span>
                        <span className="font-medium">
                          {fmt(result.mitEquivalentGrossAnnual)}
                          <span className="text-muted-foreground font-normal ml-2 text-xs">
                            ({candidate.yearsExperience} yrs experience)
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                        <span className="text-muted-foreground">Current gross equiv:</span>
                        <span className="font-medium">
                          {fmt(currentGrossEquivalentAnnual)}
                          <span className="text-muted-foreground font-normal ml-2 text-xs">
                            {result.mitComparisonPath === 'below_mit' ? '(below MIT equiv)' : '(above MIT equiv)'}
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                        <span className="text-muted-foreground">
                          MIT Hybrid ({mitHybridMode === 'cap' ? 'cap' : 'floor'}):
                        </span>
                        <span className="font-medium">
                          {fmt(result.hikeFloorGrossAnnual)}
                          <span className="text-muted-foreground font-normal ml-2 text-xs">
                            (snapped to nearest cell)
                          </span>
                        </span>
                      </div>
                    </>
                  )}

                  {/* Standard hike floor row */}
                  {!result.mitHybridUsed && result.hikeFloorGrossAnnual > 0 && (
                    <div className="grid grid-cols-[12rem_1fr] gap-x-2">
                      <span className="text-muted-foreground">Hike floor gross:</span>
                      <span className="font-medium">
                        {fmt(result.hikeFloorGrossAnnual)}
                        {result.hikeFloorWasApplied ? (
                          <Badge variant="secondary" className="ml-2 text-xs">Applied — floor was higher</Badge>
                        ) : (
                          <span className="text-muted-foreground font-normal ml-2 text-xs">
                            (band placement is higher)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Salary breakdown */}
              <BreakdownDisplay
                bd={result.breakdown}
                label="Recommended offer breakdown"
                daPercent={settings.daPercentage}
                ppfPercent={settings.globalBenefits.ppfPercent}
              />

              <Separator />

              {/* Custom target override */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Custom Target Override
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter any gross annual amount to see a live breakdown — useful when negotiating
                    or presenting specific figures to management.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium shrink-0">₹</span>
                  <NumericInput
                    value={customTargetGross}
                    onChange={setCustomTargetGross}
                    min={0}
                    step={10000}
                    className="h-9 w-44"
                  />
                  <span className="text-xs text-muted-foreground">/ year</span>
                  {customTargetGross > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-9"
                      onClick={() => setCustomTargetGross(0)}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Enforcement alerts */}
                {isCustomOverRange && offerEnforcementMode === 'soft' && (
                  <Alert className="border-amber-400 dark:border-amber-600">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-700 dark:text-amber-300">
                      Over approved range — soft warning
                    </AlertTitle>
                    <AlertDescription className="text-amber-600 dark:text-amber-400 text-xs">
                      {fmt(customTargetGross)} exceeds the maximum of {fmtL(activeRange?.maxGrossAnnual ?? 0)}.
                      This offer requires explicit management approval.
                    </AlertDescription>
                  </Alert>
                )}
                {isCustomOverRange && offerEnforcementMode === 'hard' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Blocked — over approved range</AlertTitle>
                    <AlertDescription className="text-xs">
                      {fmt(customTargetGross)} exceeds the maximum of {fmtL(activeRange?.maxGrossAnnual ?? 0)}.
                      Hard stop is active. Switch to Soft stop in settings to override.
                    </AlertDescription>
                  </Alert>
                )}
                {isCustomUnderRange && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {fmt(customTargetGross)} is below the band minimum
                      of {fmtL(activeRange?.minGrossAnnual ?? 0)}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Custom breakdown (shown unless hard-blocked) */}
                {customBreakdown && !(isCustomOverRange && offerEnforcementMode === 'hard') && (
                  <div className="space-y-2 pt-1">
                    <Progress value={customRangePercent} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fmtL(activeRange?.minGrossAnnual ?? 0)}</span>
                      <span>{customRangePercent}% of range</span>
                      <span>{fmtL(activeRange?.maxGrossAnnual ?? 0)}</span>
                    </div>
                    <BreakdownDisplay
                      bd={customBreakdown}
                      label="Custom target breakdown"
                      daPercent={settings.daPercentage}
                      ppfPercent={settings.globalBenefits.ppfPercent}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Offer Analytics Dashboard ──────────────────────────────────────────── */}
      {showAnalytics && (
        <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/20 transition-colors rounded-t-lg">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Offer Analytics Dashboard
                    <Badge variant="outline" className="text-[10px] font-normal normal-case tracking-normal">
                      click to {isAnalyticsOpen ? 'collapse' : 'expand'}
                    </Badge>
                  </span>
                  {isAnalyticsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">

                {/* Hike Summary Badges */}
                <div className="flex flex-wrap gap-2">
                  {currentBreakdown && (
                    <>
                      <div className="flex flex-col items-center px-3 py-2 rounded-md border bg-muted/20 min-w-[110px]">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hike on Gross</span>
                        <span className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                          {pct(currentBreakdown.grossAnnual, result.breakdown.grossAnnual)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-2 rounded-md border bg-muted/20 min-w-[110px]">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hike on CTC</span>
                        <span className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                          {pct(currentBreakdown.ctcAnnual, result.breakdown.ctcAnnual)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-2 rounded-md border bg-muted/20 min-w-[110px]">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hike on Basic</span>
                        <span className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                          {pct(currentBreakdown.basicMonthly, result.breakdown.basicMonthly)}
                        </span>
                      </div>
                    </>
                  )}
                  {result.mitEquivalentGrossAnnual > 0 && (
                    <div className="flex flex-col items-center px-3 py-2 rounded-md border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 min-w-[130px]">
                      <span className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400">MIT Equiv Cell</span>
                      <span className="font-mono font-bold text-base text-blue-700 dark:text-blue-300">
                        #{result.mitEquivalentCell}
                      </span>
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">
                        {fmtL(result.mitEquivalentGrossAnnual)} / yr
                      </span>
                    </div>
                  )}
                </div>

                {/* Comparison Table */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Before vs. After Comparison
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                          <th className="text-left px-3 py-2">Component</th>
                          <th className="text-right px-3 py-2">Current (est.)</th>
                          {mitBreakdown && <th className="text-right px-3 py-2">MIT Equivalent</th>}
                          <th className="text-right px-3 py-2">Recommended</th>
                          <th className="text-right px-3 py-2">Δ Current → Offer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBreakdown && [
                          {
                            label: 'Basic / mo',
                            current: currentBreakdown.basicMonthly,
                            mit: mitBreakdown?.basicMonthly,
                            offered: result.breakdown.basicMonthly,
                          },
                          {
                            label: `DA (${settings.daPercentage}%) / mo`,
                            current: currentBreakdown.daMonthly,
                            mit: mitBreakdown?.daMonthly,
                            offered: result.breakdown.daMonthly,
                          },
                          ...(hraIncluded ? [{
                            label: 'HRA / mo',
                            current: currentBreakdown.hraMonthly,
                            mit: mitBreakdown?.hraMonthly,
                            offered: result.breakdown.hraMonthly,
                          }] : []),
                          {
                            label: 'TA / mo',
                            current: currentBreakdown.taMonthly,
                            mit: mitBreakdown?.taMonthly,
                            offered: result.breakdown.taMonthly,
                          },
                        ].map(row => (
                          <tr key={row.label} className="border-b border-border/30">
                            <td className="px-3 py-1.5 text-muted-foreground">{row.label}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(row.current)}</td>
                            {mitBreakdown && <td className="px-3 py-1.5 text-right text-blue-600 dark:text-blue-400">{row.mit !== undefined ? fmt(row.mit) : '—'}</td>}
                            <td className="px-3 py-1.5 text-right font-semibold">{fmt(row.offered)}</td>
                            <td className="px-3 py-1.5 text-right text-green-600 dark:text-green-400">
                              {pct(row.current, row.offered)}
                            </td>
                          </tr>
                        ))}

                        {/* Gross row */}
                        {currentBreakdown && (
                          <tr className="border-b bg-muted/20 font-semibold">
                            <td className="px-3 py-1.5">Gross / yr</td>
                            <td className="px-3 py-1.5 text-right">{fmt(currentBreakdown.grossAnnual)}</td>
                            {mitBreakdown && <td className="px-3 py-1.5 text-right text-blue-600 dark:text-blue-400">{fmt(mitBreakdown.grossAnnual)}</td>}
                            <td className="px-3 py-1.5 text-right">{fmt(result.breakdown.grossAnnual)}</td>
                            <td className="px-3 py-1.5 text-right text-green-600 dark:text-green-400 font-bold">
                              {pct(currentBreakdown.grossAnnual, result.breakdown.grossAnnual)}
                            </td>
                          </tr>
                        )}

                        {/* CTC row */}
                        {currentBreakdown && (
                          <tr className="bg-muted/30 font-bold text-sm">
                            <td className="px-3 py-2">CTC / yr (est.)</td>
                            <td className="px-3 py-2 text-right">{fmt(currentBreakdown.ctcAnnual)}</td>
                            {mitBreakdown && <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">{fmt(mitBreakdown.ctcAnnual)}</td>}
                            <td className="px-3 py-2 text-right">{fmt(result.breakdown.ctcAnnual)}</td>
                            <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                              {pct(currentBreakdown.ctcAnnual, result.breakdown.ctcAnnual)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bar Chart */}
                {currentBreakdown && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Salary Composition Comparison (₹ Annual)
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={[
                          {
                            name: 'Current',
                            Basic: currentBreakdown.basicMonthly * 12,
                            DA: currentBreakdown.daMonthly * 12,
                            'HRA+TA': (currentBreakdown.hraMonthly + currentBreakdown.taMonthly) * 12,
                            'PPF+Gratuity+Perks': currentBreakdown.ppfAnnual + currentBreakdown.gratuityAnnual + currentBreakdown.perksAnnual,
                          },
                          ...(mitBreakdown ? [{
                            name: 'MIT Equiv',
                            Basic: mitBreakdown.basicMonthly * 12,
                            DA: mitBreakdown.daMonthly * 12,
                            'HRA+TA': (mitBreakdown.hraMonthly + mitBreakdown.taMonthly) * 12,
                            'PPF+Gratuity+Perks': mitBreakdown.ppfAnnual + mitBreakdown.gratuityAnnual + mitBreakdown.perksAnnual,
                          }] : []),
                          {
                            name: 'Recommended',
                            Basic: result.breakdown.basicMonthly * 12,
                            DA: result.breakdown.daMonthly * 12,
                            'HRA+TA': (result.breakdown.hraMonthly + result.breakdown.taMonthly) * 12,
                            'PPF+Gratuity+Perks': result.breakdown.ppfAnnual + result.breakdown.gratuityAnnual + result.breakdown.perksAnnual,
                          },
                        ]}
                        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                          tick={{ fontSize: 10 }}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [fmt(value), name]}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Basic" stackId="a" fill="#6366f1" />
                        <Bar dataKey="DA" stackId="a" fill="#8b5cf6" />
                        <Bar dataKey="HRA+TA" stackId="a" fill="#a78bfa" />
                        <Bar dataKey="PPF+Gratuity+Perks" stackId="a" fill="#c4b5fd" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* MIT Equivalent note */}
                {result.mitEquivalentGrossAnnual > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/20 rounded px-3 py-2 space-y-1">
                    <p className="font-medium text-foreground">How MIT Equivalent is calculated</p>
                    <p>
                      WPU Cell 1 = entry gross ({fmtL(activeRange?.minGrossAnnual ?? 1500000)}/yr).
                      Each year = one 3% increment cell. At <strong>{candidate.yearsExperience} years</strong> →
                      Cell <strong>{result.mitEquivalentCell}</strong> →{' '}
                      <strong>{fmt(result.mitEquivalentGrossAnnual)}</strong>/yr.
                    </p>
                    {result.mitComparisonPath !== 'na' && (
                      <p>
                        Current gross ({fmt(currentGrossEquivalentAnnual)}) is{' '}
                        <strong>
                          {result.mitComparisonPath === 'below_mit' ? 'below' : 'above'}
                        </strong>{' '}
                        MIT equivalent → {result.mitComparisonPath === 'below_mit'
                          ? `${mitHybridMode === 'cap' ? 'Cap' : 'Floor'} mode applied`
                          : 'standard hike applied'}.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* ── WPU Pay Scale Reference Table (collapsible) ───────────────────────── */}
      <Collapsible open={isRefTableOpen} onOpenChange={setIsRefTableOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/20 transition-colors rounded-t-lg">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  WPU Pay Scale Reference Table
                  <Badge variant="outline" className="text-[10px] font-normal normal-case tracking-normal">
                    {wpuPayScale.length} cells · click to {isRefTableOpen ? 'collapse' : 'expand'}
                  </Badge>
                </span>
                {isRefTableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <p className="text-xs text-muted-foreground">
                Entry basic is back-calculated from the WPU minimum gross
                ({fmtL(activeRange?.minGrossAnnual ?? 1500000)}), then 3% increments are applied
                per cell — mirroring UGC's own pay matrix structure. The table updates live with
                the DA ({settings.daPercentage}%) and HRA settings above.
                {result.mitEquivalentCell > 0 && (
                  <> Cell <strong>{result.mitEquivalentCell}</strong> is highlighted as the MIT equivalent
                  for <strong>{candidate.yearsExperience} years</strong> of experience.</>
                )}
              </p>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b text-muted-foreground text-[10px] uppercase tracking-wider">
                      <th className="text-left px-3 py-2">Cell</th>
                      <th className="text-right px-3 py-2">Basic / mo</th>
                      <th className="text-right px-3 py-2">DA / mo</th>
                      {hraIncluded && <th className="text-right px-3 py-2">HRA / mo</th>}
                      <th className="text-right px-3 py-2">WPU Gross / yr</th>
                      <th className="text-left px-3 py-2">Band / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wpuPayScale.map((cell, idx) => {
                      const prevBand = idx > 0 ? wpuPayScale[idx - 1].band : null;
                      const isBandStart = prevBand !== cell.band;
                      const rowBg = BAND_ROW_BG[cell.band] ?? '';
                      const isMitCell = cell.cellNumber === result.mitEquivalentCell && !isFresher;
                      const isRecommendedCell = Math.abs(cell.wpuGrossAnnual - result.recommendedGrossAnnual) < 50000;

                      return (
                        <tr
                          key={cell.cellNumber}
                          className={`border-b border-border/30 transition-colors ${rowBg} ${isMitCell ? 'ring-2 ring-blue-400 dark:ring-blue-600 ring-inset' : ''}`}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">{cell.cellNumber}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(cell.basicMonthly)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(cell.daMonthly)}</td>
                          {hraIncluded && (
                            <td className="px-3 py-1.5 text-right">{fmt(cell.hraMonthly)}</td>
                          )}
                          <td className="px-3 py-1.5 text-right font-semibold">
                            {fmt(cell.wpuGrossAnnual)}
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {isBandStart && cell.band !== '—' && (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${BAND_BADGE_CLASS[cell.band] ?? 'bg-muted'}`}
                                >
                                  {cell.band}
                                </span>
                              )}
                              {isMitCell && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                  ← MIT Equiv
                                </span>
                              )}
                              {isRecommendedCell && !isMitCell && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700">
                                  ← Recommended
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Each cell = one year of 3% increment, equivalent to one UGC pay matrix cell step.
                To change the increment rate, edit{' '}
                <code className="bg-muted rounded px-1 text-[10px]">WPU_CELL_INCREMENT_RATE</code>{' '}
                in <code className="bg-muted rounded px-1 text-[10px]">ugc-data.ts</code>.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
