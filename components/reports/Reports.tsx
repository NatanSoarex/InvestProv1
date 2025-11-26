
import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid, ComposedChart, Line, Area } from 'recharts';
import { Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { financialApi } from '../../services/financialApi';

const COLORS = ['#58A6FF', '#3FB950', '#F85149', '#FFC658', '#8884d8'];

const AssetClassAllocation: React.FC<{ holdings: Holding[], noDataText: string }> = ({ holdings, noDataText }) => {
    const data = useMemo(() => {
        const classValues: { [key: string]: number } = holdings.reduce((acc, holding) => {
            const value = holding.currentValueUSD;
            acc[holding.asset.assetClass] = (acc[holding.asset.assetClass] || 0) + value;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(classValues).map(([name, value]) => ({ name, value }));

    }, [holdings]);

    if (data.length === 0) return <div className="flex items-center justify-center h-full text-brand-secondary">{noDataText}</div>

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem'}}
                    formatter={(value) => formatCurrency(value as number, 'USD')} 
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

const TopPerformers: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
     const sortedHoldings = [...holdings].sort((a,b) => b.totalGainLossUSD - a.totalGainLossUSD);

    return (
        <div>
            {sortedHoldings.slice(0, 5).map(h => {
                const gainInUSD = h.totalGainLossUSD;
                return (
                    <div key={h.asset.ticker} className="flex justify-between items-center py-2 border-b border-brand-border last:border-b-0">
                        <div className="flex items-center gap-2">
                            <img src={h.asset.logo} className="w-6 h-6 rounded-full bg-brand-surface" alt="" onError={(e) => e.currentTarget.src=`https://ui-avatars.com/api/?name=${h.asset.ticker}&background=30363D&color=C9D1D9`}/>
                            <div>
                                <p className="font-semibold">{h.asset.ticker}</p>
                                <p className="text-[10px] text-brand-secondary">{h.asset.name.substring(0, 20)}</p>
                            </div>
                        </div>
                        <div className={`font-medium text-sm ${gainInUSD >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {formatCurrency(gainInUSD, 'USD')}
                        </div>
                    </div>
                );
            })}
        </div>
    )
}

const Reports: React.FC = () => {
    const { holdings, totalInvested, totalValue, totalGainLoss, totalGainLossPercent, transactions, fxRate, t, settings, formatDisplayValue } = usePortfolio();
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Calculate Monthly Evolution (Staircase)
    useEffect(() => {
        const processHistory = async () => {
            if (transactions.length === 0) {
                setIsLoading(false);
                return;
            }

            // Get ALL history to build the full timeline
            const history = await financialApi.getPortfolioPriceHistory(transactions, fxRate, 'ALL');
            
            // Group by Month (YYYY-MM)
            const grouped: Record<string, any> = {};
            
            history.forEach(point => {
                const date = new Date(point.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                // Keep the last point of the month (closing balance)
                grouped[key] = {
                    dateKey: key,
                    timestamp: date.getTime(),
                    balance: point.price,
                    invested: point.invested || 0,
                    displayDate: date.toLocaleDateString(settings.language, { month: 'short', year: '2-digit' })
                };
            });

            // Convert to array and Calculate Contributions (Flow)
            const sortedMonths = Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp);
            
            const finalData = sortedMonths.map((month: any, index: number) => {
                const prevInvested = index > 0 ? sortedMonths[index-1].invested : 0;
                const contribution = Math.max(0, month.invested - prevInvested); // New money added this month
                
                return {
                    ...month,
                    contribution,
                };
            });

            setMonthlyData(finalData);
            setIsLoading(false);
        };

        processHistory();
    }, [transactions, fxRate, settings.language]);

    // 2. Stats Calculation
    const stats = useMemo(() => {
        if (monthlyData.length === 0) return { bestMonth: '-', yield: 0 };
        
        const sortedByBalance = [...monthlyData].sort((a,b) => b.balance - a.balance);
        const avgYield = holdings.reduce((acc, h) => acc + (h.asset.dividendYield || 0), 0) / (holdings.length || 1);

        return {
            bestMonth: sortedByBalance[0].displayDate,
            yield: avgYield
        }
    }, [monthlyData, holdings]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">{t('reportsTitle')}</h1>
                <p className="text-brand-secondary mt-1">{t('reportsSubtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent>
                        <div className="text-sm text-brand-secondary">{t('totalInvested')}</div>
                        <div className="text-2xl font-bold text-brand-text">{formatDisplayValue(totalInvested)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-sm text-brand-secondary">{t('finalBalance')}</div>
                        <div className="text-2xl font-bold text-brand-primary">{formatDisplayValue(totalValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-sm text-brand-secondary">{t('monthlyYield')} (USD)</div>
                        <div className={`text-2xl font-bold ${totalGainLoss >=0 ? 'text-brand-success':'text-brand-danger'}`}>
                            {formatCurrency(totalGainLoss, 'USD')}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-sm text-brand-secondary">{t('estimatedDividends')}</div>
                        <div className="text-2xl font-bold text-yellow-400">
                            {stats.yield.toFixed(2)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CHART: Reports Special (Bar + Line) */}
            <Card className="bg-brand-surface/50 backdrop-blur-sm border-brand-border/50">
                <CardHeader className="border-brand-border/30">{t('monthlyEvolution')}</CardHeader>
                <CardContent className="h-[400px]">
                    {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" opacity={0.3} vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis 
                                    stroke="#8B949E" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Patrimônio') return [formatCurrency(value, 'USD'), t('finalBalance')];
                                        if (name === 'Total Investido') return [formatCurrency(value, 'USD'), t('accumulatedInvested')];
                                        if (name === 'Aporte') return [formatCurrency(value, 'USD'), t('monthlyContribution')];
                                        return [value, name];
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                
                                {/* Bars: Contributions (Blue) - Represents effort */}
                                <Bar dataKey="contribution" name="Aporte" fill="#58A6FF" barSize={20} radius={[4, 4, 0, 0]} opacity={0.7} />
                                
                                {/* Line: Total Invested (Gray) - Represents base */}
                                <Line type="stepAfter" dataKey="invested" name="Total Investido" stroke="#8B949E" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                                
                                {/* Area: Balance (Green) - Represents result */}
                                <Line type="monotone" dataKey="balance" name="Patrimônio" stroke="#3FB950" strokeWidth={3} dot={{r: 3, fill: '#3FB950'}} />
                            
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
                 <Card className="lg:col-span-2">
                    <CardHeader>{t('allocationByClass')}</CardHeader>
                    <CardContent className="h-80 flex items-center justify-center">
                        <AssetClassAllocation holdings={holdings} noDataText={t('noData')} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>{t('topPerformers')}</CardHeader>
                    <CardContent>
                         {holdings.length > 0 ? <TopPerformers holdings={holdings} /> : <div className="text-center p-8 text-brand-secondary">{t('noData')}</div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
