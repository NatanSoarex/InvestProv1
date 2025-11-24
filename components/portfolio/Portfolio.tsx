
import React, { useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Holding, MarketState } from '../../types';
import { AddTransactionModal } from './AddTransactionModal';
import { Card, CardContent } from '../ui/Card';
import { HoldingCard } from './HoldingCard';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { formatCurrency, formatPercent } from '../../utils/formatters';

// Icons... (Existing Icons)
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 22c5.523 0 10-4.477 10-10 0-.64-.066-1.266-.19-1.872a1.475 1.475 0 00-2.23-1.086 8.997 8.997 0 01-1.767.568 8.84 8.84 0 01-1.813.2c-5.523 0-10-4.477-10-10 0-.615.06-1.22.172-1.807a1.475 1.475 0 00-2.128-1.65A9.954 9.954 0 002 12c0 5.523 4.477 10 10 10z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

interface HoldingRowProps {
    holding: Holding;
    onShowHistory: (holding: Holding) => void;
    onRemoveHolding: (ticker: string) => void;
}

const HoldingRow: React.FC<HoldingRowProps> = ({ holding, onShowHistory, onRemoveHolding }) => {
  const { asset, quote, totalQuantity, averagePrice, currentValue, portfolioPercent, isLocked } = holding;
  const currency = asset.country === 'Brazil' ? 'BRL' : 'USD';

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemoveHolding(asset.ticker);
  };

  if (isLocked) {
      return (
          <tr className="border-b border-brand-border relative overflow-hidden bg-brand-bg/30">
              <td className="p-4 opacity-50 blur-[2px] select-none pointer-events-none">
                   <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-brand-surface border border-brand-border mr-4"></div>
                        <div>
                            <p className="font-semibold text-brand-text">LOCKED</p>
                            <p className="text-xs text-brand-secondary">Premium Only</p>
                        </div>
                   </div>
              </td>
              <td colSpan={4} className="p-4 text-center relative">
                 <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="bg-brand-surface border border-brand-border px-3 py-1 rounded-full text-xs font-bold text-brand-secondary flex items-center gap-2 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Assinatura Necessária
                    </span>
                 </div>
                 <div className="blur-sm opacity-30 select-none">
                     $ 10,000.00 +50%
                 </div>
              </td>
          </tr>
      )
  }

  return (
    <tr className="border-b border-brand-border hover:bg-brand-surface/50 transition-colors group">
      <td className="p-4">
        <div className="flex items-center">
          <div className="relative mr-4">
              <img 
                src={asset.logo} 
                alt={asset.name} 
                className="h-9 w-9 rounded-full object-cover bg-brand-surface border border-brand-border"
                onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=30363D&color=C9D1D9&bold=true&length=2`}
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-brand-bg ${asset.assetClass === 'Crypto' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
          </div>
          <div>
            <p className="font-semibold text-brand-text group-hover:text-brand-primary transition-colors">{asset.ticker}</p>
            <p className="text-xs text-brand-secondary w-40 truncate">{asset.name}</p>
          </div>
        </div>
      </td>
      <td className="p-4 text-right">
        {quote ? (
          <div>
            <div className="flex items-center justify-end gap-1.5">
                {quote.marketState === MarketState.PRE && (
                    <span title="Pré-Mercado" className="animate-pulse"><SunIcon /></span>
                )}
                {quote.marketState === MarketState.POST && (
                    <span title="Pós-Mercado" className="animate-pulse"><MoonIcon /></span>
                )}
                <p className="font-medium text-brand-text">{formatCurrency(quote.price, currency)}</p>
            </div>
            <p className={`text-xs ${quote.change >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
              {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </p>
          </div>
        ) : (
          <span className="text-brand-secondary text-xs animate-pulse">Sincronizando...</span>
        )}
      </td>
      <td className="p-4 text-right">
        <p className="font-medium text-brand-text">{totalQuantity.toLocaleString()}</p>
        <p className="text-xs text-brand-secondary">@{formatCurrency(averagePrice, currency)}</p>
      </td>
      <td className="p-4 text-right">
        <p className="font-medium text-brand-text">{formatCurrency(currentValue, currency)}</p>
        <p className="text-xs text-brand-secondary">{formatPercent(portfolioPercent)} do portfólio</p>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2">
            <button onClick={() => onShowHistory(holding)} className="text-brand-secondary hover:text-brand-primary p-2 hover:bg-brand-bg rounded-full transition-all" title="Ver Histórico de Transações">
                <ClockIcon />
            </button>
            <button onClick={handleRemove} className="text-brand-secondary hover:text-brand-danger p-2 hover:bg-brand-bg rounded-full transition-all z-10 relative" title="Excluir Ativo Imediatamente">
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-brand-text">{t('myPortfolio')}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="text-brand-primary text-2xl font-bold tracking-tight">
                    {formatDisplayValue(totalValue)}
                </p>
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-brand-border h-8">
                    <div className="flex items-center px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 text-brand-success">
                        <span className="relative flex h-2 w-2 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-success"></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('liveStatus')} ({settings.currency})</span>
                    </div>
                </div>
            </div>
        </div>
        <button
          onClick={() => {
              if (canAddAsset) {
                  setIsAddModalOpen(true);
              } else {
                  alert("Você atingiu o limite de 6 ativos do plano gratuito. Entre em contato com o administrador para aumentar seu limite.");
              }
          }}
          className={`font-semibold px-4 py-2 rounded-lg transition-colors w-full md:w-auto shadow-lg ${
              canAddAsset 
              ? 'bg-brand-primary text-white hover:bg-blue-500 shadow-brand-primary/20' 
              : 'bg-brand-surface border border-brand-border text-brand-secondary cursor-not-allowed opacity-70'
          }`}
        >
          {canAddAsset ? `+ ${t('addTransaction')}` : `Limite Atingido (6/6)`}
        </button>
      </div>

      <Card className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-brand-secondary uppercase bg-brand-surface/50">
            <tr className="border-b border-brand-border">
              <th className="p-4 font-semibold pl-6">{t('asset')}</th>
              <th className="p-4 font-semibold text-right">{t('price')}</th>
              <th className="p-4 font-semibold text-right">{t('position')}</th>
              <th className="p-4 font-semibold text-right">{t('totalValue')}</th>
              <th className="p-4 font-semibold text-center">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length > 0 ? (
              holdings.map((h) => <HoldingRow key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} onRemoveHolding={removeHolding} />)
            ) : (
              <tr>
                <td colSpan={5} className="text-center p-12 text-brand-secondary">
                  <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                      <p>{t('emptyPortfolio')}</p>
                      <p className="text-xs opacity-60">{t('emptyPortfolioDesc')}</p>
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
                      <Card key={h.asset.ticker} className="opacity-60 relative overflow-hidden">
                          <CardContent className="blur-[2px] pointer-events-none select-none">
                              <HoldingCard holding={h} onShowHistory={() => {}} />
                          </CardContent>
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                             <span className="bg-brand-surface border border-brand-border px-3 py-1 rounded-full text-xs font-bold text-brand-secondary flex items-center gap-2 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                Premium
                             </span>
                          </div>
                      </Card>
                  );
              }
              return <HoldingCard key={h.asset.ticker} holding={h} onShowHistory={setHistoryModalHolding} />
          })
        ) : (
           <Card>
             <div className="text-center p-8 text-brand-secondary">
               {t('emptyPortfolio')} {t('emptyPortfolioDesc')}
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
