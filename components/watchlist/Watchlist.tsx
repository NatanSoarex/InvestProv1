
import React, { useEffect, useState, useCallback } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Card } from '../ui/Card';
import { Asset, Quote, MarketState } from '../../types';
import { formatUnitPrice, formatCurrency } from '../../utils/formatters';

const MarketBadge: React.FC<{ state?: MarketState }> = ({ state }) => {
    if (!state || state === MarketState.REGULAR || state === MarketState.OPEN) return null;
    
    return (
        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-brand-surface border border-brand-border text-brand-secondary inline-flex items-center justify-center ml-2">
            {state === MarketState.PRE ? 'Pré' : state === MarketState.POST ? 'Pós' : 'Closed'}
        </span>
    )
}

const WatchlistItem: React.FC<{
  asset: Asset;
  quote: Quote | undefined;
  onRemove: (ticker: string) => void;
  t: any;
}> = ({ asset, quote, onRemove, t }) => {
  const currency = asset.country === 'Brazil' ? 'BRL' : 'USD';
  
  const changePercent = quote ? quote.changePercent : 0;
  const changeValue = quote ? quote.change : 0;
  const isPositive = changeValue >= 0;
  const isNegative = changeValue < 0;

  // Visual estilo Google Finance
  const textTrend = isPositive ? 'text-[#3FB950]' : isNegative ? 'text-[#F85149]' : 'text-brand-secondary';
  
  // Rótulo temporal: Cripto = 24h, Ações = Hoje
  const timeLabel = asset.assetClass === 'Crypto' ? '24h' : 'Hoje';

  const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(asset.ticker);
  };

  return (
    <div className="relative group bg-brand-surface border border-brand-border hover:border-brand-primary/50 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden flex flex-col h-full">
        
        {/* Background Watermark Logo (Artistic Touch) */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.03] transform rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500">
             <img src={asset.logo} className="w-32 h-32 grayscale" alt="" />
        </div>

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-4">
                 <div className="relative flex-shrink-0">
                    <img 
                        src={asset.logo} 
                        alt={asset.name} 
                        className="h-14 w-14 rounded-2xl object-cover bg-brand-bg border border-brand-border/30 shadow-md"
                        onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=0D1117&color=C9D1D9&bold=true`}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#161B22] ${asset.assetClass === 'Crypto' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                 </div>
                 <div className="min-w-0">
                    <h3 className="font-bold text-xl text-brand-text tracking-tight leading-none truncate">{asset.ticker}</h3>
                    <p className="text-xs text-brand-secondary font-medium mt-1.5 truncate max-w-[120px] opacity-80">{asset.name}</p>
                 </div>
            </div>
            
             <button 
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-brand-danger/10 rounded-xl text-brand-secondary hover:text-[#F85149] transition-all duration-200"
                title="Remover"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
        
        <div className="relative z-10 mt-auto">
             {quote ? (
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-3xl font-black text-brand-text tracking-tighter">
                            {formatUnitPrice(quote.price, currency)}
                        </span>
                        <MarketBadge state={quote.marketState} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                         <span className={`text-sm font-bold flex items-center gap-1.5 px-2 py-1 rounded-lg ${isPositive ? 'bg-[#3FB950]/10 text-[#3FB950]' : 'bg-[#F85149]/10 text-[#F85149]'}`}>
                             {isPositive ? '▲' : '▼'} {formatCurrency(changeValue, currency)}
                             <span className="opacity-80 font-normal">({Math.abs(changePercent).toFixed(2)}%)</span>
                         </span>
                         
                         {/* Etiqueta de Tempo Organizada */}
                         <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider opacity-60">
                            {timeLabel}
                        </span>
                    </div>
                 </div>
             ) : (
                 <div className="space-y-3 animate-pulse">
                     <div className="h-9 w-32 bg-brand-bg/50 rounded-lg"></div>
                     <div className="h-6 w-20 bg-brand-bg/50 rounded-lg"></div>
                 </div>
             )}
        </div>
    </div>
  );
};

const Watchlist: React.FC = () => {
  const { watchlist, getAssetDetails, getLiveQuote, removeFromWatchlist, t } = usePortfolio();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWatchlist = async () => {
      setLoading(true);
      const data = await Promise.all(watchlist.map(ticker => getAssetDetails(ticker)));
      setAssets(data.filter((a): a is Asset => !!a));
      setLoading(false);
    };
    loadWatchlist();
  }, [watchlist, getAssetDetails]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-brand-border/30 pb-4">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-text to-brand-secondary tracking-tight">
              {t('watchlistTitle')}
          </h1>
          <p className="text-brand-secondary mt-2 text-lg font-light max-w-2xl">{t('watchlistSubtitle')}</p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-brand-secondary uppercase tracking-widest mb-1">Total Monitorado</p>
            <p className="text-2xl font-bold text-brand-primary">{assets.length} <span className="text-sm font-normal text-brand-secondary">ativos</span></p>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => (
               <div key={i} className="h-48 bg-brand-surface/30 animate-pulse rounded-2xl border border-brand-border/50"></div>
           ))}
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <WatchlistItem 
                key={asset.ticker} 
                asset={asset} 
                quote={getLiveQuote(asset.ticker)} 
                onRemove={removeFromWatchlist}
                t={t}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-brand-secondary border-2 border-dashed border-brand-border/30 rounded-3xl bg-brand-surface/20">
          <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mb-6 shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363 1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
             </svg>
          </div>
          <p className="text-xl font-bold text-brand-text mb-2">{t('emptyWatchlist')}</p>
          <p className="text-sm opacity-60">Utilize a barra de busca para adicionar seus ativos favoritos.</p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
