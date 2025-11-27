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

        return () => {
            if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
        };
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

  return (
    <Card className="relative overflow-hidden group">
      {/* Background Gradient for Depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Glow Effect based on Performance */}
      {hasChange && !isNeutral && (
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-20 -mr-10 -mt-10 ${isPositive ? 'bg-brand-success' : 'bg-brand-danger'}`}></div>
      )}

      <CardContent>
        <p className="text-brand-secondary text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
            {title}
            <span className="h-px flex-1 bg-white/10"></span>
        </p>
        <div className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">
            {numericValue !== undefined && formatFn ? (
                <AnimatedCounter value={numericValue} formatter={formatFn} />
            ) : (
                <span className="font-mono">{value}</span>
            )}
        </div>
        {hasChange && (
          <div className="flex items-center mt-3">
             <span className={`flex items-center text-sm font-bold px-2.5 py-1 rounded-md border backdrop-blur-sm shadow-lg transition-all ${
                 isNeutral ? 'text-brand-secondary border-brand-secondary/20 bg-brand-secondary/5' :
                 isPositive ? 'text-brand-success border-brand-success/30 bg-brand-success/10 shadow-[0_0_10px_rgba(0,255,163,0.1)]' : 'text-brand-danger border-brand-danger/30 bg-brand-danger/10 shadow-[0_0_10px_rgba(255,46,91,0.1)]'
             }`}>
                {!isNeutral && (isPositive ? '▲' : '▼')} <span className="font-mono ml-1">{displayChange}</span> 
                <span className="opacity-70 ml-1 font-mono text-xs">({Math.abs(safeChangePercent).toFixed(2)}%)</span>
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
        <div className="space-y-2">
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
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-primary/30 hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg ${t.quantity > 0 ? 'bg-brand-success/20 text-brand-success border border-brand-success/30' : 'bg-brand-danger/20 text-brand-danger border border-brand-danger/30'}`}>
                                {t.ticker.substring(0, 2)}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm group-hover:text-brand-primary transition-colors">{t.ticker}</p>
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-secondary tracking-tighter uppercase">{t('overview')}</h1>
            <p className="text-brand-primary text-xs font-mono tracking-widest mt-1 uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span>
                System Operational
            </p>
        </div>
        
        <div className="flex items-center gap-4">
            {currentUser?.isAdmin && (
                <button 
                    onClick={() => setIsAdminOpen(true)}
                    className="relative group cursor-pointer"
                    title="Painel Administrativo"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent to-brand-danger rounded blur opacity-40 group-hover:opacity-100 transition duration-200 animate-pulse"></div>
                    <div className="relative px-4 py-1.5 bg-brand-bg/90 backdrop-blur border border-white/10 rounded flex items-center justify-center">
                        <span className="text-sm font-black tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-danger">
                            ADMIN
                        </span>
                    </div>
                </button>
            )}
        </div>
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
        <Card className="lg:col-span-2 min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary to-transparent"></div>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-center pb-4 gap-4 z-10 relative">
                <span className="text-sm font-bold uppercase tracking-wider text-brand-secondary">{t('wealthEvolution')}</span>
                <div className="flex bg-black/40 rounded-lg p-1 space-x-1 border border-white/5 backdrop-blur-md">
                    {ranges.map(range => (
                        <button
                            key={range}
                            onClick={() => {
                                setSelectedRange(range);
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-300 font-mono ${
                                selectedRange === range 
                                ? 'bg-brand-primary/20 text-brand-primary shadow-[0_0_10px_rgba(0,229,255,0.3)] border border-brand-primary/30' 
                                : 'text-brand-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-full w-full p-0 pt-4 flex-1 relative z-10">
                {displayHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4}/>
                                <stop offset="100%" stopColor="#00E5FF" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        
                        <XAxis 
                            dataKey="date" 
                            stroke="#475569" 
                            fontSize={10}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={formatXAxis}
                            minTickGap={70} 
                            dy={10}
                            fontFamily="JetBrains Mono"
                        />
                        
                        <YAxis 
                            stroke="#475569" 
                            fontSize={10}
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => {
                                try {
                                    return new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency, notation: 'compact' }).format(value);
                                } catch { return '' }
                            }} 
                            width={55}
                            domain={['auto', 'auto']} 
                            fontFamily="JetBrains Mono"
                        />
                        
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(11, 14, 20, 0.8)', 
                                border: '1px solid rgba(0, 229, 255, 0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 0 20px rgba(0, 229, 255, 0.15)'
                            }}
                            itemStyle={{ fontSize: '13px', fontWeight: 600, fontFamily: 'JetBrains Mono' }}
                            labelStyle={{ color: '#94A3B8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}
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
                                try {
                                    const formatted = new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency }).format(value as number);
                                    return [
                                        <span style={{ color: '#00E5FF', textShadow: '0 0 8px rgba(0,229,255,0.6)' }}>{formatted}</span>, 
                                        <span style={{ color: '#E2E8F0' }}>{t('netWorth')}</span>
                                    ];
                                } catch { return [value, name]; }
                            }}
                            cursor={{ stroke: '#00E5FF', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        
                        <ReferenceLine 
                            y={displayTotalInvested} 
                            stroke="#94A3B8" 
                            strokeDasharray="3 3" 
                            strokeOpacity={0.3}
                            label={{ 
                                value: 'Break-Even', 
                                fill: '#94A3B8', 
                                fontSize: 10, 
                                position: 'insideBottomRight',
                                fontFamily: 'JetBrains Mono'
                            }} 
                        />

                        <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#00E5FF" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#colorValue)"
                            animationDuration={1500} 
                            filter="drop-shadow(0 0 4px rgba(0, 229, 255, 0.5))"
                            isAnimationActive={true}
                        />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-secondary text-sm">
                        {isHistoryLoading ? (
                             <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                        ) : (
                            <p>{t('addAssetsChart')}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-white/5 relative">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-brand-accent to-transparent"></div>
            <CardHeader className="border-white/5 pb-4">{t('recentActivity')}</CardHeader>
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