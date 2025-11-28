import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { financialApi } from '../../services/financialApi';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

// Custom Tooltip for Donut Chart (Glass Style)
const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#151B28]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl">
                <p className="font-bold text-white mb-1 text-sm">{payload[0].name}</p>
                <p className="text-brand-primary font-mono font-bold text-base">{formatCurrency(payload[0].value, 'USD')}</p>
                <p className="text-xs text-brand-secondary mt-1">
                    {payload[0].payload.percent ? (payload[0].payload.percent * 100).toFixed(2) + '%' : ''}
                </p>
            </div>
        );
    }
    return null;
};

// Custom Tooltip for Stacked Bar (Investidor 10 Style)
const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const invested = data.invested || 0;
        const gain = data.realGain || 0; 
        const total = data.totalValue || 0;

        return (
            <div className="bg-[#151B28]/95 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl min-w-[200px]">
                <p className="text-brand-secondary text-xs mb-3 font-bold uppercase tracking-wider">{label}</p>
                
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
                        <span className="text-xs text-brand-secondary font-medium">Aplicado</span>
                    </div>
                    <span className="text-xs text-white font-mono">{formatCurrency(invested, 'USD')}</span>
                </div>

                <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${gain >= 0 ? 'bg-[#34D399]' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-brand-secondary font-medium">Resultado</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${gain >= 0 ? 'text-[#34D399]' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain, 'USD')}
                    </span>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-white font-bold">Saldo Final</span>
                    <span className="text-sm text-brand-primary font-bold font-mono">{formatCurrency(total, 'USD')}</span>
                </div>
            </div>
        );
    }
    return null;
};

const AssetAllocation: React.FC<{ holdings: Holding[], noDataText: string }> = ({ holdings, noDataText }) => {
    const { formatDisplayValue, totalValue } = usePortfolio();
    
    const data = useMemo(() => {
        return holdings
            .map(h => ({ name: h.asset.ticker, value: h.currentValueUSD }))
            .sort((a, b) => b.value - a.value);
    }, [holdings]);

    if (data.length === 0) return <div className="flex items-center justify-center h-full text-brand-secondary">{noDataText}</div>

    return (
        <div className="relative h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={85}
                        outerRadius={115}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                        cornerRadius={4}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-brand-secondary text-[10px] font-bold uppercase tracking-widest mb-1">Total</span>
                <span className="text-white text-xl font-bold font-mono">{formatDisplayValue(totalValue)}</span>
            </div>
        </div>
    );
};

