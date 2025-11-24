
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Holding, Asset, Quote } from '../types';
import { financialApi } from '../services/financialApi';
import { translations } from '../utils/translations';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface AppSettings {
  currency: 'BRL' | 'USD';
  language: 'pt-BR' | 'en-US';
}

interface PortfolioContextType {
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: string[];
  totalValue: number; 
  totalInvested: number; 
  totalGainLoss: number; 
  totalGainLossPercent: number;
  dayChange: number; 
  dayChangePercent: number;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  importTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  removeTransaction: (id: string) => void;
  removeHolding: (ticker: string) => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  isAssetInWatchlist: (ticker: string) => boolean;
  getAssetDetails: (ticker: string) => Promise<Asset | undefined>;
  getLiveQuote: (ticker: string) => Quote | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  fxRate: number;
  lastUpdated: Date | null;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  formatDisplayValue: (valueInUSD: number) => string;
  t: (key: keyof typeof translations['pt-BR']) => string;
  isPremium: boolean;
  canAddAsset: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Hook LocalStorage (Mantido para fallback)
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
  const userKey = currentUser ? currentUser.id : 'guest';

  // --- STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  
  // Local Storage Hooks (Apenas para fallback ou configurações locais)
  const [localTransactions, setLocalTransactions] = useLocalStorage<Transaction[]>(`transactions_${userKey}`, []);
  const [localWatchlist, setLocalWatchlist] = useLocalStorage<string[]>(`watchlist_${userKey}`, []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('appSettings', { currency: 'BRL', language: 'pt-BR' });
  
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [fxRate, setFxRate] = useState(5.25); 
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isPremiumUser = currentUser ? checkIsPremium(currentUser) : false;

  // --- SYNC LOGIC (SUPABASE VS LOCAL) ---
  
  // Carregar Dados Iniciais
  useEffect(() => {
      const loadData = async () => {
          if (isSupabaseConfigured && currentUser) {
              // Fetch Transactions from Supabase
              const { data: txData } = await supabase
                  .from('transactions')
                  .select('*')
                  .eq('user_id', currentUser.id);
              
              if (txData) {
                  const mappedTx: Transaction[] = txData.map(t => ({
                      id: t.id,
                      ticker: t.ticker,
                      quantity: Number(t.quantity),
                      price: Number(t.price),
                      totalCost: Number(t.total_cost),
                      dateTime: t.date_time
                  }));
                  setTransactions(mappedTx);
              }

              // Fetch Watchlist from Supabase
              const { data: wlData } = await supabase
                  .from('watchlist')
                  .select('ticker')
                  .eq('user_id', currentUser.id);
              
              if (wlData) {
                  setWatchlist(wlData.map(w => w.ticker));
              }
          } else {
              // Use Local Storage
              setTransactions(localTransactions);
              setWatchlist(localWatchlist);
          }
      };
      loadData();
  }, [currentUser, localTransactions, localWatchlist]); 

  // --- HELPERS DE DADOS ---

  const allTickers = useMemo(() => {
    const portfolioTickers = transactions.map(t => t.ticker);
    return Array.from(new Set([...portfolioTickers, ...watchlist]));
  }, [transactions, watchlist]);

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
            fetchedAssets.forEach(asset => { if(asset) newAssets[asset.ticker] = asset; });
            setAssets(newAssets);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchInitialData();
  }, [allTickers]);

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
          console.error(error);
      } finally {
          setIsRefreshing(false);
      }
  }, [allTickers]);

  useEffect(() => {
    refresh(); 
    const intervalId = setInterval(() => refresh(), 30000); 
    return () => clearInterval(intervalId);
  }, [refresh]);

  // --- SUBSCRIPTION LOGIC ---
  const uniqueAssets = useMemo(() => Array.from(new Set(transactions.map(t => t.ticker))), [transactions]);
  const { validTickers, lockedTickers } = useMemo(() => {
      if (isPremiumUser) return { validTickers: uniqueAssets, lockedTickers: [] };
      return { validTickers: uniqueAssets.slice(0, 6), lockedTickers: uniqueAssets.slice(6) };
  }, [uniqueAssets, isPremiumUser]);
  const canAddAsset = isPremiumUser || uniqueAssets.length < 6;

  // --- ACTIONS (CRUD) ---

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const cleanTicker = transaction.ticker.toUpperCase().trim();
    
    if (!isPremiumUser && !validTickers.includes(cleanTicker) && uniqueAssets.length >= 6) {
        return;
    }

    if (isSupabaseConfigured && currentUser) {
        // OPTIMISTIC UPDATE: Add to UI immediately
        const tempId = 'temp_' + Date.now();
        const optimisticTx: Transaction = {
            ...transaction,
            id: tempId,
            ticker: cleanTicker
        };
        
        setTransactions(prev => [...prev, optimisticTx].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));

        // Background Sync
        try {
            const { data, error } = await supabase.from('transactions').insert({
                user_id: currentUser.id,
                ticker: cleanTicker,
                quantity: transaction.quantity,
                price: transaction.price,
                total_cost: transaction.totalCost,
                date_time: transaction.dateTime
            }).select().single();

            if (data) {
                // Replace temp ID with real ID
                setTransactions(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
            } else {
                // Revert if error (optional, usually we just keep trying or show error)
                console.error("Error adding transaction to DB:", error);
            }
        } catch(e) {
            console.error("Sync error", e);
        }

    } else {
        const newTransaction = { 
            ...transaction, 
            ticker: cleanTicker, 
            id: Date.now().toString(36) + Math.random().toString(36).substring(2)
        };
        setLocalTransactions(prev => [...prev, newTransaction].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
        setTransactions(prev => [...prev, newTransaction]);
    }
  }, [isPremiumUser, validTickers, uniqueAssets, currentUser, setLocalTransactions]);

  const importTransactions = useCallback(async (newTransactions: Omit<Transaction, 'id'>[]) => {
      const toInsert = [];
      const currentUniqueSet = new Set(uniqueAssets);
      let count = currentUniqueSet.size;

      for (const t of newTransactions) {
          const ticker = t.ticker.toUpperCase().trim();
          if (!currentUniqueSet.has(ticker)) {
              if (count >= 6 && !isPremiumUser) continue;
              currentUniqueSet.add(ticker);
              count++;
          }
          toInsert.push({
              user_id: currentUser?.id,
              ticker,
              quantity: t.quantity,
              price: t.price,
              total_cost: t.totalCost,
              date_time: t.dateTime
          });
      }

      if (isSupabaseConfigured && currentUser && toInsert.length > 0) {
          await supabase.from('transactions').insert(toInsert);
          const { data } = await supabase.from('transactions').select('*').eq('user_id', currentUser.id);
          if(data) setTransactions(data.map((t: any) => ({ ...t, totalCost: Number(t.total_cost), quantity: Number(t.quantity), price: Number(t.price), dateTime: t.date_time })));
      } else if (!isSupabaseConfigured) {
          const localMapped = toInsert.map(t => ({ ...t, id: Math.random().toString(), user_id: undefined } as unknown as Transaction));
          setLocalTransactions(prev => [...prev, ...localMapped]);
      }
  }, [uniqueAssets, isPremiumUser, currentUser, setLocalTransactions]);

  const removeTransaction = useCallback(async (id: string) => {
    // Optimistic
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    if (isSupabaseConfigured) {
        await supabase.from('transactions').delete().eq('id', id);
    } else {
        setLocalTransactions(prev => prev.filter(t => t.id !== id));
    }
  }, [setLocalTransactions]);

  const removeHolding = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
    
    // Optimistic
    setTransactions(prev => prev.filter(t => t.ticker !== target));

    if (isSupabaseConfigured) {
        await supabase.from('transactions').delete().eq('ticker', target).eq('user_id', currentUser?.id);
    } else {
        setLocalTransactions(prev => prev.filter(t => t.ticker !== target));
    }
  }, [setLocalTransactions, currentUser]);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
    
    // Optimistic UI Update: Show it immediately
    setWatchlist(prev => Array.from(new Set([...prev, target])));

    if (isSupabaseConfigured && currentUser) {
        try {
            // Background sync
            await supabase.from('watchlist').insert({ user_id: currentUser.id, ticker: target });
        } catch (error) {
            // If duplicate error, ignore. If other error, log it.
            console.log("Sync watchlist items (safe to ignore if duplicate)", error);
        }
    } else {
        setLocalWatchlist(prev => Array.from(new Set([...prev, target])));
    }
  }, [setLocalWatchlist, currentUser]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
    
    // Optimistic
    setWatchlist(prev => prev.filter(t => t !== target));

    if (isSupabaseConfigured && currentUser) {
        await supabase.from('watchlist').delete().eq('ticker', target).eq('user_id', currentUser.id);
    } else {
        setLocalWatchlist(prev => prev.filter(t => t !== target));
    }
  }, [setLocalWatchlist, currentUser]);

  const isAssetInWatchlist = useCallback((ticker: string) => watchlist.includes(ticker.toUpperCase().trim()), [watchlist]);

  const getAssetDetails = useCallback(async (ticker: string) => {
      if (assets[ticker]) return assets[ticker];
      return await financialApi.getAssetDetails(ticker);
  }, [assets]);

  const getLiveQuote = useCallback((ticker: string) => {
      return quotes[ticker];
  }, [quotes]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const formatDisplayValue = useCallback((valueInUSD: number) => {
      const isBRL = settings.currency === 'BRL';
      const finalValue = isBRL ? valueInUSD * fxRate : valueInUSD;
      return new Intl.NumberFormat(settings.language, { style: 'currency', currency: settings.currency }).format(finalValue);
  }, [settings.currency, settings.language, fxRate]);

  const t = useCallback((key: keyof typeof translations['pt-BR']) => {
      return translations[settings.language][key] || key;
  }, [settings.language]);

  // --- CALCULATION LOGIC ---
  const { holdings, totalValue, totalInvested, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent } = useMemo(() => {
    const holdingsMap: any = {};
    for (const t of transactions) {
      if (!holdingsMap[t.ticker]) {
        holdingsMap[t.ticker] = { ticker: t.ticker, totalQuantity: 0, totalInvested: 0, transactions: [] };
      }
      const holding = holdingsMap[t.ticker];
      holding.totalInvested += Number(t.totalCost);
      holding.totalQuantity += Number(t.quantity);
      holding.transactions.push(t);
    }
    
    const holdingsList = Object.values(holdingsMap).map((h: any) => {
      const asset = assets[h.ticker];
      const quote = quotes[h.ticker];
      if (!asset) return null;

      h.averagePrice = h.totalInvested / h.totalQuantity;
      h.currentValue = quote ? (Number(quote.price) * h.totalQuantity) : 0;
      h.totalGainLoss = h.currentValue - h.totalInvested;
      h.totalGainLossPercent = h.totalInvested > 0 ? (h.totalGainLoss / h.totalInvested) * 100 : 0;
      
      let holdingDayChange = 0;
      if (quote) {
          const now = new Date();
          h.transactions.forEach((t: Transaction) => {
             const txDate = new Date(t.dateTime);
             const isToday = txDate.getDate() === now.getDate() && txDate.getMonth() === now.getMonth();
             if (isToday) {
                 holdingDayChange += (quote.price - t.price) * t.quantity;
             } else {
                 const prev = quote.previousClose || quote.price;
                 holdingDayChange += (quote.price - prev) * t.quantity;
             }
          });
      }
      const dayPercent = (h.currentValue - holdingDayChange) > 0 ? (holdingDayChange / (h.currentValue - holdingDayChange)) * 100 : 0;

      return { ...h, asset, quote: quote || null, dayChange: holdingDayChange, dayChangePercent: dayPercent };
    }).filter((h: any) => h !== null);

    let totalValueUSD = 0, totalInvestedUSD = 0, dayChangeUSD = 0;
    
    const finalHoldings = holdingsList.map((h: any) => {
        const isBRL = h.asset.country === 'Brazil';
        const rate = isBRL && fxRate > 0 ? (1/fxRate) : 1;
        
        const isLocked = !validTickers.includes(h.asset.ticker);
        
        const cvUSD = h.currentValue * rate;
        const tiUSD = h.totalInvested * rate;
        const dcUSD = h.dayChange * rate;

        if (!isLocked) {
            totalValueUSD += cvUSD;
            totalInvestedUSD += tiUSD;
            dayChangeUSD += dcUSD;
        }

        return {
            ...h,
            currentValueUSD: cvUSD,
            totalInvestedUSD: tiUSD,
            totalGainLossUSD: cvUSD - tiUSD,
            isLocked
        };
    }).sort((a: any, b: any) => b.currentValueUSD - a.currentValueUSD);

    const tglUSD = totalValueUSD - totalInvestedUSD;
    const tglpUSD = totalInvestedUSD > 0 ? (tglUSD / totalInvestedUSD) * 100 : 0;
    const dcpUSD = (totalValueUSD - dayChangeUSD) > 0 ? (dayChangeUSD / (totalValueUSD - dayChangeUSD)) * 100 : 0;

    return {
        holdings: finalHoldings,
        totalValue: totalValueUSD,
        totalInvested: totalInvestedUSD,
        totalGainLoss: tglUSD,
        totalGainLossPercent: tglpUSD,
        dayChange: dayChangeUSD,
        dayChangePercent: dcpUSD
    };

  }, [transactions, quotes, assets, fxRate, validTickers]);

  const value = {
    holdings, transactions, watchlist, totalValue, totalInvested, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent,
    addTransaction, importTransactions, removeTransaction, removeHolding, addToWatchlist, removeFromWatchlist, isAssetInWatchlist,
    getAssetDetails, getLiveQuote, isLoading, isRefreshing, refresh, fxRate, lastUpdated, settings, updateSettings, formatDisplayValue, t,
    isPremium: isPremiumUser, canAddAsset
  };

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within a PortfolioProvider');
  return context;
};
