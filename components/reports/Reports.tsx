
import React from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, Sector, CartesianGrid } from 'recharts';
import { AssetClass, Holding } from '../../types';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#58A6FF', '#3FB950', '#F85149', '#FFC658', '#8884d8'];

const AssetClassAllocation: React.FC<{ holdings: Holding[], noDataText: string }> = ({ holdings, noDataText }) => {
    const data = React.useMemo(() => {
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
                <Tooltip formatter={(value) => formatCurrency(value as number, 'USD')} />
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
                        <div>
                            <p className="font-semibold">{h.asset.ticker}</p>
                            <p className="text-xs text-brand-secondary">{h.asset.name}</p>
                        </div>
                        <div className={`font-medium ${gainInUSD >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                            {formatCurrency(gainInUSD, 'USD')}
                        </div>
                    </div>
                );
            })}
        </div>
    )
}

const Reports: React.FC = () => {
    const { holdings, totalInvested, totalValue, totalGainLoss, totalGainLossPercent, t } = usePortfolio();

    const profitabilityData = React.useMemo(() => {
        return holdings.map(h => {
            return {
                name: h.asset.ticker,
                'Investido': h.totalInvestedUSD,
                'Valor Atual': h.currentValueUSD,
            }
        });
    }, [holdings]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">{t('reportsTitle')}</h1>
                <p className="text-brand-secondary mt-1">{t('reportsSubtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardContent><div className="text-sm text-brand-secondary">{t('totalInvested')}</div><div className="text-2xl font-bold">{formatCurrency(totalInvested, 'USD')}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-brand-secondary">{t('totalValue')}</div><div className="text-2xl font-bold">{formatCurrency(totalValue, 'USD')}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-brand-secondary">{t('totalReturn')} ($)</div><div className={`text-2xl font-bold ${totalGainLoss >=0 ? 'text-brand-success':'text-brand-danger'}`}>{formatCurrency(totalGainLoss, 'USD')}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-brand-secondary">{t('totalReturn')} (%)</div><div className={`text-2xl font-bold ${totalGainLoss >=0 ? 'text-brand-success':'text-brand-danger'}`}>{totalGainLossPercent.toFixed(2)}%</div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>{t('profitabilityByAsset')} (USD)</CardHeader>
                    <CardContent className="h-96">
                        {holdings.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={profitabilityData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                                <XAxis type="number" stroke="#8B949E" tickFormatter={(value) => formatCurrency(value as number, 'USD')} />
                                <YAxis type="category" dataKey="name" stroke="#8B949E" width={60} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem'}}
                                    formatter={(value) => formatCurrency(value as number, 'USD')}
                                />
                                <Legend />
                                <Bar dataKey="Investido" fill="#8884d8" name={t('totalInvested')} />
                                <Bar dataKey="Valor Atual" fill="#3FB950" name={t('totalValue')} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-brand-secondary">{t('noData')}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>{t('allocationByClass')}</CardHeader>
                    <CardContent className="h-96 flex items-center justify-center">
                        <AssetClassAllocation holdings={holdings} noDataText={t('noData')} />
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>{t('topPerformers')}</CardHeader>
                <CardContent>
                     {holdings.length > 0 ? <TopPerformers holdings={holdings} /> : <div className="text-center p-8 text-brand-secondary">{t('noData')}</div>}
                </CardContent>
            </Card>
        </div>
    );
};

export default Reports;
