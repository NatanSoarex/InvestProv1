
import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Asset } from '../../types';
import { financialApi, TOP_ASSETS_FALLBACK } from '../../services/financialApi';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { AddTransactionModal } from '../portfolio/AddTransactionModal';
import { usePortfolio } from '../../contexts/PortfolioContext';

// Icons
const StarIconOutline = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const StarIconSolid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

interface SearchResultItemProps {
    asset: Asset;
    onAdd: (ticker: string) => void;
    isWatched: boolean;
    onToggleWatchlist: (ticker: string) => void;
    t: any;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ asset, onAdd, isWatched, onToggleWatchlist, t }) => (
    <div className="flex items-center justify-between p-4 border-b border-brand-border last:border-b-0 hover:bg-brand-surface/50 group transition-colors">
        <div className="flex items-center">
            <div className="relative mr-4">
                <img 
                    src={asset.logo} 
                    alt={asset.name} 
                    className="h-12 w-12 rounded-xl object-cover bg-brand-surface border border-brand-border/50 shadow-sm"
                    onError={(e) => e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.ticker}&background=30363D&color=C9D1D9&bold=true&length=2`} 
                />
                 {/* Simple source dot */}
                 <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-brand-bg ${asset.assetClass === 'Crypto' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
            </div>
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-lg text-brand-text tracking-tight">{asset.ticker}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                         asset.assetClass === 'Crypto' 
                         ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                         : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                        {asset.assetClass}
                    </span>
                </div>
                <p className="text-sm text-brand-secondary">{asset.name}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(asset.ticker);
                }}
                className={`p-2.5 rounded-full transition-all duration-200 ${
                    isWatched 
                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20' 
                    : 'bg-brand-bg hover:bg-brand-surface hover:text-yellow-400 border border-brand-border/50'
                }`}
                title={isWatched ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            >
                {isWatched ? <StarIconSolid /> : <StarIconOutline />}
            </button>
            
            <button 
                onClick={() => onAdd(asset.ticker)}
                className="text-sm bg-brand-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-brand-primary/20">
                + {t('add')}
            </button>
        </div>
    </div>
);

// Suggestion Grid Component
const TrendingSuggestions: React.FC<{ onSelect: (ticker: string) => void }> = ({ onSelect }) => {
    // Pick 8 diverse assets from fallback list
    const suggestions = [
        { t: 'PETR4', n: 'Petrobras' }, { t: 'BTC', n: 'Bitcoin' }, 
        { t: 'VALE3', n: 'Vale' }, { t: 'ETH', n: 'Ethereum' }, 
        { t: 'MXRF11', n: 'Maxi Renda' }, { t: 'NVDA', n: 'NVIDIA' },
        { t: 'HGLG11', n: 'CGHG Log' }, { t: 'IVVB11', n: 'S&P 500' }
    ];

    return (
        <div className="p-6">
            <h3 className="text-sm font-bold text-brand-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Sugestões do Mercado
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {suggestions.map(s => (
                    <button 
                        key={s.t} 
                        onClick={() => onSelect(s.t)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg border border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface transition-all text-left group"
                    >
                        <div className="font-bold text-brand-text group-hover:text-brand-primary transition-colors">{s.t}</div>
                        <div className="text-xs text-brand-secondary truncate">{s.n}</div>
                    </button>
                ))}
            </div>
        </div>
    )
}

const Search: React.FC = () => {
  const { addToWatchlist, removeFromWatchlist, isAssetInWatchlist, t, canAddAsset } = usePortfolio();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');

  useEffect(() => {
    const search = async () => {
        if (debouncedQuery.length > 0) {
            setIsLoading(true);
            const searchResults = await financialApi.searchAssets(debouncedQuery);
            setResults(searchResults);
            setIsLoading(false);
        } else {
            setResults([]);
        }
    }
    search();
  }, [debouncedQuery]);

  const handleAddClick = (ticker: string) => {
    if (!canAddAsset) {
        alert("Você atingiu o limite de 6 ativos do plano gratuito. Entre em contato com o administrador para aumentar seu limite.");
        return;
    }
    setSelectedTicker(ticker);
    setIsModalOpen(true);
  }

  const handleQuickSearch = (ticker: string) => {
      setQuery(ticker);
  }

  const handleToggleWatchlist = (ticker: string) => {
      // Optimistic update relies on Context state updating immediately
      if (isAssetInWatchlist(ticker)) {
          removeFromWatchlist(ticker);
      } else {
          addToWatchlist(ticker);
      }
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold text-brand-text">{t('searchTitle')}</h1>
        <p className="text-brand-secondary mt-1">{t('searchSubtitle')}</p>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-secondary group-focus-within:text-brand-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-4 text-brand-text text-lg focus:outline-none focus:ring-2 focus:ring-brand-primary pl-12 shadow-lg transition-all"
        />
        {query && (
             <button 
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary hover:text-brand-text bg-brand-bg rounded-full p-1"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
             </button>
        )}
      </div>

      <Card className="min-h-[300px] border-brand-border/50">
          <CardContent className="p-0">
            {isLoading && (
                <div className="p-12 flex flex-col items-center justify-center text-brand-secondary gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                    </div>
                    <span className="animate-pulse">{t('searching')}</span>
                </div>
            )}
            
            {!isLoading && results.length > 0 && (
                <div className="divide-y divide-brand-border">
                    <CardHeader className="bg-brand-surface/50 px-6 py-3 border-b border-brand-border">
                        {t('searchResults')}
                    </CardHeader>
                    {results.map(asset => (
                        <SearchResultItem 
                            key={asset.ticker} 
                            asset={asset} 
                            onAdd={handleAddClick} 
                            isWatched={isAssetInWatchlist(asset.ticker)}
                            onToggleWatchlist={handleToggleWatchlist}
                            t={t}
                        />
                    ))}
                </div>
            )}

            {!isLoading && results.length === 0 && (
                <div>
                    {query ? (
                        <div className="p-12 text-center text-brand-secondary">
                             <div className="mb-4 text-6xl opacity-20">🤷‍♂️</div>
                             <p className="font-medium text-brand-text mb-1 text-lg">{t('noResults')} "{query}"</p>
                             <p className="text-sm">Verifique a ortografia ou tente o símbolo exato.</p>
                        </div>
                    ) : (
                        <TrendingSuggestions onSelect={handleQuickSearch} />
                    )}
                </div>
            )}
          </CardContent>
      </Card>
      
      {isModalOpen && <AddTransactionModal onClose={() => setIsModalOpen(false)} initialTicker={selectedTicker} />}
    </div>
  );
};

export default Search;
