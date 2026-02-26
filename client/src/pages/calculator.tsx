import { useState, useMemo, useCallback, useEffect } from 'react';
import { TrendingUp, IndianRupee, Clock, MapPin, Settings2, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, RotateCcw, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InfoTooltip } from '@/components/info-tooltip';
import { NumericInput } from '@/components/numeric-input';
import { useSettings } from '@/lib/settings-context';
import {
  FACULTY_POSITIONS,
  PAY_MATRIX,
  DA_HISTORY,
  HRA_RATES,
  CITY_EXAMPLES,
  FINANCIAL_STRATEGIES,
  type CityType,
  type FinancialStrategy,
} from '@/lib/ugc-data';
import {
  calculateComparison,
  calculateWPUSalary,
  calculate8thCPCSalary,
  getCellsForLevel,
  suggestCellFromExperience,
  formatCurrencyINR,
  formatCurrency,
  type Benefits,
} from '@/lib/salary-calculator';

const CHART_COLORS = [
  'hsl(230, 55%, 55%)',
  'hsl(160, 45%, 48%)',
  'hsl(30, 70%, 55%)',
  'hsl(200, 55%, 50%)',
  'hsl(340, 50%, 55%)',
  'hsl(45, 60%, 50%)',
  'hsl(270, 45%, 55%)',
  'hsl(10, 55%, 52%)',
];

