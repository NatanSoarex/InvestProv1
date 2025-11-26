
import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
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

            // 1. Get Full Price History (Mode: All Time)
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            
            // 2. Calculate Monthly Data
            const groupedHistory: Record<string, any> = {};
            const contributionsByMonth: Record<string, number> = {};
            
            // Determine Start Date (First Transaction)
            const sortedTx = [...transactions].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            const firstTxDate = sortedTx.length > 0 ? new Date(sortedTx[0].dateTime) : new Date();
            const startMonthKey = `${firstTxDate.getFullYear()}-${String(firstTxDate.getMonth() + 1).padStart(2, '0')}`;

            // Group transactions by month to calculate Accumulated Invested
            transactions.forEach(tx => {
                const date = new Date(tx.dateTime);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                let cost = tx.totalCost;
                if (tx.ticker.endsWith('.SA') && fxRate > 0) cost = cost / fxRate;
                if (!contributionsByMonth[key]) contributionsByMonth[key] = 0;
                contributionsByMonth[key] += cost;
            });

            // Group history by month to find Net Worth at end of month
            history.forEach(point => {
                const date = new Date(point.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                // Keep updating netWorth so the last point of the month wins
                groupedHistory[key] = {
                    dateKey: key,
                    netWorth: point.price, 
                    displayDate: date.toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                };
            });

            const allKeys = Array.from(new Set([...Object.keys(groupedHistory), ...Object.keys(contributionsByMonth)])).sort();
            
            let runningInvested = 0;
            
            const finalData = allKeys.map(key => {
                const contribution = contributionsByMonth[key] || 0;
                runningInvested += contribution;
                
                const historyPoint = groupedHistory[key] || {};
                let netWorth = historyPoint.netWorth || runningInvested;
                
                // STRICT FIX: Zero out everything before the first investment month
                if (key < startMonthKey) {
                    runningInvested = 0;
                    return {
                        dateKey: key,
                        displayDate: historyPoint.displayDate || key,
                        invested: 0,
                        gain: 0,
                        totalValue: 0
                    };
                }

                // STACKED BAR LOGIC (Investidor 10 Style)
                let investedBar = runningInvested;
                let gainBar = 0;
                
                // Logic: If Total Invested is 0, Gain MUST be 0.
                if (runningInvested > 0) {
                    if (netWorth > runningInvested) {
                        gainBar = netWorth - runningInvested;
                    }
                } else {
                    investedBar = 0;
                    gainBar = 0;
                    netWorth = 0;
                }
                
                return {
                    dateKey: key,
                    displayDate: historyPoint.displayDate || key,
                    invested: investedBar,
                    gain: gainBar,
                    totalValue: netWorth
                };
            });

            // Filter out empty trailing/leading months if needed, but keep the logic strict
            const firstRealDataIndex = finalData.findIndex(d => d.totalValue > 0 || d.invested > 0);
            const trimmedData = firstRealDataIndex >= 0 ? finalData.slice(firstRealDataIndex) : [];

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

            {/* CHART: Evolução Patrimonial (Estilo Investidor 10 - Stacked) */}
            <Card className="bg-brand-surface border-brand-border">
                <CardHeader className="flex items-center gap-2 border-brand-border/30">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    {t('monthlyEvolution')} (Valor Aplicado + Ganho de Capital)
                </CardHeader>
                <CardContent className="h-[400px]">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
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
                                
                                {/* Barra: Valor Aplicado (Base Escura) */}
                                <Bar 
                                    dataKey="invested" 
                                    name={t('appliedValue')} 
                                    stackId="a" 
                                    fill="#059669" // Darker Green
                                    radius={[0, 0, 0, 0]} 
                                    barSize={20} 
                                />
                                
                                {/* Barra: Ganho de Capital (Topo Claro) */}
                                <Bar 
                                    dataKey="gain" 
                                    name={t('capitalGain')} 
                                    stackId="a" 
                                    fill="#34D399" // Lighter Green
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20} 
                                />
                                
                            </BarChart>
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