const TopPerformers: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
     const sortedHoldings = [...holdings].sort((a,b) => b.totalGainLossUSD - a.totalGainLossUSD);

    return (
        <div className="flex flex-col gap-3">
            {sortedHoldings.slice(0, 5).map((h, index) => {
                const gainInUSD = h.totalGainLossUSD;
                return (
                    <div key={h.asset.ticker} className="flex justify-between items-center p-3 bg-brand-bg/40 rounded-xl border border-white/5 hover:border-brand-primary/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="text-brand-secondary text-xs font-bold w-4">{index + 1}</div>
                            <img src={h.asset.logo} className="w-8 h-8 rounded-lg bg-black object-cover border border-white/10" alt="" onError={(e) => e.currentTarget.src=`https://ui-avatars.com/api/?name=${h.asset.ticker}&background=30363D&color=C9D1D9`}/>
                            <div>
                                <p className="font-bold text-white text-sm group-hover:text-brand-primary transition-colors">{h.asset.ticker}</p>
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

            // 1. Snapshot History
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            
            const totalCurrentInvested = transactions.reduce((acc, t) => acc + t.totalCost, 0);

            const sortedTx = [...transactions].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            const firstTxDate = sortedTx.length > 0 ? new Date(sortedTx[0].dateTime) : new Date();
            
            const getMonthId = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);
            const startMonthId = getMonthId(firstTxDate);

            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const contributionsByMonth: Record<string, number> = {};
            transactions.forEach(tx => {
                const date = new Date(tx.dateTime);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                let cost = tx.totalCost;
                if (tx.ticker.endsWith('.SA') && fxRate > 0) cost = cost / fxRate;
                if (!contributionsByMonth[key]) contributionsByMonth[key] = 0;
                contributionsByMonth[key] += cost;
            });

            const groupedHistory: Record<string, any> = {};
            history.forEach(point => {
                const date = new Date(point.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                groupedHistory[key] = {
                    dateKey: key,
                    snapshotValue: point.price, 
                    displayDate: date.toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                };
            });

            if (!groupedHistory[currentMonthKey]) {
                groupedHistory[currentMonthKey] = {
                    dateKey: currentMonthKey,
                    snapshotValue: 0, 
                    displayDate: now.toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                }
            }

            const allKeys = Array.from(new Set([...Object.keys(groupedHistory), ...Object.keys(contributionsByMonth)])).sort();
            
            let runningInvested = 0;
            let lastKnownSnapshotValue = 0;
            
            const finalData = allKeys.map(key => {
                const [yearStr, monthStr] = key.split('-');
                const currentMonthId = parseInt(yearStr) * 100 + parseInt(monthStr);

                const contribution = contributionsByMonth[key] || 0;
                runningInvested += contribution;
                
                const historyPoint = groupedHistory[key] || { 
                    displayDate: new Date(Number(yearStr), Number(monthStr)-1).toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                };
                
                let rawSnapshotValue = historyPoint.snapshotValue;
                if (rawSnapshotValue === undefined || rawSnapshotValue === null) {
                    rawSnapshotValue = lastKnownSnapshotValue;
                } else {
                    lastKnownSnapshotValue = rawSnapshotValue;
                }
                
                // CRITICAL FIX: FORCE CURRENT MONTH TO MATCH LIVE PORTFOLIO
                // This resolves the "Zero Profit" bug for the current month
                if (key === currentMonthKey) {
                    // Calculate Live USD Total from Holdings
                    const liveTotalUSD = holdings.reduce((acc, h) => acc + h.currentValueUSD, 0);
                    rawSnapshotValue = liveTotalUSD > 0 ? liveTotalUSD : rawSnapshotValue; 
                }

                if (currentMonthId < startMonthId) {
                    return { dateKey: key, displayDate: historyPoint.displayDate || key, invested: 0, gain: 0, realGain: 0, totalValue: 0 };
                }

                if (runningInvested <= 0) {
                     return { dateKey: key, displayDate: historyPoint.displayDate || key, invested: 0, gain: 0, realGain: 0, totalValue: 0 };
                }

                // RATIO SCALING
                let adjustedNetWorth = rawSnapshotValue;
                
                // Scale past months, but TRUST current month live value
                if (key !== currentMonthKey && totalCurrentInvested > 0) {
                    const ratio = runningInvested / totalCurrentInvested;
                    adjustedNetWorth = rawSnapshotValue * ratio;
                }

                // If calculated value is unreasonably close to invested (flat), assume flat
                if (Math.abs(adjustedNetWorth - runningInvested) < 1) {
                    adjustedNetWorth = runningInvested;
                }

                let realGain = adjustedNetWorth - runningInvested;
                
                return {
                    dateKey: key,
                    displayDate: historyPoint.displayDate || key,
                    invested: runningInvested,
                    gain: realGain > 0 ? realGain : 0, 
                    realGain: realGain, 
                    totalValue: adjustedNetWorth
                };
            });

            const firstActiveIndex = finalData.findIndex(d => d.invested > 0);
            const trimmedData = firstActiveIndex >= 0 ? finalData.slice(firstActiveIndex) : [];

            setMonthlyData(trimmedData);
            setIsLoading(false);
        };

        processHistory();
    }, [transactions, fxRate, settings.language, holdings, totalValue]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-32">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-text tracking-tight">{t('reportsTitle')}</h1>
                    <p className="text-brand-secondary mt-1">{t('reportsSubtitle')}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-t-4 border-t-brand-secondary bg-[#151B28]/80 backdrop-blur-md">
                    <CardContent>
                        <div className="text-[10px] font-bold uppercase text-brand-secondary tracking-widest">{t('totalInvested')}</div>
                        <div className="text-2xl font-bold text-white mt-2 font-mono">{formatDisplayValue(totalInvested)}</div>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-brand-primary bg-[#151B28]/80 backdrop-blur-md">
                    <CardContent>
                        <div className="text-[10px] font-bold uppercase text-brand-secondary tracking-widest">{t('finalBalance')}</div>
                        <div className="text-2xl font-bold text-brand-primary mt-2 font-mono">{formatDisplayValue(totalValue)}</div>
                    </CardContent>
                </Card>
                <Card className={`border-t-4 bg-[#151B28]/80 backdrop-blur-md ${totalGainLoss >= 0 ? 'border-t-brand-success' : 'border-t-brand-danger'}`}>
                    <CardContent>
                        <div className="text-[10px] font-bold uppercase text-brand-secondary tracking-widest">{t('monthlyYield')} (Total)</div>
                        <div className={`text-2xl font-bold mt-2 font-mono ${totalGainLoss >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {totalGainLoss > 0 ? '+' : ''}{formatCurrency(totalGainLoss, 'USD')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-[#151B28]/80 backdrop-blur-md border border-white/5 shadow-2xl">
                <CardHeader className="flex items-center gap-3 border-white/5 pb-4">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary shadow-neon">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-white">{t('monthlyEvolution')}</span>
                </CardHeader>
                <CardContent className="h-[450px] w-full pt-4">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 10, bottom: 20, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                                <XAxis 
                                    dataKey="displayDate" 
                                    stroke="#64748B" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={15}
                                    fontFamily="Inter"
                                />
                                <YAxis 
                                    stroke="#64748B" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)}
                                    fontFamily="JetBrains Mono"
                                />
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#30363D', opacity: 0.2 }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }} />
                                
                                <Bar 
                                    dataKey="invested" 
                                    name={t('appliedValue')} 
                                    stackId="a" 
                                    fill="#059669" 
                                    radius={[0, 0, 0, 0]} 
                                    barSize={24}
                                    animationDuration={1500}
                                />
                                <Bar 
                                    dataKey="gain" 
                                    name={t('capitalGain')} 
                                    stackId="a" 
                                    fill="#34D399" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={24}
                                    animationDuration={1500}
                                />
                                
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-brand-secondary flex-col gap-4 opacity-50">
                            {isLoading ? (
                                <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-4xl mb-2 grayscale">📊</div>
                                    <p>{t('noData')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-2 border-brand-border/50 bg-[#151B28]/80 backdrop-blur-md">
                    <CardHeader className="border-white/5">{t('allocationByClass')}</CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        <AssetAllocation holdings={holdings} noDataText={t('noData')} />
                    </CardContent>
                </Card>
                <Card className="border-brand-border/50 bg-[#151B28]/80 backdrop-blur-md">
                    <CardHeader className="border-white/5">{t('topPerformers')}</CardHeader>
                    <CardContent>
                         {holdings.length > 0 ? <TopPerformers holdings={holdings} /> : <div className="text-center p-8 text-brand-secondary opacity-50">{t('noData')}</div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Reports;