export default function CalculatorPage() {
  const { settings, updateSettings, getBenefitsForPosition, setBenefitsForPosition, clearPositionBenefits, getBenefitsSource } = useSettings();

  const [positionId, setPositionId] = useState(1);
  const [experience, setExperience] = useState(0);
  const [cellIndex, setCellIndex] = useState(0);
  const [cellManuallySet, setCellManuallySet] = useState(false);
  const [daPercent, setDaPercent] = useState(settings.daPercentage);
  const [cityType, setCityType] = useState<CityType>(settings.cityType);
  const [strategy, setStrategy] = useState<FinancialStrategy>(settings.financialStrategy);
  const [multiplier, setMultiplier] = useState(settings.baseMultiplier);
  const [annualPremium, setAnnualPremium] = useState(settings.annualPremium);
  const [daHistoryOpen, setDaHistoryOpen] = useState(false);
  const [benefitInputMode, setBenefitInputMode] = useState<'monthly' | 'annual'>('annual');
  const [breakdownView, setBreakdownView] = useState<'monthly' | 'annual'>('monthly');
  const [breakdownTab, setBreakdownTab] = useState<'comparison' | 'ugc7' | 'cpc8' | 'wpu'>('comparison');
  const [salaryCardView, setSalaryCardView] = useState<'monthly' | 'annual'>('monthly');
  const [wpuSubTab, setWpuSubTab] = useState<'7th' | '8th'>('7th');
  const [compareMode, setCompareMode] = useState<'all' | 'selected'>('all');
  const [selectedCompare, setSelectedCompare] = useState<Record<CompareColId, boolean>>({
    ugc7: true, cpc8: true, wpu_sal: true, wpu_ctc: true, wpu8_sal: true, wpu8_ctc: true,
  });
  const [allowancesOpen, setAllowancesOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);

  const position = useMemo(() => FACULTY_POSITIONS.find(p => p.id === positionId)!, [positionId]);

  const [benefits, setBenefits] = useState<Benefits>(() => getBenefitsForPosition(positionId, position.level));

  const benefitsSource = getBenefitsSource(positionId, position.level);

  useEffect(() => {
    setDaPercent(settings.daPercentage);
    setCityType(settings.cityType);
    setStrategy(settings.financialStrategy);
    setMultiplier(settings.baseMultiplier);
    setAnnualPremium(settings.annualPremium);
  }, [settings.daPercentage, settings.cityType, settings.financialStrategy, settings.baseMultiplier, settings.annualPremium]);

  useEffect(() => {
    setBenefits(getBenefitsForPosition(positionId, position.level));
  }, [positionId, position.level, getBenefitsForPosition]);

  const cells = useMemo(() => getCellsForLevel(position.level), [position.level]);
  const maxCellIndex = cells.length - 1;

  const handlePositionChange = useCallback((id: string) => {
    const newId = parseInt(id);
    setPositionId(newId);
    const newPos = FACULTY_POSITIONS.find(p => p.id === newId)!;
    setBenefits(getBenefitsForPosition(newId, newPos.level));
    const suggested = suggestCellFromExperience(newPos.level, experience);
    setCellIndex(suggested);
    setCellManuallySet(false);
  }, [experience, getBenefitsForPosition]);

  useEffect(() => {
    if (!cellManuallySet) {
      const suggested = suggestCellFromExperience(position.level, experience);
      setCellIndex(suggested);
    }
  }, [experience, position.level, cellManuallySet]);

  const handleExperienceChange = useCallback((val: number[]) => {
    setExperience(val[0]);
  }, []);

  const handleCellChange = useCallback((val: string) => {
    setCellIndex(parseInt(val));
    setCellManuallySet(true);
  }, []);

  const comparison = useMemo(() => {
    return calculateComparison(
      position.level,
      cellIndex,
      daPercent,
      cityType,
      multiplier,
      annualPremium,
      strategy,
      settings.multiplierMethod,
      benefits,
      position.specialAllowance,
      settings.isTPTACity,
      settings.hraConfig,
      settings.enforcementMode,
      settings.positionPremiumRanges[positionId],
      settings.positionSalaryCaps[positionId]
    );
  }, [position, positionId, cellIndex, daPercent, cityType, multiplier, annualPremium, strategy, settings.multiplierMethod, benefits, settings.isTPTACity, settings.hraConfig, settings.enforcementMode, settings.positionPremiumRanges, settings.positionSalaryCaps]);

  const eighthCpc = useMemo(() => {
    return calculate8thCPCSalary(
      comparison.ugc.basic,
      settings.eighthCpcFitmentFactor,
      settings.eighthCpcDaPercent,
      cityType,
      position.level,
      position.specialAllowance,
      settings.isTPTACity,
      settings.hraConfig,
      comparison.ugc.totalMonthly
    );
  }, [comparison.ugc, settings.eighthCpcFitmentFactor, settings.eighthCpcDaPercent, cityType, position.level, position.specialAllowance, settings.isTPTACity, settings.hraConfig]);

  const wpuOn8th = useMemo(() => {
    if (settings.wpuBasePay === '7th') return null;
    return calculateWPUSalary(
      eighthCpc,
      multiplier,
      annualPremium,
      strategy,
      settings.multiplierMethod,
      benefits,
      settings.eighthCpcDaPercent,
      cityType,
      position.level,
      position.specialAllowance,
      settings.isTPTACity,
      settings.hraConfig,
      settings.enforcementMode,
      settings.positionPremiumRanges[positionId],
      settings.positionSalaryCaps[positionId],
    );
  }, [eighthCpc, multiplier, annualPremium, strategy, settings.multiplierMethod, benefits,
    settings.eighthCpcDaPercent, cityType, position, settings.isTPTACity, settings.hraConfig,
    settings.enforcementMode, settings.positionPremiumRanges, settings.positionSalaryCaps,
    positionId, settings.wpuBasePay]);

  const activeWpu = settings.wpuBasePay === '8th' && wpuOn8th ? wpuOn8th : comparison.wpu;
  const enforcement = activeWpu.enforcement;

  const premiumRange = settings.positionPremiumRanges[positionId];
  const hasPositionPremiumRange = premiumRange && (premiumRange.minPremium > 0 || premiumRange.maxPremium > 0);
  const premiumWarning = enforcement.premiumBelowMin || enforcement.premiumAboveMax || (!hasPositionPremiumRange && (annualPremium < 300000 || annualPremium > 1200000));

  const wpuChartData = useMemo(() => {
    const w = comparison.wpu;
    const data = [
      { name: 'Basic', value: w.basic },
      { name: 'DA', value: w.da },
      { name: 'HRA', value: w.hra },
      { name: 'TA', value: w.ta },
    ];
    if (w.specialAllowance > 0) data.push({ name: 'Special Allowance', value: w.specialAllowance });
    if (w.multiplierBonus > 0) data.push({ name: 'Multiplier Bonus', value: w.multiplierBonus });
    if (w.premiumMonthly > 0) data.push({ name: 'Premium', value: w.premiumMonthly });
    if (w.benefits.totalMonthly > 0) data.push({ name: 'Benefits', value: w.benefits.totalMonthly });
    return data.filter(d => d.value > 0);
  }, [comparison.wpu]);

  const updateBenefit = useCallback((key: keyof Benefits, value: number) => {
    setBenefits(prev => {
      const updated = { ...prev, [key]: value };
      setBenefitsForPosition(positionId, updated);
      return updated;
    });
  }, [positionId, setBenefitsForPosition]);

  const resetBenefitsToLevelDefaults = useCallback(() => {
    clearPositionBenefits(positionId);
    setBenefits(getBenefitsForPosition(positionId, position.level));
  }, [positionId, position.level, clearPositionBenefits, getBenefitsForPosition]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Faculty Salary Calculator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">UGC 7th CPC vs WPU GOA Enhanced Compensation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT PANEL - INPUTS */}
          <div className="space-y-4">
            {/* Position Selector */}
            <Card data-tour-id="tour-position-experience">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Position & Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Faculty Position</Label>
                  <Select value={positionId.toString()} onValueChange={handlePositionChange} data-testid="select-position">
                    <SelectTrigger data-testid="select-position-trigger">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTY_POSITIONS.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()} data-testid={`select-position-${p.id}`}>
                          {p.title} (Level {p.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Level {position.level} | {position.typicalExperience}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Experience: {experience} years</Label>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-experience">
                      {experience} yrs
                    </Badge>
                  </div>
                  <Slider
                    min={0}
                    max={30}
                    step={1}
                    value={[experience]}
                    onValueChange={handleExperienceChange}
                    data-testid="slider-experience"
                  />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>0 years</span>
                    <span>30 years</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cell">Pay Cell</Label>
                    <InfoTooltip
                      shortText="Auto-suggested from experience"
                      title="Pay Cell Selection"
                      detail="The pay cell is auto-suggested based on your experience years. You can manually override it using the dropdown. Each cell represents an annual increment in the UGC pay matrix."
                    />
                  </div>
                  <Select value={cellIndex.toString()} onValueChange={handleCellChange} data-testid="select-cell">
                    <SelectTrigger data-testid="select-cell-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cells.map((c, idx) => (
                        <SelectItem key={idx} value={idx.toString()} data-testid={`select-cell-${idx}`}>
                          Cell {c.cell} - {formatCurrencyINR(c.amount)} ({c.experience})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cellManuallySet && (
                    <p className="text-xs text-muted-foreground opacity-70">Manually overridden</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* DA & City - Collapsible on mobile */}
            <Collapsible open={allowancesOpen} onOpenChange={setAllowancesOpen} className="lg:hidden">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer">
                    <CardTitle className="text-[15px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        Allowances
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${allowancesOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    {!allowancesOpen && (
                      <CardDescription className="text-xs">DA {daPercent}% | {HRA_RATES[cityType].label}</CardDescription>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Dearness Allowance: {daPercent}%</Label>
                        <Button variant="outline" size="sm" onClick={() => setDaHistoryOpen(true)} data-testid="button-da-history-mobile">
                          <Clock className="h-4 w-4 mr-1" />
                          DA History
                        </Button>
                      </div>
                      <Slider min={0} max={100} step={1} value={[daPercent]} onValueChange={(v) => setDaPercent(v[0])} data-testid="slider-da-mobile" />
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>0%</span><span>Current: 58%</span><span>100%</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Label>City Classification</Label>
                      </div>
                      <Select value={cityType} onValueChange={(v) => setCityType(v as CityType)} data-testid="select-city-mobile">
                        <SelectTrigger data-testid="select-city-trigger-mobile">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(HRA_RATES) as CityType[]).map(ct => (
                            <SelectItem key={ct} value={ct}>{HRA_RATES[ct].label} (HRA {HRA_RATES[ct].rate}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* DA & City - Always visible on desktop */}
            <Card className="hidden lg:block" data-tour-id="tour-allowances">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  Allowances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Dearness Allowance: {daPercent}%</Label>
                    <Button variant="outline" size="sm" onClick={() => setDaHistoryOpen(true)} data-testid="button-da-history">
                      <Clock className="h-4 w-4 mr-1" />
                      DA History
                    </Button>
                  </div>
                  <Slider min={0} max={100} step={1} value={[daPercent]} onValueChange={(v) => setDaPercent(v[0])} data-testid="slider-da" />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>0%</span><span>Current: 58%</span><span>100%</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label>City Classification</Label>
                  </div>
                  <Select value={cityType} onValueChange={(v) => setCityType(v as CityType)} data-testid="select-city">
                    <SelectTrigger data-testid="select-city-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(HRA_RATES) as CityType[]).map(ct => (
                        <SelectItem key={ct} value={ct} data-testid={`select-city-${ct}`}>
                          {HRA_RATES[ct].label} (HRA {HRA_RATES[ct].rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    e.g. {CITY_EXAMPLES[cityType].slice(0, 4).join(', ')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Strategy - Collapsible on mobile */}
            <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen} className="lg:hidden">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer">
                    <CardTitle className="text-[15px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Financial Strategy
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${strategyOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    {!strategyOpen && (
                      <CardDescription className="text-xs">{FINANCIAL_STRATEGIES.find(s => s.value === strategy)?.label} | {multiplier.toFixed(2)}x</CardDescription>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2">
                      <Label>Strategy</Label>
                      <Select value={strategy} onValueChange={(v) => setStrategy(v as FinancialStrategy)} data-testid="select-strategy-mobile">
                        <SelectTrigger data-testid="select-strategy-trigger-mobile"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FINANCIAL_STRATEGIES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>Multiplier: {multiplier.toFixed(2)}x</Label>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{multiplier.toFixed(2)}x</Badge>
                      </div>
                      <Slider min={1.0} max={3.0} step={0.05} value={[multiplier]} onValueChange={(v) => setMultiplier(v[0])} data-testid="slider-multiplier-mobile" />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual Premium</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <NumericInput value={annualPremium} onChange={setAnnualPremium} min={0} data-testid="input-premium-mobile" />
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(annualPremium, true)}/yr</p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Financial Strategy - Always visible on desktop */}
            <Card className="hidden lg:block" data-tour-id="tour-financial-strategy">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Financial Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Strategy</Label>
                  <Select value={strategy} onValueChange={(v) => setStrategy(v as FinancialStrategy)} data-testid="select-strategy">
                    <SelectTrigger data-testid="select-strategy-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_STRATEGIES.map(s => (
                        <SelectItem key={s.value} value={s.value} data-testid={`select-strategy-${s.value}`}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {FINANCIAL_STRATEGIES.find(s => s.value === strategy)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Multiplier: {multiplier.toFixed(2)}x</Label>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-multiplier">
                      {multiplier.toFixed(2)}x
                    </Badge>
                  </div>
                  <Slider
                    min={1.0}
                    max={3.0}
                    step={0.05}
                    value={[multiplier]}
                    onValueChange={(v) => setMultiplier(v[0])}
                    data-testid="slider-multiplier"
                  />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>1.0x</span>
                    <span>3.0x</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="premium">Annual Premium</Label>
                    <InfoTooltip
                      shortText="Additional annual compensation"
                      title="Annual Premium"
                      detail="An additional annual amount added to the WPU GOA compensation package. This is divided by 12 and added to the monthly salary. Typical range is 3-12 lakhs per annum."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <NumericInput
                      value={annualPremium}
                      onChange={setAnnualPremium}
                      min={0}
                      data-testid="input-premium"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(annualPremium, true)} per annum ({formatCurrencyINR(Math.round(annualPremium / 12))}/month)
                  </p>
                  {enforcement.premiumBelowMin && premiumRange && (
                    <Badge variant="secondary" className="text-red-700 dark:text-red-400 no-default-hover-elevate no-default-active-elevate" data-testid="badge-premium-below-min">
                      Below position min ({formatCurrency(premiumRange.minPremium, true)})
                    </Badge>
                  )}
                  {enforcement.premiumAboveMax && premiumRange && (
                    <Badge variant="secondary" className="text-red-700 dark:text-red-400 no-default-hover-elevate no-default-active-elevate" data-testid="badge-premium-above-max">
                      Above position max ({formatCurrency(premiumRange.maxPremium, true)})
                    </Badge>
                  )}
                  {!enforcement.premiumBelowMin && !enforcement.premiumAboveMax && !hasPositionPremiumRange && premiumWarning && (
                    <Badge variant="secondary" className="text-amber-700 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate" data-testid="badge-premium-warning">
                      {annualPremium < 300000 ? 'Premium below typical 3L minimum' : 'Premium above typical 12L maximum'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Benefits - Collapsible on mobile */}
            <Collapsible open={benefitsOpen} onOpenChange={setBenefitsOpen} className="lg:hidden">
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer">
                    <CardTitle className="text-[15px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Benefits Package
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${benefitsOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                    {!benefitsOpen && (
                      <CardDescription className="text-xs">Housing, PPF, Gratuity, Insurance</CardDescription>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-1 mb-2 rounded-md bg-muted/30 p-0.5">
                      <Button variant="ghost" size="sm" className={`toggle-elevate ${benefitInputMode === 'monthly' ? 'toggle-elevated' : ''}`} onClick={() => setBenefitInputMode('monthly')}>Monthly</Button>
                      <Button variant="ghost" size="sm" className={`toggle-elevate ${benefitInputMode === 'annual' ? 'toggle-elevated' : ''}`} onClick={() => setBenefitInputMode('annual')}>Annual</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Housing ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                        <NumericInput value={benefitInputMode === 'annual' ? benefits.housing * 12 : benefits.housing} onChange={(val) => updateBenefit('housing', benefitInputMode === 'annual' ? Math.round(val / 12) : val)} min={0} data-testid="input-benefit-housing-mobile" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prof. Dev ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                        <NumericInput value={benefitInputMode === 'annual' ? benefits.professionalDev * 12 : benefits.professionalDev} onChange={(val) => updateBenefit('professionalDev', benefitInputMode === 'annual' ? Math.round(val / 12) : val)} min={0} data-testid="input-benefit-profdev-mobile" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">PPF (%)</Label>
                        <NumericInput value={benefits.ppfPercent} onChange={(val) => updateBenefit('ppfPercent', val)} min={0} max={100} data-testid="input-benefit-ppf-mobile" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Gratuity (%)</Label>
                        <NumericInput value={benefits.gratuityPercent} onChange={(val) => updateBenefit('gratuityPercent', val)} min={0} step={0.01} data-testid="input-benefit-gratuity-mobile" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Health Insurance ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                        <NumericInput value={benefitInputMode === 'annual' ? benefits.healthInsurance * 12 : benefits.healthInsurance} onChange={(val) => updateBenefit('healthInsurance', benefitInputMode === 'annual' ? Math.round(val / 12) : val)} min={0} data-testid="input-benefit-health-mobile" />
                      </div>
                    </div>
                    {benefitsSource === 'position' && (
                      <Button variant="ghost" size="sm" onClick={resetBenefitsToLevelDefaults} className="w-full mt-2">
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset to Level Defaults
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Benefits - Always visible on desktop */}
            <Card className="hidden lg:block" data-tour-id="tour-benefits">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-[15px] flex items-center gap-2">
                      Benefits Package
                      <InfoTooltip
                        shortText="WPU GOA benefits"
                        title="Three-Tier Benefits System"
                        detail={"Benefits follow a 3-tier priority:\n\n1. Position Override (Custom): Benefits you set for this specific position\n2. Level Defaults: Default benefits for this academic level\n3. Global Defaults: Fallback benefits for all positions\n\nWhen you edit benefits here, they're saved as a position-level override. Use 'Reset' to go back to level defaults."}
                      />
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      Source: <Badge variant="secondary" className="text-[10px]">{benefitsSource === 'position' ? 'Custom Override' : benefitsSource === 'level' ? `Level ${position.level} Default` : 'Global Default'}</Badge>
                    </CardDescription>
                  </div>
                  {benefitsSource === 'position' && (
                    <Button variant="ghost" size="sm" onClick={resetBenefitsToLevelDefaults} data-testid="button-reset-benefits">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1 mb-2 rounded-md bg-muted/30 p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`toggle-elevate ${benefitInputMode === 'monthly' ? 'toggle-elevated' : ''}`}
                    onClick={() => setBenefitInputMode('monthly')}
                    data-testid="button-benefit-mode-monthly"
                  >
                    Monthly
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`toggle-elevate ${benefitInputMode === 'annual' ? 'toggle-elevated' : ''}`}
                    onClick={() => setBenefitInputMode('annual')}
                    data-testid="button-benefit-mode-annual"
                  >
                    Annual
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Housing ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                    <NumericInput
                      value={benefitInputMode === 'annual' ? benefits.housing * 12 : benefits.housing}
                      onChange={(val) => updateBenefit('housing', benefitInputMode === 'annual' ? Math.round(val / 12) : val)}
                      min={0}
                      data-testid="input-benefit-housing"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prof. Dev ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                    <NumericInput
                      value={benefitInputMode === 'annual' ? benefits.professionalDev * 12 : benefits.professionalDev}
                      onChange={(val) => updateBenefit('professionalDev', benefitInputMode === 'annual' ? Math.round(val / 12) : val)}
                      min={0}
                      data-testid="input-benefit-profdev"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">PPF (%)</Label>
                    <NumericInput
                      value={benefits.ppfPercent}
                      onChange={(val) => updateBenefit('ppfPercent', val)}
                      min={0}
                      max={100}
                      data-testid="input-benefit-ppf"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Gratuity (%)</Label>
                    <NumericInput
                      value={benefits.gratuityPercent}
                      onChange={(val) => updateBenefit('gratuityPercent', val)}
                      min={0}
                      step={0.01}
                      data-testid="input-benefit-gratuity"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Health Insurance ({benefitInputMode === 'monthly' ? '₹/mo' : '₹/yr'})</Label>
                    <NumericInput
                      value={benefitInputMode === 'annual' ? benefits.healthInsurance * 12 : benefits.healthInsurance}
                      onChange={(val) => updateBenefit('healthInsurance', benefitInputMode === 'annual' ? Math.round(val / 12) : val)}
                      min={0}
                      data-testid="input-benefit-health"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL - RESULTS */}
          <div className="space-y-4">
            {/* Unified Salary Comparison Card */}
            <Card data-tour-id="tour-salary-results">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Salary Comparison
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{position.title}</CardDescription>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
                    <Button variant="ghost" size="sm" className={`toggle-elevate ${salaryCardView === 'monthly' ? 'toggle-elevated' : ''}`} onClick={() => setSalaryCardView('monthly')}>Monthly</Button>
                    <Button variant="ghost" size="sm" className={`toggle-elevate ${salaryCardView === 'annual' ? 'toggle-elevated' : ''}`} onClick={() => setSalaryCardView('annual')}>Annual</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Standard 4-column layout (single WPU base) */}
                {settings.wpuBasePay !== 'both' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* UGC 7th Pay */}
                    <div className="rounded-md bg-muted/30 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-medium">UGC 7th Pay</p>
                      <p className="text-base font-bold tabular-nums" data-testid="text-ugc-total">
                        {formatCurrencyINR(salaryCardView === 'monthly' ? comparison.ugc.totalMonthly : comparison.ugc.totalAnnual)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {salaryCardView === 'monthly' ? `${formatCurrencyINR(comparison.ugc.totalAnnual)}/yr` : `${formatCurrencyINR(comparison.ugc.totalMonthly)}/mo`}
                      </p>
                    </div>
                    {/* 8th Pay (Proposed) */}
                    <div className="rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2.5">
                      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-medium">8th Pay (Proposed)</p>
                      <p className="text-base font-bold tabular-nums text-purple-700 dark:text-purple-300">
                        {formatCurrencyINR(salaryCardView === 'monthly' ? eighthCpc.totalMonthly : eighthCpc.totalAnnual)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {salaryCardView === 'monthly' ? `${formatCurrencyINR(eighthCpc.totalAnnual)}/yr` : `${formatCurrencyINR(eighthCpc.totalMonthly)}/mo`}
                      </p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">FF×{settings.eighthCpcFitmentFactor} · +{eighthCpc.incrementOverSeventhPercent.toFixed(1)}%</p>
                    </div>
                    {/* WPU GOA Salary */}
                    <div className={`rounded-md p-2.5 ${enforcement.salaryCapped || enforcement.salaryBelowMin ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">WPU GOA Salary</p>
                        {enforcement.salaryCapped && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[8px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" data-testid="badge-salary-capped">{settings.enforcementMode === 'hard' ? 'CAP' : '!'}</Badge>}
                        {enforcement.salaryBelowMin && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[8px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" data-testid="badge-salary-below-min">LOW</Badge>}
                      </div>
                      <p className="text-base font-bold tabular-nums" data-testid="text-wpu-salary">
                        {formatCurrencyINR(salaryCardView === 'monthly' ? activeWpu.totalSalaryMonthly : activeWpu.totalSalaryAnnual)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {salaryCardView === 'monthly' ? `${formatCurrencyINR(activeWpu.totalSalaryAnnual)}/yr` : `${formatCurrencyINR(activeWpu.totalSalaryMonthly)}/mo`}
                      </p>
                      {settings.wpuBasePay === '8th' && <p className="text-[9px] text-muted-foreground mt-0.5">On 8th CPC base</p>}
                    </div>
                    {/* WPU GOA CTC */}
                    <div className={`rounded-md border p-2.5 ${enforcement.ctcCapped ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-primary/5 dark:bg-primary/10 border-primary/15'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">WPU GOA CTC</p>
                        {enforcement.ctcCapped && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[8px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" data-testid="badge-ctc-capped">{settings.enforcementMode === 'hard' ? 'CAP' : '!'}</Badge>}
                      </div>
                      <p className="text-base font-bold tabular-nums" data-testid="text-wpu-total">
                        {formatCurrencyINR(salaryCardView === 'monthly' ? activeWpu.totalCTCMonthly : activeWpu.totalCTCAnnual)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {salaryCardView === 'monthly' ? `${formatCurrencyINR(activeWpu.totalCTCAnnual)}/yr` : `${formatCurrencyINR(activeWpu.totalCTCMonthly)}/mo`}
                      </p>
                      {settings.wpuBasePay === '8th' && <p className="text-[9px] text-muted-foreground mt-0.5">On 8th CPC base</p>}
                    </div>
                  </div>
                )}

                {/* Both WPU bases layout */}
                {settings.wpuBasePay === 'both' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-medium">UGC 7th Pay</p>
                        <p className="text-base font-bold tabular-nums" data-testid="text-ugc-total">
                          {formatCurrencyINR(salaryCardView === 'monthly' ? comparison.ugc.totalMonthly : comparison.ugc.totalAnnual)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {salaryCardView === 'monthly' ? `${formatCurrencyINR(comparison.ugc.totalAnnual)}/yr` : `${formatCurrencyINR(comparison.ugc.totalMonthly)}/mo`}
                        </p>
                      </div>
                      <div className="rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-medium">8th Pay (Proposed)</p>
                        <p className="text-base font-bold tabular-nums text-purple-700 dark:text-purple-300">
                          {formatCurrencyINR(salaryCardView === 'monthly' ? eighthCpc.totalMonthly : eighthCpc.totalAnnual)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {salaryCardView === 'monthly' ? `${formatCurrencyINR(eighthCpc.totalAnnual)}/yr` : `${formatCurrencyINR(eighthCpc.totalMonthly)}/mo`}
                        </p>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">FF×{settings.eighthCpcFitmentFactor} · +{eighthCpc.incrementOverSeventhPercent.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/10 border border-muted/50 p-2.5 space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">WPU GOA</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-md bg-muted/30 p-2">
                          <p className="text-[9px] text-muted-foreground mb-0.5 font-medium">Salary (7th base)</p>
                          <p className="text-sm font-bold tabular-nums" data-testid="text-wpu-salary">
                            {formatCurrencyINR(salaryCardView === 'monthly' ? comparison.wpu.totalSalaryMonthly : comparison.wpu.totalSalaryAnnual)}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {salaryCardView === 'monthly' ? `${formatCurrencyINR(comparison.wpu.totalSalaryAnnual)}/yr` : `${formatCurrencyINR(comparison.wpu.totalSalaryMonthly)}/mo`}
                          </p>
                        </div>
                        <div className="rounded-md bg-primary/5 border border-primary/15 p-2">
                          <p className="text-[9px] text-muted-foreground mb-0.5 font-medium">CTC (7th base)</p>
                          <p className="text-sm font-bold tabular-nums" data-testid="text-wpu-total">
                            {formatCurrencyINR(salaryCardView === 'monthly' ? comparison.wpu.totalCTCMonthly : comparison.wpu.totalCTCAnnual)}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {salaryCardView === 'monthly' ? `${formatCurrencyINR(comparison.wpu.totalCTCAnnual)}/yr` : `${formatCurrencyINR(comparison.wpu.totalCTCMonthly)}/mo`}
                          </p>
                        </div>
                        {wpuOn8th && (<>
                          <div className="rounded-md bg-muted/30 p-2">
                            <p className="text-[9px] text-muted-foreground mb-0.5 font-medium">Salary (8th base)</p>
                            <p className="text-sm font-bold tabular-nums">
                              {formatCurrencyINR(salaryCardView === 'monthly' ? wpuOn8th.totalSalaryMonthly : wpuOn8th.totalSalaryAnnual)}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {salaryCardView === 'monthly' ? `${formatCurrencyINR(wpuOn8th.totalSalaryAnnual)}/yr` : `${formatCurrencyINR(wpuOn8th.totalSalaryMonthly)}/mo`}
                            </p>
                          </div>
                          <div className="rounded-md bg-primary/5 border border-primary/15 p-2">
                            <p className="text-[9px] text-muted-foreground mb-0.5 font-medium">CTC (8th base)</p>
                            <p className="text-sm font-bold tabular-nums">
                              {formatCurrencyINR(salaryCardView === 'monthly' ? wpuOn8th.totalCTCMonthly : wpuOn8th.totalCTCAnnual)}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {salaryCardView === 'monthly' ? `${formatCurrencyINR(wpuOn8th.totalCTCAnnual)}/yr` : `${formatCurrencyINR(wpuOn8th.totalCTCMonthly)}/mo`}
                            </p>
                          </div>
                        </>)}
                      </div>
                    </div>
                  </div>
                )}

                {/* WPU Base quick toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">WPU Base:</span>
                  <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
                    {(['7th', '8th', 'both'] as const).map(opt => (
                      <Button key={opt} variant="ghost" size="sm"
                        className={`toggle-elevate text-xs ${settings.wpuBasePay === opt ? 'toggle-elevated' : ''}`}
                        onClick={() => updateSettings({ wpuBasePay: opt })}>
                        {opt === 'both' ? 'Both' : `${opt} CPC`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Premium over UGC 7th Pay */}
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/20 p-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Premium over UGC 7th Pay</p>
                    <p className="text-sm font-semibold tabular-nums mt-0.5" data-testid="text-premium-amount">
                      {comparison.premiumAmountMonthly >= 0 ? '+' : ''}{formatCurrencyINR(salaryCardView === 'monthly' ? comparison.premiumAmountMonthly : comparison.premiumAmountAnnual)}{salaryCardView === 'monthly' ? '/mo' : '/yr'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {comparison.premiumPercentage >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    )}
                    <Badge
                      variant="secondary"
                      className={`no-default-hover-elevate no-default-active-elevate ${comparison.premiumPercentage >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                      data-testid="badge-premium-percent"
                    >
                      {comparison.premiumPercentage >= 0 ? '+' : ''}{comparison.premiumPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <Card data-tour-id="tour-breakdown">
              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-[15px]">Detailed Breakdown</CardTitle>
                  <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
                    <Button variant="ghost" size="sm" className={`toggle-elevate ${breakdownView === 'monthly' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownView('monthly')} data-testid="button-breakdown-monthly">Monthly</Button>
                    <Button variant="ghost" size="sm" className={`toggle-elevate ${breakdownView === 'annual' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownView('annual')} data-testid="button-breakdown-annual">Annual</Button>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5 overflow-x-auto">
                  <Button variant="ghost" size="sm" className={`toggle-elevate shrink-0 ${breakdownTab === 'comparison' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownTab('comparison')} data-testid="button-breakdown-combined">Comparison</Button>
                  <Button variant="ghost" size="sm" className={`toggle-elevate shrink-0 ${breakdownTab === 'ugc7' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownTab('ugc7')} data-testid="button-breakdown-ugc">UGC 7th Pay</Button>
                  <Button variant="ghost" size="sm" className={`toggle-elevate shrink-0 ${breakdownTab === 'cpc8' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownTab('cpc8')} data-testid="button-breakdown-cpc8">8th Pay</Button>
                  <Button variant="ghost" size="sm" className={`toggle-elevate shrink-0 ${breakdownTab === 'wpu' ? 'toggle-elevated' : ''}`} onClick={() => setBreakdownTab('wpu')} data-testid="button-breakdown-wpu">WPU/GOA</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* ── COMPARISON TAB ── */}
                {breakdownTab === 'comparison' && (() => {
                  const m = breakdownView === 'annual' ? 12 : 1;
                  const wpuForComp = settings.wpuBasePay === '8th' && wpuOn8th ? wpuOn8th : comparison.wpu;
                  const allCols: CompareColId[] = settings.wpuBasePay === 'both'
                    ? ['ugc7', 'cpc8', 'wpu_sal', 'wpu_ctc', 'wpu8_sal', 'wpu8_ctc']
                    : ['ugc7', 'cpc8', 'wpu_sal', 'wpu_ctc'];
                  const colLabels: Record<CompareColId, string> = {
                    ugc7: 'UGC 7th', cpc8: '8th Pay',
                    wpu_sal: settings.wpuBasePay === 'both' ? 'WPU Sal (7th)' : 'WPU Salary',
                    wpu_ctc: settings.wpuBasePay === 'both' ? 'WPU CTC (7th)' : 'WPU CTC',
                    wpu8_sal: 'WPU Sal (8th)', wpu8_ctc: 'WPU CTC (8th)',
                  };
                  const visibleCols: CompareColId[] = compareMode === 'all'
                    ? allCols
                    : allCols.filter(col => selectedCompare[col]);
                  const wpu7 = comparison.wpu;
                  const wpu8 = wpuOn8th;
                  const getVals = (
                    ugc7v: number, cpc8v: number, wpuSalV: number,
                    wpuCtcV: number, wpu8SalV: number, wpu8CtcV: number
                  ): Partial<Record<CompareColId, number>> => ({
                    ugc7: ugc7v, cpc8: cpc8v, wpu_sal: wpuSalV, wpu_ctc: wpuCtcV,
                    wpu8_sal: wpu8SalV, wpu8_ctc: wpu8CtcV,
                  });
                  const hasAnySpecial = comparison.ugc.specialAllowance > 0 || wpuForComp.specialAllowance > 0 || eighthCpc.specialAllowance > 0;
                  const hasWpuBonus = wpuForComp.multiplierBonus > 0 || (wpu8?.multiplierBonus ?? 0) > 0;
                  const hasWpuPremium = wpuForComp.premiumMonthly > 0 || (wpu8?.premiumMonthly ?? 0) > 0;
                  const hasWpuBenefits = wpu7.benefits.totalMonthly > 0;
                  return (
                    <div className="space-y-3">
                      {/* Compare All / Compare Selected controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
                          <Button variant="ghost" size="sm" className={`toggle-elevate ${compareMode === 'all' ? 'toggle-elevated' : ''}`} onClick={() => setCompareMode('all')}>Compare All</Button>
                          <Button variant="ghost" size="sm" className={`toggle-elevate ${compareMode === 'selected' ? 'toggle-elevated' : ''}`} onClick={() => setCompareMode('selected')}>Selected</Button>
                        </div>
                        {compareMode === 'selected' && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {allCols.map(col => (
                              <Button key={col} variant="ghost" size="sm"
                                className={`toggle-elevate text-xs ${selectedCompare[col] ? 'toggle-elevated' : ''}`}
                                onClick={() => setSelectedCompare(prev => {
                                  const activeCount = Object.values(prev).filter(Boolean).length;
                                  if (prev[col] && activeCount <= 1) return prev;
                                  return { ...prev, [col]: !prev[col] };
                                })}>
                                {colLabels[col]}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Column headers + rows */}
                      <div className="overflow-x-auto -mx-1 px-1">
                        <div className="space-y-2" style={{ minWidth: `${140 + visibleCols.length * 84}px` }}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-muted-foreground">Component</span>
                            <div className="flex items-center gap-2">
                              {visibleCols.map(col => (
                                <span key={col} className={`text-[10px] font-semibold text-right min-w-[80px] ${col === 'cpc8' ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}`}>
                                  {colLabels[col]}
                                </span>
                              ))}
                            </div>
                          </div>
                          <MultiColRow label="Basic Pay" multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.basic, eighthCpc.basic, wpuForComp.basic, wpuForComp.basic, wpu8?.basic??0, wpu8?.basic??0)} />
                          <MultiColRow label="DA" multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.da, eighthCpc.da, wpuForComp.da, wpuForComp.da, wpu8?.da??0, wpu8?.da??0)} />
                          <MultiColRow label="HRA" multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.hra, eighthCpc.hra, wpuForComp.hra, wpuForComp.hra, wpu8?.hra??0, wpu8?.hra??0)} />
                          <MultiColRow label="Transport Allowance" multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.ta, eighthCpc.ta, wpuForComp.ta, wpuForComp.ta, wpu8?.ta??0, wpu8?.ta??0)} />
                          {hasAnySpecial && <MultiColRow label="Special Allowance" multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.specialAllowance, eighthCpc.specialAllowance, wpuForComp.specialAllowance, wpuForComp.specialAllowance, wpu8?.specialAllowance??0, wpu8?.specialAllowance??0)} />}
                          {hasWpuBonus && <MultiColRow label="Multiplier Bonus" multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, wpuForComp.multiplierBonus, wpuForComp.multiplierBonus, wpu8?.multiplierBonus??0, wpu8?.multiplierBonus??0)} />}
                          {hasWpuPremium && <MultiColRow label="Premium" multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, wpuForComp.premiumMonthly, wpuForComp.premiumMonthly, wpu8?.premiumMonthly??0, wpu8?.premiumMonthly??0)} />}
                          <Separator className="my-1" />
                          <MultiColRow label="Salary Subtotal" bold multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.totalMonthly, eighthCpc.totalMonthly, wpuForComp.totalSalaryMonthly, wpuForComp.totalSalaryMonthly, wpu8?.totalSalaryMonthly??0, wpu8?.totalSalaryMonthly??0)} />
                          {hasWpuBenefits && (<>
                            <p className="text-xs text-muted-foreground pt-1">Benefits (WPU only)</p>
                            <MultiColRow label="Housing" sub multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.housing, 0, wpu8?.benefits.housing??0)} />
                            <MultiColRow label="Professional Dev" sub multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.professionalDev, 0, wpu8?.benefits.professionalDev??0)} />
                            <MultiColRow label="PPF" sub multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.ppfAmount, 0, wpu8?.benefits.ppfAmount??0)} />
                            <MultiColRow label="Gratuity" sub multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.gratuityAmount, 0, wpu8?.benefits.gratuityAmount??0)} />
                            <MultiColRow label="Health Insurance" sub multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.healthInsurance, 0, wpu8?.benefits.healthInsurance??0)} />
                            <MultiColRow label="Benefits Total" bold multiplier={m} visibleCols={visibleCols} values={getVals(0, 0, 0, wpu7.benefits.totalMonthly, 0, wpu8?.benefits.totalMonthly??0)} />
                          </>)}
                          <Separator className="my-1" />
                          <MultiColRow label="Total CTC" bold primary multiplier={m} visibleCols={visibleCols} values={getVals(comparison.ugc.totalMonthly, eighthCpc.totalMonthly, wpuForComp.totalSalaryMonthly, wpuForComp.totalCTCMonthly, wpu8?.totalSalaryMonthly??0, wpu8?.totalCTCMonthly??0)} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── UGC 7TH PAY TAB ── */}
                {breakdownTab === 'ugc7' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Component</span>
                      <span className="text-xs font-semibold text-muted-foreground text-right">Amount</span>
                    </div>
                    <SingleRow label="Basic Pay" value={comparison.ugc.basic} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label={`DA (${daPercent}%)`} value={comparison.ugc.da} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label={`HRA ${comparison.ugc.hraMode === 'none' ? '(None)' : comparison.ugc.hraMode === 'lumpsum' ? '(Lump Sum)' : `(${HRA_RATES[cityType].rate}%)`}`} value={comparison.ugc.hra} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label="Transport Allowance" value={comparison.ugc.ta} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    {comparison.ugc.specialAllowance > 0 && (
                      <SingleRow label="Special Allowance" value={comparison.ugc.specialAllowance} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    )}
                    <Separator className="my-2" />
                    <SingleRow label="Total UGC 7th Pay Salary" value={comparison.ugc.totalMonthly} multiplier={breakdownView === 'annual' ? 12 : 1} bold />
                    <p className="text-xs text-muted-foreground pt-1">{formatCurrencyINR(comparison.ugc.totalAnnual)}/year</p>
                  </div>
                )}

                {/* ── 8TH PAY (PROPOSED) TAB ── */}
                {breakdownTab === 'cpc8' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Component</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">FF×{settings.eighthCpcFitmentFactor}</Badge>
                        <span className="text-xs font-semibold text-muted-foreground text-right">Amount</span>
                      </div>
                    </div>
                    <SingleRow label="Basic Pay" value={eighthCpc.basic} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label={`DA (${settings.eighthCpcDaPercent}%)`} value={eighthCpc.da} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label={`HRA ${eighthCpc.hraMode === 'none' ? '(None)' : eighthCpc.hraMode === 'lumpsum' ? '(Lump Sum)' : `(${HRA_RATES[cityType].rate}%)`}`} value={eighthCpc.hra} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    <SingleRow label="Transport Allowance" value={eighthCpc.ta} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    {eighthCpc.specialAllowance > 0 && (
                      <SingleRow label="Special Allowance" value={eighthCpc.specialAllowance} multiplier={breakdownView === 'annual' ? 12 : 1} />
                    )}
                    <Separator className="my-2" />
                    <SingleRow label="Total 8th CPC Salary" value={eighthCpc.totalMonthly} multiplier={breakdownView === 'annual' ? 12 : 1} bold />
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">{formatCurrencyINR(eighthCpc.totalAnnual)}/year</p>
                      <Badge variant="secondary" className={`no-default-hover-elevate no-default-active-elevate text-xs ${eighthCpc.incrementOverSeventhPercent >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        +{eighthCpc.incrementOverSeventhPercent.toFixed(1)}% vs 7th CPC
                      </Badge>
                    </div>
                  </div>
                )}

                {/* ── WPU/GOA TAB ── */}
                {breakdownTab === 'wpu' && (() => {
                  const m = breakdownView === 'annual' ? 12 : 1;
                  const wpuD = wpuSubTab === '8th' && wpuOn8th ? wpuOn8th : comparison.wpu;
                  const ugcForRef = comparison.ugc;
                  const cpc8ForRef = eighthCpc;
                  const allWpuCols: CompareColId[] = ['ugc7', 'cpc8', 'wpu_sal', 'wpu_ctc'];
                  const wpuColLabels: Record<CompareColId, string> = {
                    ugc7: 'UGC 7th', cpc8: '8th Pay',
                    wpu_sal: 'WPU Salary', wpu_ctc: 'WPU CTC',
                    wpu8_sal: '', wpu8_ctc: '',
                  };
                  return (
                    <div className="space-y-3">
                      {/* Sub-tabs */}
                      <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5 w-fit">
                        <Button variant="ghost" size="sm" className={`toggle-elevate ${wpuSubTab === '7th' ? 'toggle-elevated' : ''}`} onClick={() => setWpuSubTab('7th')}>vs 7th Pay</Button>
                        <Button variant="ghost" size="sm" className={`toggle-elevate ${wpuSubTab === '8th' ? 'toggle-elevated' : ''}`} onClick={() => setWpuSubTab('8th')}>vs 8th Pay</Button>
                      </div>
                      {/* Show prompt if 8th base WPU is not available */}
                      {wpuSubTab === '8th' && !wpuOn8th && (
                        <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                          Enable <span className="font-medium">8th CPC</span> or <span className="font-medium">Both</span> in the WPU Base toggle above to see this comparison.
                        </div>
                      )}
                      {/* 4-column comparison */}
                      {(wpuSubTab === '7th' || wpuOn8th) && (
                        <div className="overflow-x-auto -mx-1 px-1">
                          <div className="space-y-2" style={{ minWidth: `${140 + 4 * 84}px` }}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-muted-foreground">Component</span>
                              <div className="flex items-center gap-2">
                                {allWpuCols.map(col => (
                                  <span key={col} className={`text-[10px] font-semibold text-right min-w-[80px] ${col === 'cpc8' ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}`}>
                                    {wpuColLabels[col]}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <MultiColRow label="Basic Pay" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.basic, cpc8: cpc8ForRef.basic, wpu_sal: wpuD.basic, wpu_ctc: wpuD.basic }} />
                            <MultiColRow label="DA" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.da, cpc8: cpc8ForRef.da, wpu_sal: wpuD.da, wpu_ctc: wpuD.da }} />
                            <MultiColRow label="HRA" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.hra, cpc8: cpc8ForRef.hra, wpu_sal: wpuD.hra, wpu_ctc: wpuD.hra }} />
                            <MultiColRow label="Transport Allowance" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.ta, cpc8: cpc8ForRef.ta, wpu_sal: wpuD.ta, wpu_ctc: wpuD.ta }} />
                            {(ugcForRef.specialAllowance > 0 || wpuD.specialAllowance > 0) && <MultiColRow label="Special Allowance" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.specialAllowance, cpc8: cpc8ForRef.specialAllowance, wpu_sal: wpuD.specialAllowance, wpu_ctc: wpuD.specialAllowance }} />}
                            {wpuD.multiplierBonus > 0 && <MultiColRow label="Multiplier Bonus" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: wpuD.multiplierBonus, wpu_ctc: wpuD.multiplierBonus }} />}
                            {wpuD.premiumMonthly > 0 && <MultiColRow label="Premium" multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: wpuD.premiumMonthly, wpu_ctc: wpuD.premiumMonthly }} />}
                            <Separator className="my-1" />
                            <MultiColRow label="Salary Subtotal" bold multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.totalMonthly, cpc8: cpc8ForRef.totalMonthly, wpu_sal: wpuD.totalSalaryMonthly, wpu_ctc: wpuD.totalSalaryMonthly }} />
                            {wpuD.benefits.totalMonthly > 0 && (<>
                              <p className="text-xs text-muted-foreground pt-1">Benefits (WPU only)</p>
                              <MultiColRow label="Housing" sub multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.housing }} />
                              <MultiColRow label="Professional Dev" sub multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.professionalDev }} />
                              <MultiColRow label="PPF" sub multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.ppfAmount }} />
                              <MultiColRow label="Gratuity" sub multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.gratuityAmount }} />
                              <MultiColRow label="Health Insurance" sub multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.healthInsurance }} />
                              <MultiColRow label="Benefits Total" bold multiplier={m} visibleCols={allWpuCols} values={{ ugc7: 0, cpc8: 0, wpu_sal: 0, wpu_ctc: wpuD.benefits.totalMonthly }} />
                            </>)}
                            <Separator className="my-1" />
                            <MultiColRow label="Total CTC" bold primary multiplier={m} visibleCols={allWpuCols} values={{ ugc7: ugcForRef.totalMonthly, cpc8: cpc8ForRef.totalMonthly, wpu_sal: wpuD.totalSalaryMonthly, wpu_ctc: wpuD.totalCTCMonthly }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Composition Chart */}
            <Card data-tour-id="tour-chart">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                  WPU GOA Salary Composition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wpuChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {wpuChartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrencyINR(value)}
                          contentStyle={{ borderRadius: '6px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {wpuChartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrencyINR(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* DA History Dialog */}
      <Dialog open={daHistoryOpen} onOpenChange={setDaHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>DA Rate History</DialogTitle>
            <DialogDescription>Historical Dearness Allowance rates for central government employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {DA_HISTORY.map((entry) => (
              <div key={entry.date} className="flex items-center justify-between gap-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{entry.date}</span>
                  {entry.label && (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-da-${entry.rate}`}>
                      {entry.label}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">{entry.rate}%</span>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDaPercent(DA_HISTORY[0].rate);
                setDaHistoryOpen(false);
              }}
              data-testid="button-apply-current-da"
            >
              Apply Current Rate ({DA_HISTORY[0].rate}%)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CompareColId = 'ugc7' | 'cpc8' | 'wpu_sal' | 'wpu_ctc' | 'wpu8_sal' | 'wpu8_ctc';

