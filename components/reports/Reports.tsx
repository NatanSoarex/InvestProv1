
import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, ComposedChart, Bar, Area, Line, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { financialApi } from '../../services/financialApi';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

// Custom Tooltip for Donut Chart
const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-lg shadow-xl">
                <p className="font-bold text-white mb-1">{payload[0].name}</p>
                <p className="text-brand-primary font-mono">{formatCurrency(payload[0].value, 'USD')}</p>
                <p className="text-xs text-brand-secondary mt-1">
                    {payload[0].payload.percent ? (payload[0].payload.percent * 100).toFixed(2) + '%' : ''}
                </p>
            </div>
        );
    }
    return null;
};

// Donut Chart with Central Text
const AssetAllocation: React.FC<{ holdings: Holding[], noDataText: string }> = ({ holdings, noDataText }) => {
    const { formatDisplayValue, totalValue } = usePortfolio();
    
    const data = useMemo(() => {
        return holdings
            .map(h => ({ name: h.asset.ticker, value: h.currentValueUSD }))
            .sort((a, b) => b.value - a.value);
    }, [holdings]);

    if (data.length === 0) return <div className="flex items-center justify-center h-full text-brand-secondary">{noDataText}</div>

    return (
        <div className="relative h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#8B949E' }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-brand-secondary text-xs font-medium uppercase tracking-wider">Total</span>
                <span className="text-brand-text text-xl font-bold">{formatDisplayValue(totalValue)}</span>
            </div>
        </div>
    );
};

