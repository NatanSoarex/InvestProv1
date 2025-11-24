
import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Asset } from '../../types';
import { financialApi } from '../../services/financialApi';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCurrency } from '../../utils/formatters';

interface AddTransactionModalProps {
  onClose: () => void;
  initialTicker?: string;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, initialTicker = '' }) => {
  const { addTransaction, getAssetDetails, t } = usePortfolio();
  const [ticker, setTicker] = useState(initialTicker);
  
  // Inputs
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(''); // Price per share
  const [totalCost, setTotalCost] = useState(''); // Total Cost
  
  // Computed/Meta
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [fetchedHistoricalPrice, setFetchedHistoricalPrice] = useState<number | null>(null);
  
  const debouncedTicker = useDebounce(ticker, 300);
  const currencyLabel = selectedAsset?.country === 'Brazil' ? 'BRL' : 'USD';
  const currencyCode = selectedAsset?.country === 'Brazil' ? 'BRL' : 'USD';

  useEffect(() => {
    const fetchInitialAsset = async () => {
        if(initialTicker) {
            const asset = await getAssetDetails(initialTicker);
            if (asset) setSelectedAsset(asset);
        }
    };
    fetchInitialAsset();
  }, [initialTicker, getAssetDetails]);
  
  // Debounced search
  useEffect(() => {
    const search = async () => {
        if (debouncedTicker.length > 1 && !selectedAsset) {
            setIsSearching(true);
            const results = await financialApi.searchAssets(debouncedTicker);
            setSearchResults(results);
            setIsSearching(false);
        } else {
            setSearchResults([]);
        }
    }
    search();
  }, [debouncedTicker, selectedAsset]);

  // Fetch historical price logic - Uses the new Robust API
  useEffect(() => {
    const fetchPrice = async () => {
        if (selectedAsset && date && time) {
            setIsFetchingPrice(true);
            setError(''); 
            setFetchedHistoricalPrice(null);
            
            const combinedDateTime = new Date(`${date}T${time}`).toISOString();
            try {
                // This will now hit Binance/Coinbase/CoinCap correctly for Crypto
                const result = await financialApi.getHistoricalPriceAtTime(selectedAsset.ticker, combinedDateTime);
                if (result) {
                    setFetchedHistoricalPrice(result.price);
                }
            } catch (e) {
                console.error('Failed to fetch historical price');
            } finally {
                setIsFetchingPrice(false);
            }
        }
    };
    fetchPrice();
  }, [selectedAsset, date, time]); 

    // Logic: 
    // 1. If I change Quantity: 
    //    - If TotalCost is present, CALC PRICE (Reverse).
    //    - If Price is present (and no Total), CALC TOTAL.
    const handleQuantityChange = (val: string) => {
        setQuantity(val);
        const qty = parseFloat(val);
        const p = parseFloat(price);
        const tc = parseFloat(totalCost);

        if (!isNaN(qty) && qty > 0) {
            if (!isNaN(tc) && tc > 0) {
                // Scenario: User knows Total Spent and Quantity. Calc Unit Price.
                const calculatedPrice = tc / qty;
                // High precision for Crypto
                setPrice(calculatedPrice.toFixed(10).replace(/\.?0+$/, ""));
            } else if (!isNaN(p) && p > 0) {
                // Scenario: User set Price manually first. Calc Total.
                setTotalCost((qty * p).toFixed(2));
            }
        }
    };

    // Logic:
    // 2. If I change Price (Manual Override):
    //    - Calc Total Cost based on Quantity.
    const handlePriceChange = (val: string) => {
        setPrice(val);
        const p = parseFloat(val);
        const qty = parseFloat(quantity);
        
        if (!isNaN(qty) && !isNaN(p)) {
            setTotalCost((qty * p).toFixed(2));
        }
    };

    // Logic:
    // 3. If I change Total Cost (User Input):
    //    - If Quantity is present, CALC PRICE (Reverse).
    const handleTotalCostChange = (val: string) => {
        setTotalCost(val);
        const total = parseFloat(val);
        const qty = parseFloat(quantity);
        
        if (!isNaN(total) && !isNaN(qty) && qty > 0) {
            // Reverse Engineer Price
            const calculatedPrice = total / qty;
            setPrice(calculatedPrice.toFixed(10).replace(/\.?0+$/, ""));
        }
    };

    // Apply the suggestion from API
    const applySuggestedPrice = () => {
        if (fetchedHistoricalPrice) {
            setPrice(fetchedHistoricalPrice.toString());
            // If quantity exists, update total
            const qty = parseFloat(quantity);
            if (!isNaN(qty) && qty > 0) {
                setTotalCost((qty * fetchedHistoricalPrice).toFixed(2));
            }
        }
    };

    useEffect(() => {
        const numPrice = parseFloat(price);
        if (fetchedHistoricalPrice && numPrice > 0 && !isFetchingPrice) {
            const deviation = Math.abs(numPrice - fetchedHistoricalPrice) / fetchedHistoricalPrice;
            // Warn if deviation > 20%
            if (deviation > 0.20) {
                setWarning(
                    `${t('priceWarning')} (${formatCurrency(numPrice, currencyCode)} vs ${formatCurrency(fetchedHistoricalPrice, currencyCode)}).`
                );
            } else {
                setWarning('');
            }
        } else {
            setWarning('');
        }
  }, [price, fetchedHistoricalPrice, currencyCode, isFetchingPrice, t]);


  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setTicker(asset.ticker);
    setSearchResults([]);
    setPrice(''); 
    setTotalCost('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedAsset || !quantity || !price || !totalCost || !date || !time) {
      setError(t('fillFields'));
      return;
    }
    
    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(price);
    const numTotalCost = parseFloat(totalCost);

    if (isNaN(numQuantity) || isNaN(numPrice) || isNaN(numTotalCost) || numQuantity <= 0 || numPrice <= 0) {
      setError(t('positiveNumbers'));
      return;
    }
    
    const combinedDateTime = new Date(`${date}T${time}`).toISOString();

    addTransaction({
      ticker: selectedAsset.ticker,
      quantity: numQuantity,
      price: numPrice, // Saves strict number
      totalCost: numTotalCost, // Saves strict number
      dateTime: combinedDateTime,
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
      <div className="bg-brand-surface rounded-xl p-6 md:p-8 w-full max-w-md m-4 border border-brand-border shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-text">{t('addTransactionTitle')}</h2>
          <button onClick={onClose} className="text-brand-secondary hover:text-brand-text p-1">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative z-20">
            <label className="block text-xs font-semibold text-brand-secondary uppercase mb-1.5">{t('assetLabel')}</label>
            <div className="relative">
              <input
                type="text"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  setSelectedAsset(null);
                  setFetchedHistoricalPrice(null);
                  setError('');
                  setWarning('');
                }}
                placeholder={t('assetSearchPlaceholder')}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
              />
              {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner/></div>}
            </div>
            {searchResults.length > 0 && (
              <ul className="absolute z-30 w-full bg-brand-bg border border-brand-border rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                {searchResults.map(asset => (
                  <li 
                    key={asset.ticker} 
                    onClick={() => handleSelectAsset(asset)}
                    className="px-4 py-3 cursor-pointer hover:bg-brand-surface border-b border-brand-border last:border-0 flex items-center gap-3 group"
                  >
                    <div className="relative">
                        <img 
                            src={asset.logo} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover bg-brand-surface shadow-sm group-hover:scale-110 transition-transform" 
                            onError={(e) => { e.currentTarget.src=`https://ui-avatars.com/api/?name=${asset.ticker}&background=30363D&color=C9D1D9`}}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-brand-bg ${asset.assetClass === 'Crypto' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                             <span className="font-bold text-brand-text text-sm">{asset.ticker}</span>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                 asset.assetClass === 'Crypto' 
                                 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                                 : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                             }`}>
                                {asset.assetClass}
                             </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                            <span className="text-brand-secondary text-xs truncate pr-2">{asset.name}</span>
                            <span className="text-[9px] text-brand-secondary uppercase opacity-50">
                                {t('source')}: {asset.assetClass === 'Crypto' ? 'Binance/Coinbase' : 'Yahoo Finance'}
                            </span>
                        </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {selectedAsset && (
                 <div className="flex items-center gap-3 mt-3 text-sm bg-brand-surface/50 p-3 rounded-lg border border-brand-border">
                    <img src={selectedAsset.logo} className="w-8 h-8 rounded-full bg-brand-bg" alt="" onError={(e) => { e.currentTarget.src=`https://ui-avatars.com/api/?name=${selectedAsset.ticker}&background=30363D&color=C9D1D9`}}/>
                    <div>
                        <p className="font-semibold text-brand-text leading-tight">{selectedAsset.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-brand-secondary">{selectedAsset.ticker}</span>
                            <span className="text-brand-border">•</span>
                            <span className="text-xs text-brand-secondary opacity-70">
                                {t('source')}: {selectedAsset.assetClass === 'Crypto' ? 'Multi-Source API' : 'Yahoo Finance'}
                            </span>
                        </div>
                    </div>
                 </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-brand-secondary uppercase mb-1.5">{t('date')}</label>
                <input
                type="date"
                value={date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-brand-secondary uppercase mb-1.5">{t('time')}</label>
                <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
            </div>
          </div>
          
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-brand-secondary uppercase mb-1.5">{t('quantity')}</label>
                    <input
                    type="number"
                    step="any"
                    value={quantity}
                    disabled={isFetchingPrice}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary text-right disabled:opacity-50"
                    />
                </div>
                 <div>
                     <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-brand-secondary uppercase">{t('totalCost')} ({currencyLabel})</label>
                        <span className="text-[10px] text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">{t('costBase')}</span>
                     </div>
                     <input
                        type="number"
                        step="any"
                        value={totalCost}
                        disabled={isFetchingPrice}
                        onChange={(e) => handleTotalCostChange(e.target.value)}
                        placeholder={isFetchingPrice ? t('calculatingCost') : "0.00"}
                        className="w-full bg-brand-bg border border-brand-primary/50 rounded-lg px-4 py-2 text-brand-text font-bold text-base focus:outline-none focus:ring-2 focus:ring-brand-primary text-right disabled:opacity-50"
                     />
                 </div>
            </div>

            {/* Unit Price moved to secondary position */}
            <div className="relative bg-brand-surface/30 p-3 rounded-lg border border-brand-border border-dashed">
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-brand-secondary uppercase">
                        {t('unitPrice')} ({currencyLabel})
                    </label>
                    {/* Suggestion Badge */}
                    {fetchedHistoricalPrice && (
                        <button 
                            type="button"
                            onClick={applySuggestedPrice}
                            className="text-[10px] flex items-center gap-1 text-brand-primary hover:underline cursor-pointer bg-brand-primary/5 px-2 py-0.5 rounded border border-brand-primary/10"
                        >
                            <span>Sugestão (API): {formatCurrency(fetchedHistoricalPrice, currencyCode)}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </button>
                    )}
                </div>
                <input
                type="number"
                step="any"
                value={price}
                disabled={isFetchingPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder={t('calculatingCost')}
                className={`w-full bg-transparent border-none p-0 text-brand-text text-sm focus:outline-none focus:ring-0 text-right disabled:opacity-70 ${!price ? 'italic opacity-50' : ''}`}
                />
                 {isFetchingPrice && (
                    <div className="absolute left-3 top-9 text-xs text-brand-secondary animate-pulse flex gap-2">
                         <Spinner /> {t('syncing')}
                    </div>
                )}
            </div>
          
          {warning && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-300 text-xs flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.626-1.154 2.26-1.154 2.886 0l7.265 13.38c.66 1.218-.28 2.771-1.638 2.771H2.63c-1.358 0-2.298-1.553-1.638-2.771L8.257 3.099zM9 13a1 1 0 112 0 1 1 0 01-2 0zm0-5a1 1 0 011-1h0a1 1 0 011 1v3a1 1 0 01-2 0V8z" clipRule="evenodd" />
                </svg>
                <span>{warning}</span>
            </div>
          )}
          {error && <p className="text-sm text-brand-danger text-center">{error}</p>}
          
          <div className="flex justify-end pt-2 space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-brand-secondary hover:text-brand-text transition-colors">{t('cancel')}</button>
            <button type="submit" className="bg-brand-primary text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-brand-primary/20">
                {t('saveTransaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