function MultiColRow({
  label,
  values,
  visibleCols,
  bold = false,
  sub = false,
  primary = false,
  multiplier = 1,
}: {
  label: string;
  values: Partial<Record<CompareColId, number>>;
  visibleCols: CompareColId[];
  bold?: boolean;
  sub?: boolean;
  primary?: boolean;
  multiplier?: number;
}) {
  return (
    <div className={`flex items-center justify-between gap-1 ${sub ? 'pl-3' : ''}`}>
      <span className={`text-sm min-w-0 ${bold ? 'font-semibold' : ''} ${sub ? 'text-xs text-muted-foreground' : ''}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {visibleCols.map(col => {
          const val = (values[col] ?? 0) * multiplier;
          return (
            <span
              key={col}
              className={`text-sm text-right tabular-nums min-w-[80px]
                ${bold ? 'font-semibold' : ''}
                ${primary ? 'font-bold' : ''}
                ${col === 'cpc8' ? 'text-purple-700 dark:text-purple-300' : ''}
                ${val === 0 && !bold ? 'text-muted-foreground opacity-50' : ''}`}
            >
              {val === 0 && !bold ? '—' : formatCurrencyINR(val)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  ugc,
  wpu,
  bold = false,
  highlight = false,
  sub = false,
  primary = false,
  multiplier = 1,
}: {
  label: string;
  ugc: number;
  wpu: number;
  bold?: boolean;
  highlight?: boolean;
  sub?: boolean;
  primary?: boolean;
  multiplier?: number;
}) {
  const ugcVal = ugc * multiplier;
  const wpuVal = wpu * multiplier;
  return (
    <div className={`flex items-center justify-between gap-2 ${sub ? 'pl-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} ${highlight ? 'text-muted-foreground' : ''} ${sub ? 'text-xs text-muted-foreground' : ''}`}>
        {label}
      </span>
      <div className="flex items-center gap-4">
        <span
          className={`text-sm text-right min-w-[100px] ${bold ? 'font-semibold' : ''} ${primary ? 'font-bold' : ''} ${ugcVal === 0 && !bold ? 'text-muted-foreground opacity-50' : ''}`}
          data-testid={`text-ugc-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        >
          {ugcVal === 0 && !bold ? '-' : formatCurrencyINR(ugcVal)}
        </span>
        <span
          className={`text-sm text-right min-w-[100px] ${bold ? 'font-semibold' : ''} ${primary ? 'font-bold' : ''} ${highlight ? 'font-medium' : ''} ${wpuVal === 0 && !bold ? 'text-muted-foreground opacity-50' : ''}`}
          data-testid={`text-wpu-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        >
          {wpuVal === 0 && !bold ? '-' : formatCurrencyINR(wpuVal)}
        </span>
      </div>
    </div>
  );
}

function SingleRow({
  label,
  value,
  bold = false,
  highlight = false,
  sub = false,
  primary = false,
  multiplier = 1,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
  sub?: boolean;
  primary?: boolean;
  multiplier?: number;
}) {
  const val = value * multiplier;
  return (
    <div className={`flex items-center justify-between gap-2 ${sub ? 'pl-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} ${highlight ? 'text-muted-foreground' : ''} ${sub ? 'text-xs text-muted-foreground' : ''}`}>
        {label}
      </span>
      <span className={`text-sm text-right ${bold ? 'font-semibold' : ''} ${primary ? 'font-bold' : ''} ${highlight ? 'font-medium' : ''}`}>
        {formatCurrencyINR(val)}
      </span>
    </div>
  );
}
