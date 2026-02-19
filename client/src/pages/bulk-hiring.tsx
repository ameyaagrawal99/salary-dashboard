import { useState, useMemo } from 'react';
import { Users, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { NumericInput } from '@/components/numeric-input';
import { useSettings } from '@/lib/settings-context';
import { FACULTY_POSITIONS } from '@/lib/ugc-data';
import {
  calculateComparison, formatCurrencyINR, formatCurrency, suggestCellFromExperience
} from '@/lib/salary-calculator';

interface HiredPosition {
  id: string;
  positionId: number;
  count: number;
  experience: number;
  cellIndex: number;
}

export default function BulkHiringPage() {
  const { settings, getBenefitsForPosition } = useSettings();

  const [hiredPositions, setHiredPositions] = useState<HiredPosition[]>([]);

  const handleAddPosition = () => {
    const defaultPos = FACULTY_POSITIONS[0];
    const newEntry: HiredPosition = {
      id: `${Date.now()}-${Math.random()}`,
      positionId: defaultPos.id,
      count: 1,
      experience: 0,
      cellIndex: suggestCellFromExperience(defaultPos.level, 0),
    };
    setHiredPositions(prev => [...prev, newEntry]);
  };

  const handleRemovePosition = (id: string) => {
    setHiredPositions(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePosition = (id: string, updates: Partial<HiredPosition>) => {
    setHiredPositions(prev => prev.map(hp => {
      if (hp.id !== id) return hp;
      const updated = { ...hp, ...updates };
      if ('positionId' in updates || 'experience' in updates) {
        const pos = FACULTY_POSITIONS.find(p => p.id === updated.positionId)!;
        updated.cellIndex = suggestCellFromExperience(pos.level, updated.experience);
      }
      return updated;
    }));
  };

  const calculations = useMemo(() => {
    return hiredPositions.map(hp => {
      const pos = FACULTY_POSITIONS.find(p => p.id === hp.positionId)!;
      const result = calculateComparison(
        pos.level,
        hp.cellIndex,
        settings.daPercentage,
        settings.cityType,
        settings.baseMultiplier,
        settings.annualPremium,
        settings.financialStrategy,
        settings.multiplierMethod,
        getBenefitsForPosition(pos.id, pos.level),
        pos.specialAllowance,
        settings.isTPTACity,
        settings.hraConfig,
        settings.enforcementMode,
        settings.positionPremiumRanges[pos.id],
        settings.positionSalaryCaps[pos.id]
      );
      return { hp, pos, result };
    });
  }, [hiredPositions, settings, getBenefitsForPosition]);

  const totals = useMemo(() => {
    let totalCount = 0;
    let totalUGC = 0;
    let totalWPUCTC = 0;

    for (const { hp, result } of calculations) {
      totalCount += hp.count;
      totalUGC += result.ugc.totalAnnual * hp.count;
      totalWPUCTC += result.wpu.totalCTCAnnual * hp.count;
    }

    const premiumOverUGC = totalWPUCTC - totalUGC;
    const premiumPercent = totalUGC > 0 ? (premiumOverUGC / totalUGC) * 100 : 0;

    return {
      totalCount,
      totalUGC,
      totalWPUCTC,
      premiumOverUGC,
      premiumPercent,
    };
  }, [calculations]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            Bulk Hiring Calculator
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-page-description">
            Plan faculty hiring and estimate total costs across UGC and WPU GOA structures.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-tour-id="tour-bulk-stats">
          <Card className="bg-muted/30" data-testid="card-stat-faculty">
            <CardContent className="p-4 space-y-1">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Total Faculty</p>
              <p className="text-2xl font-bold tabular-nums" data-testid="text-stat-faculty-count">{totals.totalCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30" data-testid="card-stat-ugc">
            <CardContent className="p-4 space-y-1">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">UGC Total Cost</p>
              <p className="text-2xl font-bold tabular-nums" data-testid="text-stat-ugc-total">{formatCurrency(totals.totalUGC, true)}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20" data-testid="card-stat-wpu">
            <CardContent className="p-4 space-y-1">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">WPU GOA Total CTC</p>
              <p className="text-2xl font-bold tabular-nums" data-testid="text-stat-wpu-total">{formatCurrency(totals.totalWPUCTC, true)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Faculty Hiring Plan</CardTitle>
              <p className="text-sm text-muted-foreground">Add positions and adjust experience/count to calculate total cost</p>
            </div>
            <Button onClick={handleAddPosition} data-testid="button-add-position">
              <Plus className="h-4 w-4" />
              Add Position
            </Button>
          </CardHeader>
          <CardContent>
            {hiredPositions.length > 0 ? (
              <>
                <div className="hidden md:grid md:grid-cols-[1.5fr_0.8fr_0.6fr_1fr_1fr_auto] gap-3 px-2 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Position</span>
                  <span>Experience</span>
                  <span>Count</span>
                  <span>CTC/Person</span>
                  <span>Total Cost</span>
                  <span className="w-9" />
                </div>

                <div className="space-y-2">
                  {calculations.map(({ hp, pos, result }) => (
                    <div key={hp.id} data-testid={`row-position-${hp.id}`}>
                      <div className="hidden md:grid md:grid-cols-[1.5fr_0.8fr_0.6fr_1fr_1fr_auto] gap-3 items-center rounded-md border p-3">
                        <div>
                          <Select
                            value={String(hp.positionId)}
                            onValueChange={v => handleUpdatePosition(hp.id, { positionId: parseInt(v), experience: 0 })}
                          >
                            <SelectTrigger data-testid={`select-position-trigger-${hp.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FACULTY_POSITIONS.map(p => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.shortTitle}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{pos.title}</p>
                        </div>
                        <NumericInput
                          min={0}
                          max={40}
                          value={hp.experience}
                          onChange={v => handleUpdatePosition(hp.id, { experience: v })}
                          data-testid={`input-experience-${hp.id}`}
                        />
                        <NumericInput
                          min={1}
                          max={50}
                          value={hp.count}
                          onChange={v => handleUpdatePosition(hp.id, { count: v })}
                          data-testid={`input-count-${hp.id}`}
                        />
                        <div>
                          <p className={`text-sm font-medium tabular-nums ${result.wpu.enforcement.ctcCapped || result.wpu.enforcement.salaryCapped ? 'text-red-600 dark:text-red-400' : ''}`} data-testid={`text-ctc-person-${hp.id}`}>
                            {formatCurrency(result.wpu.totalCTCAnnual, true)}
                            {result.wpu.enforcement.ctcCapped && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-1 text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                {settings.enforcementMode === 'hard' ? 'CAP' : '!'}
                              </Badge>
                            )}
                            {result.wpu.enforcement.salaryBelowMin && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-1 text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                LOW
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">UGC: {formatCurrency(result.ugc.totalAnnual, true)}</p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-green-700 dark:text-green-400" data-testid={`text-total-cost-${hp.id}`}>
                          {formatCurrency(result.wpu.totalCTCAnnual * hp.count, true)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemovePosition(hp.id)}
                          data-testid={`button-remove-${hp.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <Card className="md:hidden" data-testid={`card-mobile-position-${hp.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Select
                                value={String(hp.positionId)}
                                onValueChange={v => handleUpdatePosition(hp.id, { positionId: parseInt(v), experience: 0 })}
                              >
                                <SelectTrigger data-testid={`select-position-mobile-trigger-${hp.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FACULTY_POSITIONS.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.shortTitle}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">{pos.title}</p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemovePosition(hp.id)}
                              data-testid={`button-remove-mobile-${hp.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Experience</p>
                              <NumericInput
                                min={0}
                                max={40}
                                value={hp.experience}
                                onChange={v => handleUpdatePosition(hp.id, { experience: v })}
                                data-testid={`input-experience-mobile-${hp.id}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Count</p>
                              <NumericInput
                                min={1}
                                max={50}
                                value={hp.count}
                                onChange={v => handleUpdatePosition(hp.id, { count: v })}
                                data-testid={`input-count-mobile-${hp.id}`}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div>
                              <p className="text-xs text-muted-foreground">CTC/Person</p>
                              <p className="text-sm font-medium tabular-nums">{formatCurrency(result.wpu.totalCTCAnnual, true)}</p>
                              <p className="text-xs text-muted-foreground">UGC: {formatCurrency(result.ugc.totalAnnual, true)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Total Cost</p>
                              <p className="text-sm font-semibold tabular-nums text-green-700 dark:text-green-400">
                                {formatCurrency(result.wpu.totalCTCAnnual * hp.count, true)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Add faculty positions to see hiring cost analysis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {calculations.length > 0 && (
          <div className="space-y-4">
            <Card data-testid="card-key-metrics">
              <CardHeader>
                <CardTitle className="text-base">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Faculty</p>
                    <p className="text-xl font-bold tabular-nums" data-testid="text-metric-faculty">{totals.totalCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">UGC Cost (Annual)</p>
                    <p className="text-xl font-bold tabular-nums" data-testid="text-metric-ugc">{formatCurrency(totals.totalUGC, true)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrencyINR(totals.totalUGC)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">WPU GOA CTC (Annual)</p>
                    <p className="text-xl font-bold tabular-nums" data-testid="text-metric-wpu">{formatCurrency(totals.totalWPUCTC, true)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrencyINR(totals.totalWPUCTC)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Premium Over UGC</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xl font-bold tabular-nums ${totals.premiumOverUGC >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} data-testid="text-metric-premium">
                        {totals.premiumOverUGC >= 0 ? '+' : ''}{formatCurrency(totals.premiumOverUGC, true)}
                      </p>
                      <Badge
                        variant="secondary"
                        className={totals.premiumOverUGC >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}
                        data-testid="badge-premium-percent"
                      >
                        {totals.premiumOverUGC >= 0 ? '+' : ''}{totals.premiumPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatCurrencyINR(totals.premiumOverUGC)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-value-insights">
              <CardHeader>
                <CardTitle className="text-base">Value Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Per Faculty Cost</p>
                    <p className="text-lg font-bold tabular-nums" data-testid="text-insight-avg-cost">
                      Average: {totals.totalCount > 0 ? formatCurrency(totals.totalWPUCTC / totals.totalCount, true) : '0'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Additional Investment</p>
                    <p className="text-lg font-bold tabular-nums" data-testid="text-insight-additional">
                      Per faculty: {totals.totalCount > 0 ? formatCurrency(totals.premiumOverUGC / totals.totalCount, true) : '0'} extra
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Value Proposition</p>
                    <p className={`text-lg font-bold tabular-nums ${totals.premiumOverUGC >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} data-testid="text-insight-value">
                      {totals.premiumOverUGC >= 0 ? '+' : ''}{totals.premiumPercent.toFixed(1)}% {totals.premiumOverUGC >= 0 ? 'better than' : 'below'} UGC standard
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
