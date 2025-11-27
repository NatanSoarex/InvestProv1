import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid, ComposedChart } from 'recharts';
import { Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { financialApi } from '../../services/financialApi';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-brand-surface border border-white/10 p-3 rounded-lg shadow-xl">
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

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const invested = data.invested || 0;
        const gain = data.realGain || 0; 
        const total = data.totalValue || 0;

        return (
            <div className="bg-brand-surface border border-white/10 p-3 rounded-lg shadow-xl min-w-[180px]">
                <p className="text-brand-secondary text-xs mb-2 font-bold uppercase">{label}</p>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-brand-success font-medium">● Valor Aplicado:</span>
                        <span className="text-white font-mono">{formatCurrency(invested, 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-xs pb-2 border-b border-white/10">
                        <span className={`font-medium ${gain >= 0 ? 'text-brand-primary' : 'text-brand-danger'}`}>● Resultado:</span>
                        <span className={`font-mono ${gain >= 0 ? 'text-white' : 'text-brand-danger'}`}>
                            {gain >= 0 ? '+' : ''}{formatCurrency(gain, 'USD')}
                        </span>
                    </div>
                    <div className="flex justify-between pt-1">
                        <span className="text-sm text-white font-bold">Saldo:</span>
                        <span className="text-sm text-brand-primary font-bold font-mono">{formatCurrency(total, 'USD')}</span>
                    </div>
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
        <div className="relative h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }} />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-brand-secondary text-xs font-bold uppercase">Total</span>
                <span className="text-white text-lg font-bold font-mono">{formatDisplayValue(totalValue)}</span>
            </div>
        </div>
    );
};

const Reports: React.FC = () => {
    const { totalInvested, totalValue, totalGainLoss, transactions, fxRate, t, settings, formatDisplayValue } = usePortfolio();
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const processHistory = async () => {
            if (transactions.length === 0) {
                setIsLoading(false);
                return;
            }
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            const totalCurrentInvested = transactions.reduce((acc, t) => acc + t.totalCost, 0);
            
            const sortedTx = [...transactions].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            const firstTxDate = sortedTx.length > 0 ? new Date(sortedTx[0].dateTime) : new Date();
            const getMonthId = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);
            const startMonthId = getMonthId(firstTxDate);

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

            const allKeys = Array.from(new Set([...Object.keys(groupedHistory), ...Object.keys(contributionsByMonth)])).sort();
            let runningInvested = 0;
            
            const finalData = allKeys.map(key => {
                const [yearStr, monthStr] = key.split('-');
                const currentMonthId = parseInt(yearStr) * 100 + parseInt(monthStr);
                const contribution = contributionsByMonth[key] || 0;
                runningInvested += contribution;
                const historyPoint = groupedHistory[key] || {};
                const rawSnapshotValue = historyPoint.snapshotValue || 0;
                
                if (currentMonthId < startMonthId || runningInvested <= 0) {
                    return { dateKey: key, displayDate: historyPoint.displayDate || key, invested: 0, gain: 0, realGain: 0, totalValue: 0 };
                }

                let adjustedNetWorth = rawSnapshotValue;
                if (totalCurrentInvested > 0) {
                    const ratio = runningInvested / totalCurrentInvested;
                    adjustedNetWorth = rawSnapshotValue * ratio;
                }
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
    }, [transactions, fxRate, settings.language]);

    // ADDED pb-32 to fix cutting off on mobile
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32">
            <div>
                <h1 className="text-2xl font-bold text-white">{t('reportsTitle')}</h1>
                <p className="text-brand-secondary text-sm">{t('reportsSubtitle')}</p>
            </div>
            
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-brand-secondary">
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('totalInvested')}</div>
                        <div className="text-xl font-bold text-white mt-1 font-mono">{formatDisplayValue(totalInvested)}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-brand-primary">
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('finalBalance')}</div>
                        <div className="text-xl font-bold text-brand-primary mt-1 font-mono">{formatDisplayValue(totalValue)}</div>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 ${totalGainLoss >= 0 ? 'border-l-brand-success' : 'border-l-brand-danger'}`}>
                    <CardContent>
                        <div className="text-xs font-bold uppercase text-brand-secondary tracking-wider">{t('monthlyYield')} (Total)</div>
                        <div className={`text-xl font-bold mt-1 font-mono ${totalGainLoss >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {totalGainLoss > 0 ? '+' : ''}{formatCurrency(totalGainLoss, 'USD')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHART */}
            <Card className="flex flex-col">
                <CardHeader className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-surface rounded text-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    {t('monthlyEvolution')}
                </CardHeader>
                {/* Ensure min-height so it doesn't collapse or get cut off */}
                <CardContent className="h-[400px] w-full min-h-[400px]">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 10, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                <XAxis 
                                    dataKey="displayDate" 
                                    stroke="#94A3B8" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#94A3B8" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)}
                                />
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#334155', opacity: 0.2 }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }} />
                                
                                <Bar 
                                    dataKey="invested" 
                                    name={t('appliedValue')} 
                                    stackId="a" 
                                    fill="#10B981" // Emerald Green (Investment)
                                    radius={[0, 0, 0, 0]} 
                                    barSize={24} 
                                />
                                <Bar 
                                    dataKey="gain" 
                                    name={t('capitalGain')} 
                                    stackId="a" 
                                    fill="#6EE7B7" // Lighter Green (Gain)
                                    radius={[4, 4, 0, 0]} 
                                    barSize={24} 
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-brand-secondary opacity-60">
                            {isLoading ? "Carregando..." : t('noData')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Reports;