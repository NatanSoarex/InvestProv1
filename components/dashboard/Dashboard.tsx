
import React, { useEffect, useState, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { financialApi } from '../../services/financialApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { HistoricalDataPoint, Transaction, Quote } from '../../types';
import { AdminPanel } from '../admin/AdminPanel';

const SummaryCard: React.FC<{ title: string; value: string; change?: number; changePercent?: number; displayChange?: string }> = ({ title, value, change, changePercent, displayChange }) => {
  const safeChange = change ?? 0;
  const safeChangePercent = changePercent ?? 0;
  const hasChange = change !== undefined && changePercent !== undefined;
  const isPositive = hasChange && safeChange >= 0;
  const isNeutral = hasChange && Math.abs(safeChange) < 0.01;

  return (
    <Card className="relative overflow-hidden">
      {hasChange && !isNeutral && (
        <div className={`absolute top-0 left-0 w-1 h-full ${isPositive ? 'bg-brand-success' : 'bg-brand-danger'} opacity-50`}></div>
      )}
      <CardContent>
        <p className="text-brand-secondary text-xs font-bold tracking-widest uppercase mb-1">{title}</p>
        <p className="text-2xl md:text-3xl font-bold text-brand-text tracking-tight">{value}</p>
        {hasChange && (
          <div className="flex items-center mt-3">
             <span className={`flex items-center text-sm font-bold px-2 py-0.5 rounded ${
                 isNeutral ? 'text-brand-secondary bg-brand-secondary/10' :
                 isPositive ? 'text-brand-success bg-brand-success/10' : 'text-brand-danger bg-brand-danger/10'
             }`}>
                {!isNeutral && (isPositive ? '▲' : '▼')} {displayChange} ({Math.abs(safeChangePercent).toFixed(2)}%)
             </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RecentActivity: React.FC<{ transactions: Transaction[]; formatFn: (val: number) => string; noActivityText: string }> = ({ transactions, formatFn, noActivityText }) => {
    const recent = [...transactions].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0, 5);

    return (
        <div className="space-y-3">
            {recent.length === 0 ? (
                <p className="text-brand-secondary text-sm text-center py-8">{noActivityText}</p>
            ) : (
                recent.map(t => {
                    const isBRL = t.ticker.endsWith('.SA');
                    const currency = isBRL ? 'BRL' : 'USD';
                    return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-surface/50 transition-colors border border-transparent hover:border-brand-border/50">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-inner ${t.quantity > 0 ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger'}`}>
                                {t.ticker.substring(0, 2)}
                            </div>
                            <div>
                                <p className="font-bold text-brand-text text-sm">{t.ticker}</p>
                                <p className="text-xs text-brand-secondary">{formatDate(t.dateTime).split(',')[0]}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold ${t.quantity > 0 ? 'text-brand-success' : 'text-brand-text'}`}>
                                {t.quantity > 0 ? '+' : ''}{t.quantity}
                            </p>
                            <p className="text-xs text-brand-secondary font-medium">
                                {formatCurrency(t.totalCost, currency)}
                            </p>
                        </div>
                    </div>
                )})
            )}
        </div>
    );
};

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | 'ALL';

const Dashboard: React.FC = () => {
  const { totalValue, totalInvested, totalGainLoss, totalGainLossPercent, transactions, holdings, fxRate, formatDisplayValue, settings, t } = usePortfolio();
  const { currentUser } = useAuth();
  const [portfolioHistory, setPortfolioHistory] = useState<HistoricalDataPoint[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1D');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const ranges: TimeRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', 'ALL'];

  const currentQuotesMap = useMemo(() => {
      const map: Record<string, Quote> = {};
      holdings.forEach(h => {
          if (h.quote) map[h.asset.ticker] = h.quote;
      });
      return map;
  }, [holdings]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (transactions.length === 0) {
        setIsHistoryLoading(false);
        setPortfolioHistory([]);
        return;
      };
      
      try {
        const historyData = await financialApi.getPortfolioPriceHistory(transactions, fxRate, selectedRange, currentQuotesMap);
        setPortfolioHistory(historyData);
      } catch (e) {
        console.error("Error fetching history", e);
      } finally {
        setIsHistoryLoading(false);
      }
    }

    fetchHistory();
    
  }, [transactions, fxRate, selectedRange, currentQuotesMap]);

  const displayHistory = portfolioHistory.map(p => ({
      ...p,
      price: settings.currency === 'BRL' ? p.price * fxRate : p.price,
      invested: settings.currency === 'BRL' ? p.invested * fxRate : p.invested,
  }));

  const formatXAxis = (val: string) => {
      try {
          const d = new Date(val);
          if (selectedRange === '1D') {
              return d.toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit' });
          }
          if (selectedRange === '5D' || selectedRange === '1M') {
              return `${d.getDate()}/${d.getMonth() + 1}`;
          }
          return `${d.getMonth() + 1}/${d.getFullYear().toString().substr(2)}`;
      } catch { return ''; }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-brand-text">{t('overview')}</h1>
            <p className="text-brand-secondary text-sm">{t('financialSummary')}</p>
        </div>
        
        <div className="flex items-center gap-4">
            {currentUser?.isAdmin && (
                <button 
                    onClick={() => setIsAdminOpen(true)}
                    className="relative group cursor-pointer"
                    title="Painel Administrativo"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded blur opacity-40 group-hover:opacity-75 transition duration-200 animate-pulse"></div>
                    <div className="relative px-3 py-1 bg-brand-bg/90 backdrop-blur border border-brand-primary/30 rounded flex items-center justify-center">
                        <span className="text-lg font-black tracking-[0.2em] italic bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)] animate-[pulse_2s_ease-in-out_infinite]">
                            ADM
                        </span>
                    </div>
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard 
            title={t('netWorth')}
            value={formatDisplayValue(totalValue || 0)} 
            change={totalGainLoss}
            changePercent={totalGainLossPercent}
            displayChange={formatDisplayValue(Math.abs(totalGainLoss || 0))}
        />
        <SummaryCard 
            title={t('totalInvested')}
            value={formatDisplayValue(totalInvested || 0)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-brand-border/50 bg-brand-surface/30 backdrop-blur-md">
            <CardHeader className="border-brand-border/30 flex flex-col sm:flex-row justify-between items-center pb-2 gap-4">
                <span>{t('wealthEvolution')}</span>
                <div className="flex bg-brand-bg/50 rounded-lg p-1 space-x-1 overflow-x-auto max-w-full">
                    {ranges.map(range => (
                        <button
                            key={range}
                            onClick={() => {
                                setSelectedRange(range);
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                                selectedRange === range 
                                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25' 
                                : 'text-brand-secondary hover:text-brand-text hover:bg-brand-surface'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-[350px] w-full p-0 pt-4">
                {displayHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#58A6FF" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" opacity={0.3} vertical={false} />
                        
                        <XAxis 
                            dataKey="date" 
                            stroke="#8B949E" 
                            fontSize={10}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={formatXAxis}
                            minTickGap={30} 
                            dy={10}
                        />
                        
                        <YAxis 
                            stroke="#8B949E" 
                            fontSize={10}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => {
                                try {
                                    return new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency, notation: 'compact' }).format(value);
                                } catch { return '' }
                            }} 
                            width={45}
                            domain={['auto', 'auto']} 
                        />
                        
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(13, 17, 23, 0.9)', 
                                border: '1px solid #30363D',
                                borderRadius: '8px',
                                padding: '12px',
                                backdropFilter: 'blur(4px)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            labelStyle={{ color: '#8B949E', fontSize: '11px', marginBottom: '8px' }}
                            labelFormatter={(label) => {
                                try {
                                    const d = new Date(label as string);
                                    return d.toLocaleString(settings.language, { 
                                        weekday: 'short', 
                                        day: '2-digit', 
                                        month: 'short', 
                                        hour: '2-digit', 
                                        minute: '2-digit'
                                    });
                                } catch { return ''; }
                            }}
                            formatter={(value, name) => {
                                const isNetWorth = name === 'Patrimônio' || name === 'Net Worth' || name === 'Valor' || name === t('netWorth');
                                const color = isNetWorth ? '#58A6FF' : '#8B949E';
                                let formatted = '';
                                try {
                                    formatted = new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency }).format(value as number);
                                } catch { formatted = `${value}` }
                                return [
                                    <span style={{ color: color }}>
                                        {formatted}
                                    </span>, 
                                    name
                                ];
                            }}
                            cursor={{ stroke: '#58A6FF', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        
                        <Line 
                            type="stepAfter"
                            dataKey="invested" 
                            stroke="#8B949E" 
                            strokeWidth={1} 
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            name={t('totalInvested')}
                            opacity={0.5}
                            animationDuration={0} 
                        />

                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#58A6FF" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorValue)"
                            name={t('netWorth')}
                            animationDuration={800} 
                        />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-secondary text-sm">
                        {isHistoryLoading ? (
                             <svg className="animate-spin h-8 w-8 text-brand-primary/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <p>{t('addAssetsChart')}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-brand-border/50 bg-brand-surface/30 backdrop-blur-md">
            <CardHeader className="border-brand-border/30 pb-2">{t('recentActivity')}</CardHeader>
            <CardContent>
                <RecentActivity transactions={transactions} formatFn={formatDisplayValue} noActivityText={t('noActivity')} />
            </CardContent>
        </Card>
      </div>
      
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
};

export default Dashboard;
