import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { financialApi } from '../../services/financialApi';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

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

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const invested = data.invested || 0;
        const gain = data.realGain || 0; 
        const total = data.totalValue || 0;

        return (
            <div className="bg-[#161B22] border border-[#30363D] p-3 rounded-lg shadow-xl min-w-[180px]">
                <p className="text-brand-secondary text-xs mb-2 font-bold uppercase">{label}</p>
                
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#059669] font-medium">● Valor Aplicado:</span>
                    <span className="text-xs text-brand-text font-mono">{formatCurrency(invested, 'USD')}</span>
                </div>

                <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                    <span className={`text-xs font-medium ${gain >= 0 ? 'text-[#34D399]' : 'text-red-400'}`}>● Resultado:</span>
                    <span className={`text-xs font-mono ${gain >= 0 ? 'text-brand-text' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain, 'USD')}
                    </span>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-white font-bold">Saldo Final:</span>
                    <span className="text-sm text-brand-primary font-bold font-mono">{formatCurrency(total, 'USD')}</span>
                </div>
            </div>
        );
    }
    return null;
};

const SmartRebalancing: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    const { t, allocationTargets, updateAllocationTargets, totalValue, formatDisplayValue } = usePortfolio();
    const [isEditing, setIsEditing] = useState(false);
    const [tempTargets, setTempTargets] = useState<Record<string, number>>({});

    useEffect(() => {
        setTempTargets(allocationTargets);
    }, [allocationTargets]);

    const handleSave = () => {
        updateAllocationTargets(tempTargets);
        setIsEditing(false);
    };

    const handleTargetChange = (ticker: string, val: string) => {
        const num = parseFloat(val);
        setTempTargets(prev => ({ ...prev, [ticker]: isNaN(num) ? 0 : num }));
    };

    // Explicit casting to number to avoid 'unknown' type errors
    const totalTarget = Object.values(isEditing ? tempTargets : allocationTargets).reduce((a: number, b) => a + (Number(b) || 0), 0);

    const rebalancingData = useMemo(() => {
        return holdings.map(h => {
            const currentPercent = totalValue > 0 ? (h.currentValueUSD / totalValue) * 100 : 0;
            const targetVal = isEditing ? tempTargets[h.asset.ticker] : allocationTargets[h.asset.ticker];
            const targetPercent = Number(targetVal || 0);
            const deviation = currentPercent - targetPercent;
            
            return {
                ...h,
                currentPercent,
                targetPercent,
                deviation
            };
        }).sort((a, b) => b.currentPercent - a.currentPercent);
    }, [holdings, totalValue, allocationTargets, tempTargets, isEditing]);

    return (
        <Card className="border-brand-border">
            <CardHeader className="flex justify-between items-center border-brand-border/30">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-brand-text font-bold">{t('smartAllocationTitle')}</span>
                        <p className="text-xs text-brand-secondary font-normal hidden md:block">{t('smartAllocationDesc')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`text-xs font-bold px-3 py-1 rounded-full border ${Math.abs(totalTarget - 100) < 0.1 ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'}`}>
                        Total Meta: {totalTarget.toFixed(1)}%
                    </div>
                    {isEditing ? (
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all shadow-neon">
                            {t('saveGoals')}
                        </button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-secondary text-xs font-bold rounded-lg hover:text-white transition-all">
                            {t('editGoals')}
                        </button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-secondary uppercase bg-brand-surface/50 border-b border-brand-border/50">
                        <tr>
                            <th className="p-4 rounded-tl-lg">{t('asset')}</th>
                            <th className="p-4 text-right">{t('currentPercent')}</th>
                            <th className="p-4 text-right w-32">{t('targetPercent')}</th>
                            <th className="p-4 text-center">{t('deviation')}</th>
                            <th className="p-4 text-right rounded-tr-lg">{t('action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                        {rebalancingData.map(item => {
                            const isAbove = item.deviation > 0;
                            const isBelow = item.deviation < 0;
                            const actionColor = isBelow ? 'text-brand-success bg-brand-success/10 border-brand-success/20' : 'text-brand-warning bg-brand-warning/10 border-brand-warning/20';
                            
                            return (
                                <tr key={item.asset.ticker} className="hover:bg-brand-surface/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={item.asset.logo} className="w-8 h-8 rounded-lg bg-black" onError={(e) => e.currentTarget.src=`https://ui-avatars.com/api/?name=${item.asset.ticker}&background=30363D&color=C9D1D9`}/>
                                            <div>
                                                <p className="font-bold text-brand-text">{item.asset.ticker}</p>
                                                <p className="text-[10px] text-brand-secondary font-mono">{formatDisplayValue(item.currentValueUSD)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right align-middle">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-bold text-brand-text font-mono">{item.currentPercent.toFixed(2)}%</span>
                                            <div className="w-24 h-1.5 bg-brand-bg rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-primary" style={{ width: `${Math.min(item.currentPercent, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right align-middle">
                                        {isEditing ? (
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={tempTargets[item.asset.ticker] || ''}
                                                    onChange={(e) => handleTargetChange(item.asset.ticker, e.target.value)}
                                                    className="w-20 bg-brand-bg border border-brand-primary rounded px-2 py-1 text-right text-white font-bold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-7 top-1.5 text-xs text-brand-secondary">%</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-bold text-brand-secondary font-mono">{item.targetPercent.toFixed(2)}%</span>
                                                <div className="w-24 h-1.5 bg-brand-bg rounded-full overflow-hidden opacity-50">
                                                    <div className="h-full bg-brand-secondary" style={{ width: `${Math.min(item.targetPercent, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center align-middle">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${isAbove ? 'text-brand-warning' : isBelow ? 'text-brand-success' : 'text-brand-secondary'}`}>
                                            {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-right align-middle">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${Math.abs(item.deviation) < 1 ? 'border-transparent text-brand-secondary opacity-50' : actionColor}`}>
                                            {Math.abs(item.deviation) < 1 
                                                ? t('balanced') 
                                                : isBelow 
                                                    ? `${t('buy')} (+${Math.abs(item.deviation).toFixed(1)}%)` 
                                                    : `${t('wait')} (-${item.deviation.toFixed(1)}%)`
                                            }
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
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

            // 1. Snapshot History
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            
            // 2. Calculate Total Current Invested (For Scaling)
            const totalCurrentInvested = transactions.reduce((acc, t) => acc + t.totalCost, 0);

            // 3. Find Start Date
            const sortedTx = [...transactions].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            const firstTxDate = sortedTx.length > 0 ? new Date(sortedTx[0].dateTime) : new Date();
            
            const getMonthId = (d: Date) => d.getFullYear() * 100 + (d.getMonth() + 1);
            const startMonthId = getMonthId(firstTxDate);

            // Current Month Key
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // 4. Group Contributions
            const contributionsByMonth: Record<string, number> = {};
            transactions.forEach(tx => {
                const date = new Date(tx.dateTime);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                let cost = tx.totalCost;
                if (tx.ticker.endsWith('.SA') && fxRate > 0) cost = cost / fxRate;
                if (!contributionsByMonth[key]) contributionsByMonth[key] = 0;
                contributionsByMonth[key] += cost;
            });

            // 5. Group History
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
                
                const historyPoint = groupedHistory[key] || {};
                
                let rawSnapshotValue = historyPoint.snapshotValue;
                if (rawSnapshotValue === undefined || rawSnapshotValue === null) {
                    rawSnapshotValue = lastKnownSnapshotValue;
                } else {
                    lastKnownSnapshotValue = rawSnapshotValue;
                }
                
                if (key === currentMonthKey) {
                    const liveTotalUSD = holdings.reduce((acc, h) => acc + h.currentValueUSD, 0);
                    rawSnapshotValue = liveTotalUSD > 0 ? liveTotalUSD : rawSnapshotValue; 
                }

                if (currentMonthId < startMonthId) {
                    return {
                        dateKey: key,
                        displayDate: historyPoint.displayDate || key,
                        invested: 0,
                        gain: 0,
                        realGain: 0,
                        totalValue: 0
                    };
                }

                if (runningInvested <= 0) {
                     return {
                        dateKey: key,
                        displayDate: historyPoint.displayDate || key,
                        invested: 0,
                        gain: 0,
                        realGain: 0,
                        totalValue: 0
                    };
                }

                let adjustedNetWorth = rawSnapshotValue;
                
                if (key !== currentMonthKey && totalCurrentInvested > 0) {
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
    }, [transactions, fxRate, settings.language, holdings, totalValue]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32">
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

            <Card className="bg-brand-surface border-brand-border">
                <CardHeader className="flex items-center gap-2 border-brand-border/30">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                    {t('monthlyEvolution')}
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
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#30363D', opacity: 0.2 }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#C9D1D9' }} />
                                
                                <Bar 
                                    dataKey="invested" 
                                    name={t('appliedValue')} 
                                    stackId="a" 
                                    fill="#059669" 
                                    radius={[0, 0, 0, 0]} 
                                    barSize={20} 
                                />
                                <Bar 
                                    dataKey="gain" 
                                    name={t('capitalGain')} 
                                    stackId="a" 
                                    fill="#34D399" 
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

            {/* NEW: Smart Allocation */}
            <SmartRebalancing holdings={holdings} />
        </div>
    );
};

export default Reports;