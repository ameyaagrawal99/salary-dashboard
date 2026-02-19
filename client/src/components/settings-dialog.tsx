import { useState } from 'react';
import { Settings, RotateCcw, ChevronDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSettings, type EnforcementMode, type HraMode } from '@/lib/settings-context';
import { MULTIPLIER_METHODS, FINANCIAL_STRATEGIES, HRA_RATES, FACULTY_POSITIONS, PAY_MATRIX, type CityType } from '@/lib/ugc-data';
import { InfoTooltip } from './info-tooltip';
import { NumericInput } from './numeric-input';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, calculateBenefits } from '@/lib/salary-calculator';

export function SettingsDialog() {
  const { settings, updateSettings, resetToDefaults, getBenefitsForPosition } = useSettings();
  const [capsOpen, setCapsOpen] = useState(false);
  const [premiumRangesOpen, setPremiumRangesOpen] = useState(false);

  const updatePremiumRange = (positionId: number, field: 'minPremium' | 'maxPremium', value: number) => {
    const current = settings.positionPremiumRanges[positionId] || { minPremium: 0, maxPremium: 0 };
    updateSettings({
      positionPremiumRanges: {
        ...settings.positionPremiumRanges,
        [positionId]: { ...current, [field]: value }
      }
    });
  };

  const updateSalaryCap = (positionId: number, field: 'minWPUSalaryAnnual' | 'maxWPUSalaryAnnual' | 'maxWPUCTCAnnual', value: number) => {
    const current = settings.positionSalaryCaps[positionId] || { minWPUSalaryAnnual: 0, maxWPUSalaryAnnual: 0, maxWPUCTCAnnual: 0 };
    updateSettings({
      positionSalaryCaps: {
        ...settings.positionSalaryCaps,
        [positionId]: { ...current, [field]: value }
      }
    });
  };

  const updateHraConfig = (field: string, value: any) => {
    updateSettings({
      hraConfig: { ...settings.hraConfig, [field]: value }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid="button-settings" data-tour-id="tour-settings-button">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            Global Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Multiplier Method</Label>
              <InfoTooltip
                shortText="How multiplier is applied"
                title="Multiplier Application Method"
                detail={`Method A: Multiplier is applied to the total UGC salary. Your basic pay stays at UGC standard, reducing future liability.\n\nMethod B: Multiplier is applied directly to basic pay. DA, HRA are recalculated on the enhanced basic, increasing future costs.`}
              />
            </div>
            <RadioGroup
              value={settings.multiplierMethod}
              onValueChange={(v) => updateSettings({ multiplierMethod: v as any })}
              className="space-y-2"
            >
              {MULTIPLIER_METHODS.map(m => (
                <div key={m.value} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                  <RadioGroupItem value={m.value} id={m.value} className="mt-0.5" data-testid={`radio-${m.value}`} />
                  <label htmlFor={m.value} className="cursor-pointer">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.description}</div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financial Strategy</Label>
              <InfoTooltip
                shortText="Calculation method"
                title="Financial Strategy"
                detail="Multiplier Only: Only the multiplier enhancement.\nPremium Only: Only the annual premium added.\nMultiplier + Premium: Both applied together.\nHigher of Both: Whichever gives more.\nLower of Both: Whichever gives less."
              />
            </div>
            <Select value={settings.financialStrategy} onValueChange={(v) => updateSettings({ financialStrategy: v as any })}>
              <SelectTrigger data-testid="select-strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_STRATEGIES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City Classification (HRA)</Label>
              <InfoTooltip
                shortText="Rent allowance rate"
                title="City Classification for HRA"
                detail={`X-Class (30%): Metro cities - 50 Lakhs+ population\nAhmedabad, Bengaluru, Chennai, Delhi, Hyderabad, Kolkata, Mumbai, Pune\n\nY-Class (20%): 5-50 Lakhs population\nGoa, Jaipur, Lucknow, Chandigarh, Indore, Kochi, etc.\n\nZ-Class (10%): Below 5 Lakhs population\nAll other cities and towns\n\nNote: Goa (Panaji/Margao) typically falls under Y-Class.`}
              />
            </div>
            <RadioGroup
              value={settings.cityType}
              onValueChange={(v) => updateSettings({ cityType: v as CityType })}
              className="flex flex-wrap gap-3"
            >
              {(Object.entries(HRA_RATES) as [CityType, typeof HRA_RATES.X][]).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                  <RadioGroupItem value={key} id={`city-${key}`} data-testid={`radio-city-${key}`} />
                  <label htmlFor={`city-${key}`} className="cursor-pointer text-sm">
                    {val.label} ({val.rate}%)
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={settings.isTPTACity}
              onCheckedChange={(v) => updateSettings({ isTPTACity: v })}
              data-testid="switch-tpta"
            />
            <div>
              <Label className="text-sm">TPTA City (Higher TA)</Label>
              <p className="text-xs text-muted-foreground">Major metro cities get higher Transport Allowance</p>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Housing Provision</Label>
              <InfoTooltip
                shortText="Housing & HRA control"
                title="Housing Provision & HRA"
                detail="If providing housing, you can choose to still pay HRA (as percentage or lump sum) or not pay HRA at all. When housing is not provided, standard percentage-based HRA applies."
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.hraConfig.providingHousing}
                  onCheckedChange={(v) => updateHraConfig('providingHousing', v)}
                  data-testid="switch-providing-housing"
                />
                <Label className="text-sm">University provides housing</Label>
              </div>

              {settings.hraConfig.providingHousing && (
                <div className="pl-4 border-l-2 border-muted space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={settings.hraConfig.stillProvideHra}
                      onCheckedChange={(v) => updateHraConfig('stillProvideHra', v)}
                      data-testid="switch-still-provide-hra"
                    />
                    <Label className="text-sm">Still provide HRA</Label>
                  </div>

                  {settings.hraConfig.stillProvideHra && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">HRA Mode</Label>
                      <RadioGroup
                        value={settings.hraConfig.hraMode}
                        onValueChange={(v) => updateHraConfig('hraMode', v as HraMode)}
                        className="flex gap-3"
                      >
                        <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                          <RadioGroupItem value="percent" id="hra-percent" data-testid="radio-hra-percent" />
                          <label htmlFor="hra-percent" className="cursor-pointer text-sm">Percentage</label>
                        </div>
                        <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                          <RadioGroupItem value="lumpsum" id="hra-lumpsum" data-testid="radio-hra-lumpsum" />
                          <label htmlFor="hra-lumpsum" className="cursor-pointer text-sm">Lump Sum</label>
                        </div>
                      </RadioGroup>

                      {settings.hraConfig.hraMode === 'lumpsum' && (
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Monthly Lump Sum Amount</Label>
                          <NumericInput
                            value={settings.hraConfig.lumpSumValue}
                            onChange={(v) => updateHraConfig('lumpSumValue', v)}
                            min={0}
                            step={1000}
                            data-testid="input-hra-lumpsum-value"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enforcement Mode</Label>
              <InfoTooltip
                shortText="How limits are enforced"
                title="Enforcement Mode"
                detail="Soft Warning: Shows color-coded warnings when salary/CTC exceeds caps or premium is out of range, but allows the values.\n\nHard Stop: Automatically caps WPU Salary and CTC at the configured maximums with a visual indicator."
              />
            </div>
            <RadioGroup
              value={settings.enforcementMode}
              onValueChange={(v) => updateSettings({ enforcementMode: v as EnforcementMode })}
              className="flex gap-3"
            >
              <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                <RadioGroupItem value="soft" id="enforce-soft" data-testid="radio-enforce-soft" />
                <label htmlFor="enforce-soft" className="cursor-pointer flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-sm">Soft Warning</span>
                </label>
              </div>
              <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                <RadioGroupItem value="hard" id="enforce-hard" data-testid="radio-enforce-hard" />
                <label htmlFor="enforce-hard" className="cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-sm">Hard Stop</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <Collapsible open={premiumRangesOpen} onOpenChange={setPremiumRangesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0" data-testid="button-toggle-premium-ranges">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">Per-Position Premium Ranges</Label>
                  <InfoTooltip
                    shortText="Min/max premium per position"
                    title="Premium Ranges"
                    detail="Set minimum and maximum annual premium amounts for each faculty position. Leave at 0 to disable the limit for that position."
                  />
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${premiumRangesOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                {FACULTY_POSITIONS.map(pos => {
                  const range = settings.positionPremiumRanges[pos.id] || { minPremium: 0, maxPremium: 0 };
                  return (
                    <div key={pos.id} className="p-3 rounded-md bg-muted/30 space-y-2">
                      <Label className="text-xs font-medium">{pos.shortTitle}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Min Premium (Annual)</Label>
                          <NumericInput
                            value={range.minPremium}
                            onChange={(v) => updatePremiumRange(pos.id, 'minPremium', v)}
                            min={0}
                            step={50000}
                            data-testid={`input-premium-min-${pos.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Max Premium (Annual)</Label>
                          <NumericInput
                            value={range.maxPremium}
                            onChange={(v) => updatePremiumRange(pos.id, 'maxPremium', v)}
                            min={0}
                            step={50000}
                            data-testid={`input-premium-max-${pos.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <Collapsible open={capsOpen} onOpenChange={setCapsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-0" data-testid="button-toggle-salary-caps">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">WPU Salary Ranges</Label>
                  <InfoTooltip
                    shortText="Min/max salary per designation"
                    title="WPU Salary Ranges"
                    detail="Set minimum and maximum annual WPU Salary for each designation. CTC range is auto-computed by adding benefits. In Hard Stop mode, salary is auto-capped at maximum. In Soft Warning mode, out-of-range values are highlighted."
                  />
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${capsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 pt-2">
                {FACULTY_POSITIONS.filter(p => !p.title.toLowerCase().includes('principal')).map(pos => {
                  const cap = settings.positionSalaryCaps[pos.id] || { minWPUSalaryAnnual: 0, maxWPUSalaryAnnual: 0, maxWPUCTCAnnual: 0 };
                  const posBenefits = getBenefitsForPosition(pos.id, pos.level);
                  const cells = PAY_MATRIX[pos.level];
                  const basicPay = cells ? cells[0] : 0;
                  const benefitsBreakdown = calculateBenefits(basicPay, posBenefits);
                  const computedMinCTC = cap.minWPUSalaryAnnual > 0 ? cap.minWPUSalaryAnnual + benefitsBreakdown.totalAnnual : 0;
                  const computedMaxCTC = cap.maxWPUSalaryAnnual > 0 ? cap.maxWPUSalaryAnnual + benefitsBreakdown.totalAnnual : 0;
                  return (
                    <div key={pos.id} className="p-3 rounded-md bg-muted/30 space-y-2">
                      <Label className="text-xs font-medium">{pos.shortTitle}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Min Salary (Annual)</Label>
                          <NumericInput
                            value={cap.minWPUSalaryAnnual}
                            onChange={(v) => updateSalaryCap(pos.id, 'minWPUSalaryAnnual', v)}
                            min={0}
                            step={100000}
                            data-testid={`input-cap-min-salary-${pos.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Max Salary (Annual)</Label>
                          <NumericInput
                            value={cap.maxWPUSalaryAnnual}
                            onChange={(v) => updateSalaryCap(pos.id, 'maxWPUSalaryAnnual', v)}
                            min={0}
                            step={100000}
                            data-testid={`input-cap-max-salary-${pos.id}`}
                          />
                        </div>
                      </div>
                      {(computedMinCTC > 0 || computedMaxCTC > 0) && (
                        <p className="text-[10px] text-muted-foreground">
                          Estimated CTC range: {computedMinCTC > 0 ? formatCurrency(computedMinCTC, true) : '—'} — {computedMaxCTC > 0 ? formatCurrency(computedMaxCTC, true) : '—'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tooltip Mode</Label>
            </div>
            <RadioGroup
              value={settings.tooltipMode}
              onValueChange={(v) => updateSettings({ tooltipMode: v as any })}
              className="flex gap-3"
            >
              <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                <RadioGroupItem value="detailed" id="tooltip-detailed" data-testid="radio-tooltip-detailed" />
                <label htmlFor="tooltip-detailed" className="cursor-pointer text-sm">Detailed</label>
              </div>
              <div className="flex items-center gap-2 p-2 px-3 rounded-md bg-muted/50">
                <RadioGroupItem value="concise" id="tooltip-concise" data-testid="radio-tooltip-concise" />
                <label htmlFor="tooltip-concise" className="cursor-pointer text-sm">Concise</label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <Button variant="outline" onClick={resetToDefaults} className="w-full" data-testid="button-reset-defaults">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
