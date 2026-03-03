import { useState, useMemo, useCallback } from 'react';
import {
  Target, ChevronDown, ChevronUp, AlertTriangle, Info, TrendingUp,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/lib/settings-context';
import type { EnforcementMode } from '@/lib/settings-context';
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

        {/* Basic + DA + HRA rows */}
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1 border-b border-border/40">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-right">{fmt(Math.round(row.monthly))}</span>
            <span className="text-right">{fmt(Math.round(row.annual))}</span>
          </div>
        ))}

        {/* Gross total */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 font-semibold border-b bg-muted/20">
          <span>Gross</span>
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
          <span>Total CTC</span>
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
  const [currentBasicMonthly, setCurrentBasicMonthly] = useState(50000);
  const [phdTier, setPhdTier] = useState<PhDTier>('iit_iisc');
  const [additionalQualIds, setAdditionalQualIds] = useState<string[]>([]);

  // Local offer settings (synced from saved defaults on mount)
  const [incrementPercent, setIncrementPercent] = useState(defaults.incrementPercent);
  const [hikePercent, setHikePercent] = useState(defaults.hikePercent);
  const [hraIncluded, setHraIncluded] = useState(defaults.hraIncluded);
  const [offerEnforcementMode, setOfferEnforcementMode] = useState<EnforcementMode>(
    defaults.offerEnforcementMode,
  );

  // Custom target override
  const [customTargetGross, setCustomTargetGross] = useState(0);
  const [isRefTableOpen, setIsRefTableOpen] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const candidate: CandidateProfile = useMemo(() => ({
    isFresher,
    yearsExperience: isFresher ? 0 : yearsExperience,
    currentBasicMonthly: isFresher ? 0 : currentBasicMonthly,
    designation,
    phdTier,
    additionalQualIds,
  }), [isFresher, yearsExperience, currentBasicMonthly, designation, phdTier, additionalQualIds]);

  const result = useMemo(() => calculateOfferDecision(
    candidate,
    incrementPercent,
    hikePercent,
    settings.daPercentage,
    hraIncluded,
    settings.cityType,
    settings.globalBenefits.ppfPercent,
    settings.globalBenefits.gratuityPercent,
  ), [candidate, incrementPercent, hikePercent, settings, hraIncluded]);

  const activeRange = useMemo(
    () => DESIGNATION_SALARY_RANGES.find(r => r.designation === designation),
    [designation],
  );

  const customBreakdown = useMemo((): OfferBreakdown | null => {
    if (!customTargetGross || customTargetGross <= 0) return null;
    const { basicMonthly, daMonthly, hraMonthly } = backCalculateFromGross(
      customTargetGross, settings.daPercentage, hraIncluded, settings.cityType,
    );
    const grossMonthly = basicMonthly + daMonthly + hraMonthly;
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
      grossMonthly: Math.round(grossMonthly),
      ppfAnnual,
      gratuityAnnual,
      perksAnnual,
      ctcAnnual: customTargetGross + ppfAnnual + gratuityAnnual + perksAnnual,
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

  const wpuPayScale = useMemo(
    () => generateWpuPayScaleTable(settings.daPercentage, hraIncluded, settings.cityType),
    [settings.daPercentage, hraIncluded, settings.cityType],
  );

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
      },
    });
  }, [updateSettings, incrementPercent, hikePercent, hraIncluded, offerEnforcementMode]);

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

            {/* Experience & current basic — experienced only */}
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Current Basic Pay (₹ / month)
                  </Label>
                  <NumericInput
                    value={currentBasicMonthly}
                    onChange={setCurrentBasicMonthly}
                    min={0}
                    step={1000}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Offer will be at least {hikePercent}% above this basic pay
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
                Offer gross will be at least this % above the candidate's current basic pay equivalent.
                Ignored for fresh hires. Default 20%.
              </p>
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
                  {result.hikeFloorGrossAnnual > 0 && (
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
                      <th className="text-left px-3 py-2">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wpuPayScale.map((cell, idx) => {
                      const prevBand = idx > 0 ? wpuPayScale[idx - 1].band : null;
                      const isBandStart = prevBand !== cell.band;
                      const rowBg = BAND_ROW_BG[cell.band] ?? '';

                      return (
                        <tr
                          key={cell.cellNumber}
                          className={`border-b border-border/30 transition-colors ${rowBg}`}
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
                            {isBandStart && cell.band !== '—' && (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${BAND_BADGE_CLASS[cell.band] ?? 'bg-muted'}`}
                              >
                                {cell.band}
                              </span>
                            )}
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
