
import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const Projections: React.FC = () => {
    const { totalValue, t } = usePortfolio();
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [years, setYears] = useState(10);
    const [rates, setRates] = useState({
        conservative: 4,
        moderate: 7,
        optimistic: 10,
    });

    const projectionData = useMemo(() => {
        const data = [];
        let conservativeValue = totalValue;
        let moderateValue = totalValue;
        let optimisticValue = totalValue;

        const monthlyRateC = rates.conservative / 100 / 12;
        const monthlyRateM = rates.moderate / 100 / 12;
        const monthlyRateO = rates.optimistic / 100 / 12;

        for (let year = 0; year <= years; year++) {
            data.push({
                year: `${t('year')} ${year}`,
                conservative: conservativeValue,
                moderate: moderateValue,
                optimistic: optimisticValue,
            });
            
            for(let month = 0; month < 12; month++) {
                conservativeValue = (conservativeValue + monthlyContribution) * (1 + monthlyRateC);
                moderateValue = (moderateValue + monthlyContribution) * (1 + monthlyRateM);
                optimisticValue = (optimisticValue + monthlyContribution) * (1 + monthlyRateO);
            }
        }
        return data;
    }, [totalValue, monthlyContribution, years, rates, t]);

    const finalValues = projectionData[projectionData.length - 1];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">{t('projectionsTitle')}</h1>
                <p className="text-brand-secondary mt-1">{t('projectionsSubtitle')}</p>
            </div>

            <Card>
                <CardHeader>{t('projectionParams')}</CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-secondary mb-1">{t('monthlyContribution')} (USD)</label>
                            <input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-secondary mb-1">{t('timeHorizon')}</label>
                            <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                    </div>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-brand-secondary mb-1">{t('conservativeRate')}</label>
                            <input type="number" value={rates.conservative} onChange={e => setRates(r => ({...r, conservative: Number(e.target.value)}))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-secondary mb-1">{t('moderateRate')}</label>
                            <input type="number" value={rates.moderate} onChange={e => setRates(r => ({...r, moderate: Number(e.target.value)}))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-secondary mb-1">{t('optimisticRate')}</label>
                            <input type="number" value={rates.optimistic} onChange={e => setRates(r => ({...r, optimistic: Number(e.target.value)}))} className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>{t('projectedGrowth')} (USD)</CardHeader>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                            <XAxis dataKey="year" stroke="#8B949E" />
                            <YAxis stroke="#8B949E" tickFormatter={(value) => formatCurrency(value as number, 'USD')} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '0.5rem'}}
                                formatter={(value) => formatCurrency(value as number, 'USD')}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="conservative" stroke="#F85149" name={`${t('conservative')} (${rates.conservative}%)`} />
                            <Line type="monotone" dataKey="moderate" stroke="#FFC658" name={`${t('moderate')} (${rates.moderate}%)`} />
                            <Line type="monotone" dataKey="optimistic" stroke="#3FB950" name={`${t('optimistic')} (${rates.optimistic}%)`} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>{t('finalValues')} {t('year')} {years}</CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-brand-secondary">{t('conservative')}</p>
                        <p className="text-2xl font-bold text-brand-danger">{formatCurrency(finalValues.conservative, 'USD')}</p>
                    </div>
                    <div>
                        <p className="text-brand-secondary">{t('moderate')}</p>
                        <p className="text-2xl font-bold text-yellow-400">{formatCurrency(finalValues.moderate, 'USD')}</p>
                    </div>
                     <div>
                        <p className="text-brand-secondary">{t('optimistic')}</p>
                        <p className="text-2xl font-bold text-brand-success">{formatCurrency(finalValues.optimistic, 'USD')}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Projections;
