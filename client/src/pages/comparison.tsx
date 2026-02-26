import { useMemo, useState } from 'react';
import { BarChart3, Table2, Filter, Eye, EyeOff } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { InfoTooltip } from '@/components/info-tooltip';
import { useSettings } from '@/lib/settings-context';
import { FACULTY_POSITIONS, PAY_MATRIX } from '@/lib/ugc-data';
import {
  calculateComparison, calculate8thCPCSalary, suggestCellFromExperience, formatCurrencyINR, formatCurrency
} from '@/lib/salary-calculator';

const INDIGO = 'hsl(230, 55%, 55%)';
const GREEN = 'hsl(160, 45%, 48%)';
const AMBER = 'hsl(30, 70%, 55%)';
const PURPLE = 'hsl(270, 45%, 55%)';

function currencyTooltipFormatter(value: number) {
  return formatCurrencyINR(value);
}

export default function ComparisonPage() {
  const { settings, getBenefitsForPosition } = useSettings();
  const [visiblePositions, setVisiblePositions] = useState<Set<number>>(
    () => new Set(FACULTY_POSITIONS.filter(p => !p.title.toLowerCase().includes('principal')).map(p => p.id))
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [seriesMode, setSeriesMode] = useState<'all' | 'selected'>('all');
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(
    () => new Set(['UGC Annual', '8th CPC Annual', 'WPU Salary', 'WPU Benefits'])
  );

  const togglePosition = (id: number) => {
    setVisiblePositions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const showAll = () => setVisiblePositions(new Set(FACULTY_POSITIONS.map(p => p.id)));
  const showNoneExcept = (ids: number[]) => setVisiblePositions(new Set(ids));

  const comparisonData = useMemo(() => {
    return FACULTY_POSITIONS.map((pos) => {
      const cellIndex = suggestCellFromExperience(pos.level, pos.minExperience);
      const result = calculateComparison(
        pos.level,
        cellIndex,
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
      const eighthCpc = calculate8thCPCSalary(
        result.ugc.basic,
        settings.eighthCpcFitmentFactor,
        settings.eighthCpcDaPercent,
        settings.cityType,
        pos.level,
        pos.specialAllowance,
        settings.isTPTACity,
        settings.hraConfig,
        result.ugc.totalMonthly
      );
      return {
        position: pos,
        cellIndex,
        result,
        eighthCpc,
      };
    });
  }, [settings, getBenefitsForPosition]);

  const filteredData = useMemo(() => 
    comparisonData.filter(d => visiblePositions.has(d.position.id)),
    [comparisonData, visiblePositions]
  );

  const barChartData = filteredData.map((d) => ({
    name: d.position.shortTitle,
    'UGC Annual': d.result.ugc.totalAnnual,
    '8th CPC Annual': d.eighthCpc.totalAnnual,
    'WPU Salary': d.result.wpu.totalSalaryAnnual,
    'WPU Benefits': d.result.wpu.benefits.totalAnnual,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            All Positions Comparison
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-page-description">
            Side-by-side comparison of UGC 7th CPC, projected 8th CPC, and WPU GOA salary structures across all 8 faculty positions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(!filterOpen)}
            data-testid="button-toggle-filter"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter Positions
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              {visiblePositions.size}/{FACULTY_POSITIONS.length}
            </Badge>
          </Button>
          {visiblePositions.size < FACULTY_POSITIONS.length && (
            <Button variant="ghost" size="sm" onClick={showAll} data-testid="button-show-all">
              Show All
            </Button>
          )}
        </div>

        {/* Series filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Salary series:</span>
          <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
            <Button variant="ghost" size="sm" className={`toggle-elevate ${seriesMode === 'all' ? 'toggle-elevated' : ''}`} onClick={() => setSeriesMode('all')}>All</Button>
            <Button variant="ghost" size="sm" className={`toggle-elevate ${seriesMode === 'selected' ? 'toggle-elevated' : ''}`} onClick={() => setSeriesMode('selected')}>Selected</Button>
          </div>
          {seriesMode === 'selected' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['UGC Annual', '8th CPC Annual', 'WPU Salary', 'WPU Benefits'] as const).map(s => {
                const active = selectedSeries.has(s);
                return (
                  <Button key={s} variant="ghost" size="sm"
                    className={`toggle-elevate gap-1.5 ${active ? 'toggle-elevated' : ''}`}
                    onClick={() => setSelectedSeries(prev => {
                      const next = new Set(prev);
                      if (next.has(s)) { if (next.size > 1) next.delete(s); }
                      else next.add(s);
                      return next;
                    })}>
                    {active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {s}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {filterOpen && (
          <div className="rounded-md bg-muted/40 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {FACULTY_POSITIONS.map(pos => {
                const isVisible = visiblePositions.has(pos.id);
                return (
                  <Button
                    key={pos.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePosition(pos.id)}
                    data-testid={`button-toggle-position-${pos.id}`}
                    className={`gap-1.5 toggle-elevate ${isVisible ? 'toggle-elevated' : ''}`}
                  >
                    {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {pos.shortTitle}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Quick:</span>
              <Button variant="ghost" size="sm" onClick={showAll} data-testid="button-filter-all">All</Button>
              <Button variant="ghost" size="sm" onClick={() => showNoneExcept([1, 2, 3])} data-testid="button-filter-assistant">Assistant</Button>
              <Button variant="ghost" size="sm" onClick={() => showNoneExcept([4])} data-testid="button-filter-associate">Associate</Button>
              <Button variant="ghost" size="sm" onClick={() => showNoneExcept([5, 6])} data-testid="button-filter-professor">Professor</Button>
              <Button variant="ghost" size="sm" onClick={() => showNoneExcept([7, 8])} data-testid="button-filter-principal">Principal</Button>
            </div>
          </div>
        )}

        <Card data-tour-id="tour-comparison-chart">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Annual Salary Comparison</CardTitle>
            </div>
            <CardDescription>
              UGC annual salary vs WPU GOA CTC (salary + benefits stacked) across all positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Hover over bars to see exact figures. Scroll horizontally on mobile.</p>
            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
              <div className="min-w-[600px]">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={currencyTooltipFormatter} />
                    <Legend />
                    {(seriesMode === 'all' || selectedSeries.has('UGC Annual')) && <Bar dataKey="UGC Annual" fill={INDIGO} radius={[2, 2, 0, 0]} />}
                    {(seriesMode === 'all' || selectedSeries.has('8th CPC Annual')) && <Bar dataKey="8th CPC Annual" fill={PURPLE} radius={[2, 2, 0, 0]} />}
                    {(seriesMode === 'all' || selectedSeries.has('WPU Salary')) && <Bar dataKey="WPU Salary" stackId="wpu" fill={GREEN} />}
                    {(seriesMode === 'all' || selectedSeries.has('WPU Benefits')) && <Bar dataKey="WPU Benefits" stackId="wpu" fill={AMBER} radius={[2, 2, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Detailed Comparison</CardTitle>
            </div>
            <CardDescription>
              Complete breakdown with premium analysis for each position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="hidden md:table" data-testid="table-comparison">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Position
                      <InfoTooltip
                        shortText="Faculty position"
                        title="Position"
                        detail="The faculty designation as per UGC norms, including Assistant Professor levels, Associate Professor, Professor, and Principal positions."
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Level
                      <InfoTooltip
                        shortText="Pay matrix level"
                        title="Level"
                        detail="The academic pay level as per the 7th CPC pay matrix. Ranges from Level 10 (entry-level Assistant Professor) to Level 15 (Professor HAG)."
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Cell
                      <InfoTooltip
                        shortText="Cell in pay matrix"
                        title="Cell"
                        detail="The cell index within the pay level, corresponding to years of experience and annual increments."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      UGC Annual
                      <InfoTooltip
                        shortText="Total UGC annual salary"
                        title="UGC Annual Salary"
                        detail="Total annual salary as per UGC norms including Basic Pay + DA + HRA + TA + Special Allowance."
                      />
                    </div>
                  </TableHead>
                  {(seriesMode === 'all' || selectedSeries.has('8th CPC Annual')) && (
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      8th CPC Annual
                      <InfoTooltip
                        shortText="Projected 8th CPC annual salary"
                        title="8th CPC Projected Annual Salary"
                        detail="Projected annual salary under the 8th Pay Commission using the configured fitment factor. DA starts at 0% on implementation day (January 1, 2026). Configure the fitment factor and projected DA in Settings."
                      />
                    </div>
                  </TableHead>
                  )}
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      WPU Salary
                      <InfoTooltip
                        shortText="WPU GOA annual salary"
                        title="WPU GOA Annual Salary"
                        detail="Total annual salary offered by WPU GOA based on the selected multiplier method and financial strategy."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      WPU CTC
                      <InfoTooltip
                        shortText="WPU GOA total CTC"
                        title="WPU GOA Annual CTC"
                        detail="Total Cost to Company including salary plus all benefits (housing, professional development, PPF, gratuity, health insurance)."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Premium
                      <InfoTooltip
                        shortText="CTC premium over UGC"
                        title="Premium Amount"
                        detail="The difference between WPU GOA CTC and UGC Annual salary, representing the additional compensation offered."
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Premium %
                      <InfoTooltip
                        shortText="Percentage premium"
                        title="Premium Percentage"
                        detail="The premium as a percentage of UGC annual salary. Higher percentage indicates more competitive WPU GOA compensation."
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((d) => {
                  const isPositive = d.result.premiumAmountAnnual >= 0;
                  return (
                    <TableRow key={d.position.id} data-testid={`row-position-${d.position.id}`}>
                      <TableCell className="font-medium">{d.position.shortTitle}</TableCell>
                      <TableCell>{d.position.level}</TableCell>
                      <TableCell>{d.cellIndex + 1}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(d.result.ugc.totalAnnual, true)}
                      </TableCell>
                      {(seriesMode === 'all' || selectedSeries.has('8th CPC Annual')) && (
                      <TableCell className="text-right tabular-nums text-purple-700 dark:text-purple-300 font-medium">
                        {formatCurrency(d.eighthCpc.totalAnnual, true)}
                      </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">
                        <span className={d.result.wpu.enforcement.salaryCapped || d.result.wpu.enforcement.salaryBelowMin ? 'text-red-600 dark:text-red-400' : ''}>
                          {formatCurrency(d.result.wpu.totalSalaryAnnual, true)}
                        </span>
                        {d.result.wpu.enforcement.salaryCapped && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-1 text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            {settings.enforcementMode === 'hard' ? 'CAP' : '!'}
                          </Badge>
                        )}
                        {d.result.wpu.enforcement.salaryBelowMin && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-1 text-[9px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            LOW
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={d.result.wpu.enforcement.ctcCapped ? 'text-red-600 dark:text-red-400' : ''}>
                          {formatCurrency(d.result.wpu.totalCTCAnnual, true)}
                        </span>
                        {d.result.wpu.enforcement.ctcCapped && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate ml-1 text-[9px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            {settings.enforcementMode === 'hard' ? 'CAP' : '!'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(d.result.premiumAmountAnnual, true)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className={isPositive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}
                          data-testid={`badge-premium-${d.position.id}`}
                        >
                          {isPositive ? '+' : ''}{d.result.premiumPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="md:hidden space-y-3" data-testid="cards-comparison-mobile">
              {filteredData.map((d) => {
                const isPositive = d.result.premiumAmountAnnual >= 0;
                return (
                  <div
                    key={d.position.id}
                    className="rounded-md border p-3.5 space-y-2"
                    data-testid={`card-position-${d.position.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{d.position.shortTitle}</span>
                      <Badge
                        variant="secondary"
                        className={isPositive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}
                      >
                        {isPositive ? '+' : ''}{d.result.premiumPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Level / Cell</span>
                      <span className="text-right tabular-nums">{d.position.level} / {d.cellIndex + 1}</span>
                      <span className="text-muted-foreground">UGC Annual</span>
                      <span className="text-right tabular-nums">{formatCurrency(d.result.ugc.totalAnnual, true)}</span>
                      {(seriesMode === 'all' || selectedSeries.has('8th CPC Annual')) && (<>
                      <span className="text-muted-foreground">8th CPC Annual</span>
                      <span className="text-right tabular-nums text-purple-700 dark:text-purple-300 font-medium">{formatCurrency(d.eighthCpc.totalAnnual, true)}</span>
                      </>)}
                      <span className="text-muted-foreground">WPU Salary</span>
                      <span className={`text-right tabular-nums ${d.result.wpu.enforcement.salaryCapped || d.result.wpu.enforcement.salaryBelowMin ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(d.result.wpu.totalSalaryAnnual, true)}</span>
                      <span className="text-muted-foreground">WPU CTC</span>
                      <span className={`text-right tabular-nums ${d.result.wpu.enforcement.ctcCapped ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(d.result.wpu.totalCTCAnnual, true)}</span>
                      <span className="text-muted-foreground">Premium</span>
                      <span className="text-right tabular-nums">{formatCurrency(d.result.premiumAmountAnnual, true)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