const TopPerformers: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
     const sortedHoldings = [...holdings].sort((a,b) => b.totalGainLossUSD - a.totalGainLossUSD);

    return (
        <div className="flex flex-col gap-2">
            {sortedHoldings.slice(0, 5).map(h => {
                const gainInUSD = h.totalGainLossUSD;
                return (
                    <div key={h.asset.ticker} className="flex justify-between items-center p-3 bg-brand-bg/30 rounded-lg border border-brand-border/50">
                        <div className="flex items-center gap-3">
                            <img src={h.asset.logo} className="w-8 h-8 rounded-full bg-brand-surface object-cover border border-brand-border" alt="" onError={(e) => e.currentTarget.src=`https://ui-avatars.com/api/?name=${h.asset.ticker}&background=30363D&color=C9D1D9`}/>
                            <div>
                                <p className="font-bold text-brand-text text-sm">{h.asset.ticker}</p>
                                <p className="text-[10px] text-brand-secondary uppercase">{h.asset.assetClass}</p>
                            </div>
                        </div>
                        <div className={`font-bold text-sm font-mono ${gainInUSD >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {gainInUSD > 0 ? '+' : ''}{formatCurrency(gainInUSD, 'USD')}
                        </div>
                    </div>
                );
            })}
        </div>
    )
}

const Reports: React.FC = () => {
    const { holdings, totalInvested, totalValue, totalGainLoss, transactions, fxRate, t, settings, formatDisplayValue } = usePortfolio();
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const processHistory = async () => {
            if (transactions.length === 0) {
                setIsLoading(false);
                return;
            }

            // 1. Get Full Price History (Snapshot Mode for Net Worth Curve)
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            
            // 2. Calculate Monthly Contributions (Aportes) from Transactions
            const contributionsByMonth: Record<string, number> = {};
            const investedAccumulatedByMonth: Record<string, number> = {};
            
            // Sort transactions by date
            const sortedTx = [...transactions].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            
            let runningInvested = 0;
            
            // Map transactions to months
            sortedTx.forEach(tx => {
                const date = new Date(tx.dateTime);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                // Convert cost to USD if needed based on asset type/settings (Simplified here as totalCost is usually stored native)
                // Assuming context handles currency normalization, but we use raw totalCost here.
                // NOTE: In a perfect world, we check asset currency. For now, we sum raw.
                let cost = tx.totalCost; 
                if (tx.ticker.endsWith('.SA') && fxRate > 0) cost = cost / fxRate; // Normalize BRL inputs to USD for calculation

                if (!contributionsByMonth[key]) contributionsByMonth[key] = 0;
                contributionsByMonth[key] += cost;
            });

            // 3. Group History by Month for Net Worth
            const groupedHistory: Record<string, any> = {};
            
            history.forEach(point => {
                const date = new Date(point.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                // Keep replacing to get the last value of the month
                groupedHistory[key] = {
                    dateKey: key,
                    timestamp: date.getTime(),
                    netWorth: point.price, // Valor de mercado (Curva)
                    displayDate: date.toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                };
            });

            // 4. Merge Data
            const allKeys = Array.from(new Set([...Object.keys(groupedHistory), ...Object.keys(contributionsByMonth)])).sort();
            
            let accumulatedInvested = 0;
            
            const finalData = allKeys.map(key => {
                const contribution = contributionsByMonth[key] || 0;
                accumulatedInvested += contribution;
                
                const historyPoint = groupedHistory[key] || {};
                
                return {
                    ...historyPoint,
                    dateKey: key,
                    displayDate: historyPoint.displayDate || key,
                    contribution: contribution, // Barra (Aporte do Mês)
                    accumulatedInvested: accumulatedInvested, // Linha (Total Investido)
                    netWorth: historyPoint.netWorth || accumulatedInvested // Área (Patrimônio) - Fallback to invested if no history
                };
            });

            // Filter out empty months at start if any
            const firstNonZeroIndex = finalData.findIndex(d => d.netWorth > 0 || d.contribution > 0);
            const trimmedData = firstNonZeroIndex >= 0 ? finalData.slice(firstNonZeroIndex) : [];

            setMonthlyData(trimmedData);
            setIsLoading(false);
        };

        processHistory();
    }, [transactions, fxRate, settings.language]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">{t('reportsTitle')}</h1>
                <p className="text-brand-secondary mt-1">{t('reportsSubtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-brand-secondary bg-brand-surface/50">
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('totalInvested')}</div>
                        <div className="text-2xl font-bold text-brand-text mt-1">{formatDisplayValue(totalInvested)}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-brand-primary bg-brand-surface/50">
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('finalBalance')}</div>
                        <div className="text-2xl font-bold text-brand-primary mt-1">{formatDisplayValue(totalValue)}</div>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 bg-brand-surface/50 ${totalGainLoss >= 0 ? 'border-l-brand-success' : 'border-l-brand-danger'}`}>
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('monthlyYield')} (Total)</div>
                        <div className={`text-2xl font-bold mt-1 ${totalGainLoss >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {totalGainLoss > 0 ? '+' : ''}{formatCurrency(totalGainLoss, 'USD')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHART: Aporte Mensal (Barra) vs Patrimônio (Área) */}
            <Card className="bg-brand-surface border-brand-border">
                <CardHeader className="flex items-center gap-2 border-brand-border/30">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    {t('monthlyEvolution')} (Aporte vs Patrimônio)
                </CardHeader>
                <CardContent className="h-[400px]">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" opacity={0.3} vertical={false} />
                                <XAxis 
                                    dataKey="displayDate" 
                                    stroke="#8B949E" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#8B949E" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#30363D', opacity: 0.2 }}
                                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                    formatter={(value: number, name: string) => [formatCurrency(value, 'USD'), name]}
                                    labelStyle={{ color: '#8B949E', marginBottom: '5px' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#C9D1D9' }} />
                                
                                {/* Área: Patrimônio Líquido (Fundo) */}
                                <Area 
                                    type="monotone" 
                                    dataKey="netWorth" 
                                    name={t('finalBalance')} 
                                    stroke="#10B981" 
                                    fill="url(#colorNetWorth)" 
                                    strokeWidth={2}
                                />

                                {/* Linha: Total Investido (Escada Acumulada) */}
                                <Line 
                                    type="stepAfter" 
                                    dataKey="accumulatedInvested" 
                                    name={t('accumulatedInvested')} 
                                    stroke="#6B7280" 
                                    strokeDasharray="4 4" 
                                    strokeWidth={1}
                                    dot={false}
                                />

                                {/* Barra: Aporte do Mês (Só aparece se > 0) */}
                                <Bar 
                                    dataKey="contribution" 
                                    name={t('monthlyContribution')} 
                                    fill="#3B82F6" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                />
                                
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-brand-secondary flex-col gap-2">
                            {isLoading ? (
                                <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                            ) : (
                                <p>{t('noData')}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-2 border-brand-border">
                    <CardHeader className="border-brand-border/30">{t('allocationByClass')}</CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        <AssetAllocation holdings={holdings} noDataText={t('noData')} />
                    </CardContent>
                </Card>
                <Card className="border-brand-border">
                    <CardHeader className="border-brand-border/30">{t('topPerformers')}</CardHeader>
                    <CardContent>
                         {holdings.length > 0 ? <TopPerformers holdings={holdings} /> : <div className="text-center p-8 text-brand-secondary">{t('noData')}</div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
