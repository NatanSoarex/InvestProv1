import React, { useEffect, useState, useMemo } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { financialApi } from '../../services/financialApi';
import { formatCurrency } from '../../utils/formatters';
import { HistoricalDataPoint, Transaction, Quote } from '../../types';
import { AdminPanel } from '../admin/AdminPanel';

const AnimatedCounter: React.FC<{ value: number; formatter: (val: number) => string }> = ({ value, formatter }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startTimeRef = React.useRef<number | null>(null);
    const startValueRef = React.useRef<number>(value);
    const reqIdRef = React.useRef<number | null>(null);

    useEffect(() => {
        if (Math.abs(value - displayValue) < 0.01) return;

        startValueRef.current = displayValue;
        startTimeRef.current = null;
        const duration = 1500; 

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 5);
            const current = startValueRef.current + (value - startValueRef.current) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                reqIdRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value); 
            }
        };
        reqIdRef.current = requestAnimationFrame(animate);
        return () => { if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current); };
    }, [value]);

    return <span className="font-mono tracking-tighter">{formatter(displayValue)}</span>;
};

const SummaryCard: React.FC<{ title: string; value: string; numericValue?: number; formatFn?: (v: number) => string; change?: number; changePercent?: number; displayChange?: string }> = ({ title, value, numericValue, formatFn, change, changePercent, displayChange }) => {
  const safeChange = change ?? 0;
  const safeChangePercent = changePercent ?? 0;
  const hasChange = change !== undefined && changePercent !== undefined;
  const isPositive = hasChange && safeChange >= 0.01;
  const isNegative = hasChange && safeChange <= -0.01;
  const isNeutral = !isPositive && !isNegative;

  // Vibrant Gradients for Cards
  let bgGradient = 'from-brand-surface to-brand-bg';
  let borderColor = 'border-white/5';
  let iconColor = 'text-brand-secondary';
  
  if (hasChange) {
      if (isPositive) {
          bgGradient = 'from-brand-success/10 to-brand-surface';
          borderColor = 'border-brand-success/20';
          iconColor = 'text-brand-success';
      } else if (isNegative) {
          bgGradient = 'from-brand-danger/10 to-brand-surface';
          borderColor = 'border-brand-danger/20';
          iconColor = 'text-brand-danger';
      }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-br ${bgGradient} p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
      <p className={`text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-2 ${iconColor}`}>
          {title}
      </p>
      <div className="text-3xl md:text-4xl font-bold text-white drop-shadow-sm">
          {numericValue !== undefined && formatFn ? (
              <AnimatedCounter value={numericValue} formatter={formatFn} />
          ) : (
              <span className="font-mono">{value}</span>
          )}
      </div>
      {hasChange && (
        <div className="flex items-center mt-3">
           <span className={`flex items-center text-sm font-bold px-2 py-0.5 rounded-md ${
               isNeutral ? 'text-brand-secondary bg-white/5' :
               isPositive ? 'text-brand-success bg-brand-success/10' : 'text-brand-danger bg-brand-danger/10'
           }`}>
              {!isNeutral && (isPositive ? '▲' : '▼')} <span className="font-mono ml-1">{displayChange}</span> 
              <span className="opacity-80 ml-1 font-mono text-xs">({Math.abs(safeChangePercent).toFixed(2)}%)</span>
           </span>
        </div>
      )}
    </div>
  );
};

