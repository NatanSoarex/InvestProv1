import React, { useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Holding, MarketState } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { Card, CardContent } from '../ui/Card';
import { HoldingCard } from './HoldingCard';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { formatCurrency, formatPercent } from '../../utils/formatters';

// Icons
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-brand-accent" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 22c5.523 0 10-4.477 10-10 0-.64-.066-1.266-.19-1.872a1.475 1.475 0 00-2.23-1.086 8.997 8.997 0 01-1.767.568 8.84 8.84 0 01-1.813.2c-5.523 0-10-4.477-10-10 0-.615.06-1.22.172-1.807a1.475 1.475 0 00-2.128-1.65A9.954 9.954 0 002 12c0 5.523 4.477 10 10 10z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

interface HoldingRowProps {
    holding: Holding;
    onShowHistory: (holding: Holding) => void;
    onRemoveHolding: (ticker: string) => void;
}

const HoldingRow: React.FC<HoldingRowProps> = ({ holding, onShowHistory, onRemoveHolding }) => {
  if (!holding || !holding.asset) return null;

  const { asset, quote, totalQuantity, isLocked } = holding;
  
  const { settings, fxRate } = usePortfolio();
  const isBRL = settings.currency === 'BRL';
  const currencySymbol = isBRL ? 'BRL' : 'USD';
  const conversionRate = isBRL ? fxRate : 1;

  const displayCurrentValue = (holding.currentValueUSD || 0) * conversionRate;
  const displayPrice = (holding.totalQuantity > 0) 
      ? ((holding.currentValueUSD || 0) / holding.totalQuantity) * conversionRate 
      : 0;
  const displayAveragePrice = (holding.totalQuantity > 0) 
      ? ((holding.totalInvestedUSD || 0) / holding.totalQuantity) * conversionRate 
      : 0;
  
  const totalReturn = (holding.totalGainLossUSD || 0) * conversionRate;
  const totalReturnPercent = holding.totalGainLossPercent || 0;
  
  const isReturnPositive = totalReturn > 0;
  const isReturnNegative = totalReturn < 0;

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemoveHolding(asset.ticker);
  };

  if (isLocked) {
      return (
          <tr className="border-b border-white/5 relative overflow-hidden bg-black/40">
              <td className="p-4 opacity-50 blur-[2px] select-none pointer-events-none">
                   <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 mr-4"></div>
                        <div>
                            <p className="font-semibold text-brand-text">LOCKED</p>
                            <p className="text-xs text-brand-secondary">Premium Only</p>
                        </div>
                   </div>
              </td>
              <td colSpan={5} className="p-4 text-center relative">
                 <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="bg-black/80 border border-brand-primary/50 px-4 py-1 rounded-full text-xs font-bold text-brand-primary flex items-center gap-2 shadow-neon backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        PREMIUM LOCKED
                    </span>
                 </div>
                 <div className="blur-sm opacity-30 select-none font-mono">
                     $ 10,000.00 +50%
                 </div>
              </td>
          </tr>
      )
  }

  const changeUSD = holding.dayChangeUSD ?? 0;
  const change = changeUSD * conversionRate;
  const changePercent = holding.dayChangePercent ?? 0;
  
  const isChangePositive = change > 0.001;
  const isChangeNegative = change < -0.001;

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-all duration-300 group relative">
      <td className="p-4">
        <div className="flex items-center">
          <div className="relative mr-4">
              <img 
                src={asset.logo} 
                alt={asset.name} 
                className="h-10 w-10 rounded-xl object-cover bg-black border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-300"
                onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=0B0E14&color=C9D1D9&bold=true&length=2`}
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-brand-bg ${asset.assetClass === 'Crypto' ? 'bg-yellow-500 shadow-[0_0_8px_orange]' : 'bg-blue-500 shadow-[0_0_8px_blue]'}`}></div>
          </div>
          <div>
            <p className="font-bold text-white tracking-wide group-hover:text-brand-primary transition-colors">{asset.ticker}</p>
            <p className="text-[10px] text-brand-secondary uppercase tracking-widest">{asset.assetClass}</p>
          </div>
        </div>
      </td>
      <td className="p-4 text-right">
        {quote ? (
          <div>
            <div className="flex items-center justify-end gap-2">
                {quote.marketState === MarketState.PRE && (
                    <span title="Pré-Mercado" className="animate-pulse"><SunIcon /></span>
                )}
                {quote.marketState === MarketState.POST && (
                    <span title="Pós-Mercado" className="animate-pulse"><MoonIcon /></span>
                )}
                <p className="font-mono text-brand-text">{formatCurrency(displayPrice, currencySymbol)}</p>
            </div>
            <p className={`text-xs font-mono mt-1 ${isChangePositive ? 'text-brand-success' : isChangeNegative ? 'text-brand-danger' : 'text-brand-secondary'}`}>
              {isChangePositive ? '+' : ''}{(change || 0).toFixed(2)} ({(changePercent || 0).toFixed(2)}%)
            </p>
          </div>
        ) : (
          <span className="text-brand-secondary text-xs animate-pulse font-mono">SYNCING...</span>
        )}
      </td>
      <td className="p-4 text-right">
        <p className="font-mono text-white">{totalQuantity.toLocaleString()}</p>
        <p className="text-xs text-brand-secondary font-mono opacity-60">Avg: {formatCurrency(displayAveragePrice, currencySymbol)}</p>
      </td>
      <td className="p-4 text-right">
        <p className="font-bold font-mono text-brand-text group-hover:text-brand-primary transition-colors">{formatCurrency(displayCurrentValue, currencySymbol)}</p>
        <div className="w-full bg-white/5 h-1 mt-2 rounded-full overflow-hidden">
            <div className="bg-brand-primary h-full rounded-full" style={{ width: `${holding.portfolioPercent}%` }}></div>
        </div>
      </td>
      {/* TOTAL RETURN */}
      <td className="p-4 text-right">
        <p className={`font-bold font-mono ${isReturnPositive ? 'text-brand-success drop-shadow-[0_0_5px_rgba(0,255,163,0.3)]' : isReturnNegative ? 'text-brand-danger drop-shadow-[0_0_5px_rgba(255,46,91,0.3)]' : 'text-brand-text'}`}>
            {isReturnPositive ? '+' : ''}{formatCurrency(totalReturn, currencySymbol)}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isReturnPositive ? 'bg-brand-success/10 text-brand-success' : isReturnNegative ? 'bg-brand-danger/10 text-brand-danger' : 'bg-white/5 text-brand-secondary'}`}>
            {formatPercent(totalReturnPercent)}
        </span>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onShowHistory(holding)} className="text-brand-secondary hover:text-brand-primary p-2 hover:bg-brand-primary/10 rounded-lg transition-all" title="Ver Histórico">
                <ClockIcon />
            </button>
            <button onClick={handleRemove} className="text-brand-secondary hover:text-brand-danger p-2 hover:bg-brand-danger/10 rounded-lg transition-all" title="Excluir">
                <TrashIcon />
            </button>
        </div>
      </td>
    </tr>
  );
};


const Portfolio: React.FC = () => {
  const { holdings, totalValue, removeHolding, formatDisplayValue, settings, t, canAddAsset } = usePortfolio();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyModalHolding, setHistoryModalHolding] = useState<Holding | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{t('myPortfolio')}</h1>
            <div className="flex items-center gap-4 mt-2">
                <p className="text-brand-primary text-2xl font-mono font-bold tracking-tight drop-shadow-neon">
                    {formatDisplayValue(totalValue)}
                </p>
                <div className="flex items-center px-3 py-1 rounded-full bg-brand-success/10 border border-brand-success/30 shadow-[0_0_10px_rgba(0,255,163,0.2)]">
                    <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-success"></span>
                    </span>
                    <span className="text-[10px] font-bold text-brand-success uppercase tracking-widest">{t('liveStatus')}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button
            onClick={() => {
                if (canAddAsset) {
                    setIsAddModalOpen(true);
                } else {
                    alert("Limite Atingido.");
                }
            }}
            className={`flex-1 md:flex-none font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg transform hover:-translate-y-1 ${
                canAddAsset 
                ? 'bg-gradient-to-r from-brand-primary to-blue-600 text-white shadow-neon hover:shadow-[0_0_20px_rgba(0,229,255,0.6)]' 
                : 'bg-brand-surface border border-brand-border text-brand-secondary cursor-not-allowed opacity-50'
            }`}
            >
            {canAddAsset ? `+ ${t('addTransaction').toUpperCase()}` : `LOCKED (6/6)`}
            </button>
        </div>
      </div>

      <Card className="overflow-x-auto hidden md:block p-0 border-white/5 bg-brand-surface/30">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-brand-secondary font-bold uppercase tracking-wider bg-black/20">
            <tr>
              <th className="p-5 pl-6">{t('asset')}</th>
              <th className="p-5 text-right">{t('price')}</th>
              <th className="p-5 text-right">{t('position')}</th>
              <th className="p-5 text-right">{t('totalValue')}</th>
              <th className="p-5 text-right">{t('totalReturn')}</th>
              <th className="p-5 text-center">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length > 0 ? (
              holdings.map((h) => <HoldingRow key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} onRemoveHolding={removeHolding} />)
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-20 text-brand-secondary">
                  <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="text-6xl">🌌</div>
                      <p className="font-mono uppercase tracking-widest">{t('emptyPortfolio')}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      
      <div className="md:hidden space-y-4">
        {holdings.length > 0 ? (
          holdings.map((h) => {
              if (h.isLocked) {
                  return (
                      <Card key={h.asset.ticker} className="opacity-60 relative overflow-hidden border-brand-primary/20">
                          <CardContent className="blur-[4px] pointer-events-none select-none">
                              <HoldingCard holding={h} onShowHistory={() => {}} />
                          </CardContent>
                          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
                             <span className="bg-black/80 border border-brand-primary px-4 py-1.5 rounded-full text-xs font-bold text-brand-primary flex items-center gap-2 shadow-neon backdrop-blur-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                PREMIUM
                             </span>
                          </div>
                      </Card>
                  );
              }
              return <HoldingCard key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} />
          })
        ) : (
           <Card className="border-dashed border-white/10 bg-transparent">
             <div className="text-center p-12 text-brand-secondary font-mono text-xs uppercase tracking-widest">
               {t('emptyPortfolio')}
             </div>
           </Card>
        )}
      </div>

      {isAddModalOpen && <AddTransactionModal onClose={() => setIsAddModalOpen(false)} />}
      {historyModalHolding && <TransactionHistoryModal holding={historyModalHolding} onClose={() => setHistoryModalHolding(null)} />}
    </div>
  );
};

export default Portfolio;