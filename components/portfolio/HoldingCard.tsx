
import React from 'react';
import { Holding, MarketState } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { formatCurrency, formatPercent, formatUnitPrice } from '../../utils/formatters';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface HoldingCardProps {
    holding: Holding;
    onShowHistory: (holding: Holding) => void;
}

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 22c5.523 0 10-4.477 10-10 0-.64-.066-1.266-.19-1.872a1.475 1.475 0 00-2.23-1.086 8.997 8.997 0 01-1.767.568 8.84 8.84 0 01-1.813.2c-5.523 0-10-4.477-10-10 0-.615.06-1.22.172-1.807a1.475 1.475 0 00-2.128-1.65A9.954 9.954 0 002 12c0 5.523 4.477 10 10 10z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

export const HoldingCard: React.FC<HoldingCardProps> = ({ holding, onShowHistory }) => {
  const { removeHolding, t } = usePortfolio();
  const { asset, quote, totalQuantity, averagePrice, currentValue, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent } = holding;
  const currency = asset.country === 'Brazil' ? 'BRL' : 'USD';

  const isDayChangePositive = dayChange >= 0;
  const isTotalReturnPositive = totalGainLoss >= 0;
  const dayChangeValue = dayChange;
  
  // New Logic: Calculate per-share gain/loss
  const currentPrice = quote ? quote.price : 0;
  const gainPerShare = currentPrice - averagePrice;
  const isGainPerSharePositive = gainPerShare >= 0;

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      removeHolding(asset.ticker);
  };

  return (
    <Card>
      <CardContent className="text-sm">
        {/* Header: Asset Info & Market Value */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={asset.logo || `https://ui-avatars.com/api/?name=${asset.ticker}&background=30363D&color=C9D1D9`} alt={asset.name} className="h-10 w-10 rounded-full" />
            <div>
              <div className="flex items-center gap-2">
                  <p className="font-semibold text-brand-text text-base">{asset.ticker}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-secondary font-mono">
                    {totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} un
                  </span>
              </div>
              <p className="text-xs text-brand-secondary truncate w-32 md:w-full">{asset.name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-brand-secondary mb-0.5">{t('totalValue')}</p>
            <p className="font-bold text-lg text-brand-text">{formatCurrency(currentValue, currency)}</p>
          </div>
        </div>
        
        <hr className="my-3 border-brand-border" />
        
        {/* Performance Section */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Wallet Impact (Total Return) */}
            <div>
                <p className="text-brand-secondary text-xs uppercase font-bold tracking-wider mb-1">{t('totalReturn')} (Carteira)</p>
                <div className={`font-medium text-base ${isTotalReturnPositive ? 'text-brand-success' : 'text-brand-danger'}`}>
                    <span>{formatCurrency(totalGainLoss, currency)}</span>
                    <span className="ml-1 text-xs opacity-80">({formatPercent(totalGainLossPercent)})</span>
                </div>
            </div>

            {/* Market Impact (Price Change) */}
            <div>
                <p className="text-brand-secondary text-xs uppercase font-bold tracking-wider mb-1">{t('dayChange')}</p>
                <div className={`font-medium text-base ${isDayChangePositive ? 'text-brand-success' : 'text-brand-danger'}`}>
                    {quote ? (
                        <>
                            <span>{isDayChangePositive ? '+' : ''}{formatCurrency(dayChangeValue, currency)}</span>
                            <span className="ml-1 text-xs opacity-80">({dayChangePercent.toFixed(2)}%)</span>
                        </>
                    ) : '...'}
                </div>
            </div>
        </div>

        {/* Price Analysis (The Math Breakdown) */}
        <div className="mt-4 bg-brand-bg/30 rounded-lg p-3 border border-brand-border/50">
            <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-brand-secondary font-medium">Seu Preço Médio</span>
                 <span className="text-xs text-brand-text font-mono">{formatUnitPrice(averagePrice, currency)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-1">
                    <span className="text-xs text-brand-secondary font-medium">{t('currentPrice')}</span>
                    {quote && quote.marketState === MarketState.PRE && <SunIcon />}
                    {quote && quote.marketState === MarketState.POST && <MoonIcon />}
                 </div>
                 <span className="text-xs text-brand-text font-bold font-mono">{quote ? formatUnitPrice(quote.price, currency) : '...'}</span>
            </div>
            
            <div className="border-t border-brand-border/30 pt-2 mt-1 flex justify-between items-center">
                <span className="text-xs text-brand-secondary font-medium">Diferença por Cota</span>
                <span className={`text-xs font-bold font-mono ${isGainPerSharePositive ? 'text-brand-success' : 'text-brand-danger'}`}>
                    {gainPerShare > 0 ? '+' : ''}{formatCurrency(gainPerShare, currency)}
                </span>
            </div>
        </div>

        <div className="mt-4 flex gap-3">
             <button 
                onClick={() => onShowHistory(holding)} 
                className="flex-1 text-center py-2 text-sm font-semibold bg-brand-surface hover:bg-brand-border/50 border border-brand-border rounded-lg text-brand-primary transition-colors"
            >
                {t('viewTransactions')}
            </button>
            <button 
                onClick={handleRemove}
                className="px-3 py-2 text-sm font-semibold bg-brand-surface hover:bg-brand-danger/10 border border-brand-border hover:border-brand-danger/50 rounded-lg text-brand-secondary hover:text-brand-danger transition-all z-10 relative"
                title={t('deleteAssetTooltip')}
            >
                <TrashIcon />
            </button>
        </div>
      </CardContent>
    </Card>
  );
};