const RecentActivity: React.FC<{ transactions: Transaction[]; formatFn: (val: number) => string; noActivityText: string }> = ({ transactions, formatFn, noActivityText }) => {
    const recent = [...transactions].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0, 5);

    return (
        <div className="space-y-3">
            {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-brand-secondary opacity-50">
                    <div className="text-4xl mb-2">💤</div>
                    <p className="text-xs font-mono uppercase tracking-widest">{noActivityText}</p>
                </div>
            ) : (
                recent.map(t => {
                    const isBRL = t.ticker.endsWith('.SA');
                    const currency = isBRL ? 'BRL' : 'USD';
                    return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-brand-surface/50 border border-white/5 hover:border-brand-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${t.quantity > 0 ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-danger/10 text-brand-danger'}`}>
                                {t.ticker.substring(0, 2)}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">{t.ticker}</p>
                                <p className="text-[10px] text-brand-secondary font-mono">{formatCurrency(t.price, currency)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-bold font-mono ${t.quantity > 0 ? 'text-brand-success' : 'text-brand-text'}`}>
                                {t.quantity > 0 ? '+' : ''}{t.quantity}
                            </p>
                            <p className="text-[10px] text-brand-secondary font-mono opacity-70">
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
  const { totalValue, totalInvested, totalGainLoss, totalGainLossPercent, transactions, holdings, fxRate, formatDisplayValue, settings, t, lastUpdated } = usePortfolio();
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
  }, [transactions, fxRate, selectedRange, lastUpdated, currentQuotesMap]);

  const displayHistory = portfolioHistory.map(p => ({
      ...p,
      price: settings.currency === 'BRL' ? p.price * fxRate : p.price,
  }));

  const displayTotalInvested = settings.currency === 'BRL' ? totalInvested * fxRate : totalInvested;

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t('overview')}</h1>
            <p className="text-brand-secondary text-sm">Bem-vindo de volta, {currentUser?.name}</p>
        </div>
        
        {currentUser?.isAdmin && (
            <button 
                onClick={() => setIsAdminOpen(true)}
                className="px-4 py-1.5 bg-brand-accent/10 border border-brand-accent/50 text-brand-accent rounded-lg text-sm font-bold tracking-wider hover:bg-brand-accent/20 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse"
            >
                ADMIN
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard 
            title={t('netWorth')}
            value={formatDisplayValue(totalValue || 0)} 
            numericValue={totalValue || 0}
            formatFn={formatDisplayValue}
            change={totalGainLoss}
            changePercent={totalGainLossPercent}
            displayChange={formatDisplayValue(Math.abs(totalGainLoss || 0))}
        />
        <SummaryCard 
            title={t('totalInvested')}
            value={formatDisplayValue(totalInvested || 0)} 
            numericValue={totalInvested || 0}
            formatFn={formatDisplayValue}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[450px] flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4">
                <span className="text-brand-text">{t('wealthEvolution')}</span>
                <div className="flex bg-brand-bg rounded-lg p-1 space-x-1 border border-white/5">
                    {ranges.map(range => (
                        <button
                            key={range}
                            onClick={() => setSelectedRange(range)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all font-mono ${
                                selectedRange === range 
                                ? 'bg-brand-primary text-white shadow-lg' 
                                : 'text-brand-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-full w-full flex-1">
                {displayHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                        
                        <XAxis 
                            dataKey="date" 
                            stroke="#64748B" 
                            fontSize={11}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={formatXAxis}
                            minTickGap={50} 
                            dy={10}
                        />
                        
                        <YAxis 
                            stroke="#64748B" 
                            fontSize={11}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => {
                                try {
                                    return new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency, notation: 'compact', compactDisplay: 'short' }).format(value);
                                } catch { return '' }
                            }} 
                            width={60}
                            domain={['auto', 'auto']} 
                        />
                        
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#1E293B', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono', color: '#fff' }}
                            labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '5px' }}
                            formatter={(value) => [
                                formatCurrency(value as number, settings.currency), 
                                t('netWorth')
                            ]}
                        />
                        
                        <ReferenceLine 
                            y={displayTotalInvested} 
                            stroke="#94A3B8" 
                            strokeDasharray="3 3" 
                            strokeOpacity={0.5}
                            label={{ value: 'Investido', fill: '#94A3B8', fontSize: 10, position: 'insideBottomRight' }} 
                        />

                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#3B82F6" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorValue)"
                            animationDuration={1500}
                            isAnimationActive={true}
                        />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-secondary text-sm opacity-60">
                        {isHistoryLoading ? (
                             <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <p>{t('addAssetsChart')}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1">
            <CardHeader>{t('recentActivity')}</CardHeader>
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