

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Holding, Asset, Quote } from '../types';
import { financialApi } from '../services/financialApi';
import { translations } from '../utils/translations';
import { useAuth } from './AuthContext';

// Settings Interface
export interface AppSettings {
  currency: 'BRL' | 'USD';
  language: 'pt-BR' | 'en-US';
}

interface PortfolioContextType {
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: string[];
  
  // Financials (Base USD) - Excludes Locked Assets
  totalValue: number; 
  totalInvested: number; 
  totalGainLoss: number; 
  totalGainLossPercent: number;
  dayChange: number; 
  dayChangePercent: number;

  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  importTransactions: (transactions: Omit<Transaction, 'id'>[]) => void; // NEW
  removeTransaction: (id: string) => void;
  removeHolding: (ticker: string) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  isAssetInWatchlist: (ticker: string) => boolean;
  getAssetDetails: (ticker: string) => Promise<Asset | undefined>;
  getLiveQuote: (ticker: string) => Quote | undefined;
  
  // App State
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  fxRate: number;
  lastUpdated: Date | null;

  // Settings & Helpers
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  formatDisplayValue: (valueInUSD: number) => string;
  t: (key: keyof typeof translations['pt-BR']) => string;

  // Subscription State
  isPremium: boolean;
  canAddAsset: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error("Could not save to localStorage", error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
};

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isPremium: checkIsPremium } = useAuth();
  
  // Prefix keys with userID for data isolation
  const userKey = currentUser ? currentUser.id : 'guest';

  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(`transactions_${userKey}`, []);
  const [watchlist, setWatchlist] = useLocalStorage<string[]>(`watchlist_${userKey}`, []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings', { currency: 'BRL', language: 'pt-BR' });
  
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [fxRate, setFxRate] = useState(5.25); // USD to BRL
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isPremiumUser = currentUser ? checkIsPremium(currentUser) : false;

  const allTickers = useMemo(() => {
    const portfolioTickers = transactions.map(t => t.ticker);
    return Array.from(new Set([...portfolioTickers, ...watchlist]));
  }, [transactions, watchlist]);

  // Initial Data Fetch (Assets & Meta)
  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        if (allTickers.length === 0) {
            setIsLoading(false);
            return;
        }
        try {
            const assetDetailsPromises = allTickers.map(ticker => financialApi.getAssetDetails(ticker));
            const fetchedAssets = await Promise.all(assetDetailsPromises);
            
            const newAssets: Record<string, Asset> = {};
            fetchedAssets.forEach(asset => {
                if(asset) newAssets[asset.ticker] = asset;
            });
            setAssets(newAssets);
        } catch (error) {
            console.error("Error fetching initial asset details", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchInitialData();
  }, [allTickers]);

  // Centralized Refresh Logic
  const refresh = useCallback(async () => {
      if (allTickers.length === 0) return;
      
      setIsRefreshing(true);
      try {
          const [newQuotes, newFxRate] = await Promise.all([
              financialApi.getQuotes(allTickers),
              financialApi.getFxRate('USD', 'BRL')
          ]);
          
          setQuotes(prev => ({ ...prev, ...newQuotes }));
          setFxRate(newFxRate);
          setLastUpdated(new Date());
      } catch (error) {
          console.error("Refresh error", error);
      } finally {
          setIsRefreshing(false);
      }
  }, [allTickers]);

  useEffect(() => {
    refresh(); 
    const intervalId = setInterval(() => {
        refresh();
    }, 30000); 
    return () => clearInterval(intervalId);
  }, [refresh]);

  // --- Subscription Logic Calculation ---
  // 1. Identify unique assets in portfolio
  const uniqueAssets = useMemo(() => {
      return Array.from(new Set(transactions.map(t => t.ticker)));
  }, [transactions]);

  // 2. Determine valid vs locked assets
  const { validTickers, lockedTickers } = useMemo(() => {
      if (isPremiumUser) {
          return { validTickers: uniqueAssets, lockedTickers: [] };
      }
      // Free user: first 6 assets are valid, rest are locked
      return {
          validTickers: uniqueAssets.slice(0, 6),
          lockedTickers: uniqueAssets.slice(6)
      };
  }, [uniqueAssets, isPremiumUser]);

  const canAddAsset = isPremiumUser || uniqueAssets.length < 6;

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => {
        const currentUnique = new Set(prev.map(t => t.ticker));
        // If ticker is new AND limit reached AND not premium -> Block
        if (!currentUnique.has(transaction.ticker.toUpperCase()) && currentUnique.size >= 6 && !isPremiumUser) {
            console.warn("Limit reached for free tier");
            return prev; 
        }

        const newTransaction: Transaction = { 
            ...transaction, 
            ticker: transaction.ticker.toUpperCase().trim(), 
            id: Date.now().toString(36) + Math.random().toString(36).substring(2)
        };
        return [...prev, newTransaction].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    });
  }, [setTransactions, isPremiumUser]);

  // NEW: Bulk Import
  const importTransactions = useCallback((newTransactions: Omit<Transaction, 'id'>[]) => {
      setTransactions(prev => {
          const added: Transaction[] = [];
          const currentUnique = new Set(prev.map(t => t.ticker));
          let uniqueCount = currentUnique.size;

          for (const t of newTransactions) {
              const ticker = t.ticker.toUpperCase().trim();
              // Check Limit
              if (!currentUnique.has(ticker)) {
                  if (uniqueCount >= 6 && !isPremiumUser) continue; // Skip over limit
                  currentUnique.add(ticker);
                  uniqueCount++;
              }

              added.push({
                  ...t,
                  ticker: ticker,
                  id: Date.now().toString(36) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
              });
          }
          
          const result = [...prev, ...added].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
          return result;
      });
  }, [setTransactions, isPremiumUser]);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [setTransactions]);

  const removeHolding = useCallback((ticker: string) => {
    const target = ticker.toUpperCase().trim();
    setTransactions(prev => prev.filter(t => t.ticker.toUpperCase().trim() !== target));
  }, [setTransactions]);

  const addToWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => Array.from(new Set([...prev, ticker.toUpperCase().trim()])));
  }, [setWatchlist]);

  const removeFromWatchlist = useCallback((ticker: string) => {
    const target = ticker.toUpperCase().trim();
    setWatchlist(prev => prev.filter(t => t.toUpperCase().trim() !== target));
  }, [setWatchlist]);

  const isAssetInWatchlist = useCallback((ticker: string) => watchlist.includes(ticker), [watchlist]);

  const getAssetDetails = useCallback(async (ticker: string) => {
      if (assets[ticker]) return assets[ticker];
      try {
        const asset = await financialApi.getAssetDetails(ticker);
        if (asset) setAssets(prev => ({...prev, [ticker]: asset}));
        return asset;
      } catch (e) {
          return undefined;
      }
  }, [assets]);
  
  const getLiveQuote = useCallback((ticker: string) => quotes[ticker], [quotes]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const formatDisplayValue = useCallback((valueInUSD: number) => {
      const isBRL = settings.currency === 'BRL';
      const finalValue = isBRL ? valueInUSD * fxRate : valueInUSD;
      
      return new Intl.NumberFormat(settings.language, {
          style: 'currency',
          currency: settings.currency,
      }).format(finalValue);
  }, [settings.currency, settings.language, fxRate]);

  const t = useCallback((key: keyof typeof translations['pt-BR']) => {
      return translations[settings.language][key] || key;
  }, [settings.language]);

  const { holdings, totalValue, totalInvested, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent } = useMemo(() => {
    const holdingsMap: { [key: string]: Omit<Holding, 'portfolioPercent' | 'asset' | 'quote' | 'currentValueUSD' | 'totalInvestedUSD' | 'totalGainLossUSD' | 'dayChange' | 'dayChangePercent'> & { ticker: string } } = {};

    for (const t of transactions) {
      if (!holdingsMap[t.ticker]) {
        holdingsMap[t.ticker] = {
          ticker: t.ticker,
          totalQuantity: 0,
          totalInvested: 0,
          averagePrice: 0,
          currentValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          transactions: [],
        };
      }
      const holding = holdingsMap[t.ticker];
      
      const tCost = Number(t.totalCost);
      const tQty = Number(t.quantity);

      if (!isNaN(tCost) && !isNaN(tQty)) {
          holding.totalInvested += tCost;
          holding.totalQuantity += tQty;
      }
      holding.transactions.push(t);
    }
    
    const now = new Date();

    const holdingsList = Object.values(holdingsMap).map(h => {
      const asset = assets[h.ticker];
      const quote = quotes[h.ticker];
      if (!asset) return null;

      h.averagePrice = h.totalInvested > 0 ? h.totalInvested / h.totalQuantity : 0;
      h.currentValue = quote ? (Number(quote.price) * h.totalQuantity) : 0;
      h.totalGainLoss = h.currentValue - h.totalInvested;
      h.totalGainLossPercent = h.totalInvested > 0 ? (h.totalGainLoss / h.totalInvested) * 100 : 0;
      
      let holdingDayChange = 0;

      if (quote) {
        h.transactions.forEach(t => {
            const txDate = new Date(t.dateTime);
            const isToday = txDate.getDate() === now.getDate() &&
                            txDate.getMonth() === now.getMonth() &&
                            txDate.getFullYear() === now.getFullYear();
            
            if (isToday) {
                const gainForThisTransaction = (quote.price - t.price) * t.quantity;
                holdingDayChange += gainForThisTransaction;
            } else {
                const previousClose = quote.previousClose ?? (quote.price - quote.change);
                const gainPerShare = quote.price - previousClose;
                holdingDayChange += (gainPerShare * t.quantity);
            }
        });
      }

      const startOfDayValue = h.currentValue - holdingDayChange;
      const dayChangePercent = Math.abs(startOfDayValue) > 0.01 ? (holdingDayChange / startOfDayValue) * 100 : 0;

      const { ticker, ...holdingData } = h;
      return { ...holdingData, asset, quote: quote || null, dayChange: holdingDayChange, dayChangePercent };
    }).filter((h): h is Omit<Holding, 'portfolioPercent' | 'currentValueUSD' | 'totalInvestedUSD' | 'totalGainLossUSD'> => h !== null);

    let totalValueUSD = 0;
    let totalInvestedUSD = 0;
    let dayChangeUSD = 0;

    const holdingsWithUSD = holdingsList.map(h => {
        const isBRL = h.asset.country === 'Brazil';
        const rate = isBRL && fxRate > 0 ? (1 / fxRate) : 1;

        const currentValueUSD = h.currentValue * rate;
        const holdingTotalInvestedUSD = h.totalInvested * rate;
        const totalGainLossUSD = currentValueUSD - holdingTotalInvestedUSD;
        const dayChangeForHoldingUSD = h.dayChange * rate;
        
        // SUBSCRIPTION LOGIC: Check if this asset is locked
        const isLocked = !validTickers.includes(h.asset.ticker);

        // Only add to totals if NOT locked
        if (!isLocked) {
            totalValueUSD += currentValueUSD;
            totalInvestedUSD += holdingTotalInvestedUSD;
            dayChangeUSD += dayChangeForHoldingUSD;
        }

        return {
            ...h,
            currentValueUSD,
            totalInvestedUSD: holdingTotalInvestedUSD,
            totalGainLossUSD,
            isLocked, 
        };
    });

    const finalHoldings = holdingsWithUSD.map(h => {
      // Portfolio percent calculated based on VALID TOTAL only or GLOBAL? 
      // Let's base it on Total Valid Value to make chart accurate for what is seen.
      return {
        ...h,
        portfolioPercent: (!h.isLocked && totalValueUSD > 0) ? (h.currentValueUSD / totalValueUSD) * 100 : 0,
      }
    }).sort((a,b) => {
        // Sort locked items to bottom
        if (a.isLocked && !b.isLocked) return 1;
        if (!a.isLocked && b.isLocked) return -1;
        return b.currentValueUSD - a.currentValueUSD;
    });

    const totalGainLossUSD = totalValueUSD - totalInvestedUSD;
    const totalGainLossPercentUSD = totalInvestedUSD > 0 ? (totalGainLossUSD / totalInvestedUSD) * 100 : 0;
    
    const previousDayValueUSD = totalValueUSD - dayChangeUSD;
    const dayChangePercentUSD = previousDayValueUSD > 0 ? (dayChangeUSD / previousDayValueUSD) * 100 : 0;

    return { 
        holdings: finalHoldings, 
        totalValue: totalValueUSD,
        totalInvested: totalInvestedUSD,
        totalGainLoss: totalGainLossUSD,
        totalGainLossPercent: totalGainLossPercentUSD,
        dayChange: dayChangeUSD,
        dayChangePercent: dayChangePercentUSD,
    };
  }, [transactions, quotes, assets, fxRate, validTickers]);


  const value = {
    holdings,
    transactions,
    watchlist,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercent,
    dayChange,
    dayChangePercent,
    addTransaction,
    importTransactions,
    removeTransaction,
    removeHolding,
    addToWatchlist,
    removeFromWatchlist,
    isAssetInWatchlist,
    getAssetDetails,
    getLiveQuote,
    isLoading,
    isRefreshing,
    refresh,
    fxRate,
    lastUpdated,
    settings,
    updateSettings,
    formatDisplayValue,
    t,
    isPremium: isPremiumUser,
    canAddAsset
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
