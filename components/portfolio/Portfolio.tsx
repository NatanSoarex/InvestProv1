import React, { useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Holding, MarketState } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { Card } from '../ui/Card';
import { HoldingCard } from './HoldingCard';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { formatCurrency, formatPercent } from '../../utils/formatters';

// ... (Icons code remains same, omitted for brevity, assuming existing icons)
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
const MoonIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-brand-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10 0-.64-.066-1.266-.19-1.872a1.475 1.475 0 00-2.23-1.086 8.997 8.997 0 01-1.767.568 8.84 8.84 0 01-1.813.2c-5.523 0-10-4.477-10-10 0-.615.06-1.22.172-1.807a1.475 1.475 0 00-2.128-1.65A9.954 9.954 0 002 12c0 5.523 4.477 10 10 10z" /></svg> );
const SunIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> );

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
  const displayPrice = (holding.totalQuantity > 0) ? ((holding.currentValueUSD || 0) / holding.totalQuantity) * conversionRate : 0;
  const displayAveragePrice = (holding.totalQuantity > 0) ? ((holding.totalInvestedUSD || 0) / holding.totalQuantity) * conversionRate : 0;
  
  const totalReturn = (holding.totalGainLossUSD || 0) * conversionRate;
  const totalReturnPercent = holding.totalGainLossPercent || 0;
  const changeUSD = holding.dayChangeUSD ?? 0;
  const change = changeUSD * conversionRate;
  const changePercent = holding.dayChangePercent ?? 0;

  // Colors Logic
  const returnColor = totalReturn > 0 ? 'text-brand-success' : totalReturn < 0 ? 'text-brand-danger' : 'text-brand-secondary';
  const changeColor = change > 0.001 ? 'text-brand-success' : change < -0.001 ? 'text-brand-danger' : 'text-brand-secondary';

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      onRemoveHolding(asset.ticker);
  };

  if (isLocked) {
      return (
          <tr className="border-b border-brand-border bg-black/20">
              <td className="p-4 opacity-50 blur-[2px] pointer-events-none" colSpan={6}>
                 LOCKED ASSET
              </td>
          </tr>
      )
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
      <td className="p-4">
        <div className="flex items-center">
          <div className="relative mr-4">
              <img 
                src={asset.logo} 
                alt={asset.name} 
                className="h-10 w-10 rounded-xl object-cover bg-brand-bg border border-white/10"
                onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=0F172A&color=E2E8F0`}
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-brand-surface ${asset.assetClass === 'Crypto' ? 'bg-yellow-500' : 'bg-brand-primary'}`}></div>
          </div>
          <div>
            <p className="font-bold text-white tracking-wide">{asset.ticker}</p>
            <p className="text-xs text-brand-secondary uppercase">{asset.assetClass}</p>
          </div>
        </div>
      </td>
      <td className="p-4 text-right">
        {quote ? (
          <div>
            <div className="flex items-center justify-end gap-2 text-brand-text font-mono">
                {quote.marketState === MarketState.PRE && <SunIcon />}
                {quote.marketState === MarketState.POST && <MoonIcon />}
                {formatCurrency(displayPrice, currencySymbol)}
            </div>
            <p className={`text-xs font-mono mt-1 ${changeColor}`}>
              {change > 0 ? '+' : ''}{(change || 0).toFixed(2)} ({(changePercent || 0).toFixed(2)}%)
            </p>
          </div>
        ) : <span className="text-xs text-brand-secondary">...</span>}
      </td>
      <td className="p-4 text-right">
        <p className="font-mono text-white">{totalQuantity.toLocaleString()}</p>
        <p className="text-xs text-brand-secondary font-mono opacity-70">Avg: {formatCurrency(displayAveragePrice, currencySymbol)}</p>
      </td>
      <td className="p-4 text-right">
        <p className="font-bold font-mono text-white">{formatCurrency(displayCurrentValue, currencySymbol)}</p>
      </td>
      <td className="p-4 text-right">
        <p className={`font-bold font-mono ${returnColor}`}>
            {totalReturn > 0 ? '+' : ''}{formatCurrency(totalReturn, currencySymbol)}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${returnColor.replace('text-', 'bg-')}/10`}>
            {formatPercent(totalReturnPercent)}
        </span>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100">
            <button onClick={() => onShowHistory(holding)} className="p-2 hover:bg-brand-primary/10 text-brand-secondary hover:text-brand-primary rounded-lg transition-colors"><ClockIcon /></button>
            <button onClick={handleRemove} className="p-2 hover:bg-brand-danger/10 text-brand-secondary hover:text-brand-danger rounded-lg transition-colors"><TrashIcon /></button>
        </div>
      </td>
    </tr>
  );
};

const Portfolio: React.FC = () => {
  const { holdings, totalValue, removeHolding, formatDisplayValue, t, canAddAsset } = usePortfolio();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyModalHolding, setHistoryModalHolding] = useState<Holding | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">{t('myPortfolio')}</h1>
            <div className="flex items-center gap-3 mt-2">
                <p className="text-brand-primary text-2xl font-bold font-mono">
                    {formatDisplayValue(totalValue)}
                </p>
                <span className="flex items-center px-2 py-0.5 rounded-full bg-brand-success/10 border border-brand-success/20 text-[10px] font-bold text-brand-success uppercase">
                    Ao Vivo
                </span>
            </div>
        </div>
        <button
            onClick={() => canAddAsset ? setIsAddModalOpen(true) : alert("Limite Atingido.")}
            className={`font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-transform active:scale-95 ${
                canAddAsset ? 'bg-brand-primary text-white hover:bg-blue-600' : 'bg-brand-surface border border-brand-border text-brand-secondary'
            }`}
        >
            + {t('addTransaction')}
        </button>
      </div>

      <Card className="hidden md:block p-0 overflow-hidden border-brand-border">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-brand-secondary font-bold uppercase tracking-wider bg-brand-surface/50 border-b border-white/5">
            <tr>
              <th className="p-4 pl-6">{t('asset')}</th>
              <th className="p-4 text-right">{t('price')}</th>
              <th className="p-4 text-right">{t('position')}</th>
              <th className="p-4 text-right">{t('totalValue')}</th>
              <th className="p-4 text-right">{t('totalReturn')}</th>
              <th className="p-4 text-center">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {holdings.length > 0 ? (
              holdings.map((h) => <HoldingRow key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} onRemoveHolding={removeHolding} />)
            ) : (
              <tr><td colSpan={6} className="text-center p-10 text-brand-secondary">{t('emptyPortfolio')}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      
      <div className="md:hidden space-y-4">
        {holdings.length > 0 ? (
          holdings.map((h) => <HoldingCard key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} />)
        ) : (
           <div className="text-center p-8 text-brand-secondary">{t('emptyPortfolio')}</div>
        )}
      </div>

      {isAddModalOpen && <AddTransactionModal onClose={() => setIsAddModalOpen(false)} />}
      {historyModalHolding && <TransactionHistoryModal holding={historyModalHolding} onClose={() => setHistoryModalHolding(null)} />}
    </div>
  );
};

export default Portfolio;