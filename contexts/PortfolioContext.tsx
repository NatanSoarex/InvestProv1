
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
  
  // Local Storage Hooks (Fallback)
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

  // --- SYNC LOGIC: LOAD DATA ON LOGIN ---
  useEffect(() => {
      const loadData = async () => {
          if (isSupabaseConfigured && currentUser) {
              try {
                  // Fetch Transactions
                  const { data: txData, error: txError } = await supabase
                      .from('transactions')
                      .select('*')
                      .eq('user_id', currentUser.id);
                  
                  if (txError) throw txError;

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

                  // Fetch Watchlist
                  const { data: wlData, error: wlError } = await supabase
                      .from('watchlist')
                      .select('ticker')
                      .eq('user_id', currentUser.id);
                  
                  if (wlError) throw wlError;

                  if (wlData) {
                      setWatchlist(wlData.map(w => w.ticker));
                  }
              } catch (err) {
                  console.error("Erro ao carregar dados da nuvem:", err);
                  // Não fallback para local se estiver logado para evitar mistura de dados
              }
          } else {
              // Modo Local
              setTransactions(localTransactions);
              setWatchlist(localWatchlist);
          }
      };
      
      if (currentUser) {
          loadData();
      } else {
          setTransactions([]);
          setWatchlist([]);
      }
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
        // OPTIMISTIC UPDATE
        const tempId = 'temp_' + Date.now();
        const optimisticTx: Transaction = {
            ...transaction,
            id: tempId,
            ticker: cleanTicker
        };
        
        setTransactions(prev => [...prev, optimisticTx].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));

        try {
            // DATABASE INSERT
            const { data, error } = await supabase.from('transactions').insert({
                user_id: currentUser.id, // Ensure user_id is correct
                ticker: cleanTicker,
                quantity: transaction.quantity,
                price: transaction.price,
                total_cost: transaction.totalCost,
                date_time: transaction.dateTime
            }).select().single();

            if (error) throw error;

            if (data) {
                // Update with real ID
                setTransactions(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
            }
        } catch(e) {
            console.error("CRITICAL ERROR: Failed to save transaction to DB", e);
            // Rollback
            setTransactions(prev => prev.filter(t => t.id !== tempId));
            alert("Erro ao salvar transação na nuvem. Verifique sua conexão.");
        }

    } else {
        // Local Fallback
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
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    if (isSupabaseConfigured) {
        await supabase.from('transactions').delete().eq('id', id);
    } else {
        setLocalTransactions(prev => prev.filter(t => t.id !== id));
    }
  }, [setLocalTransactions]);

  const removeHolding = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
    setTransactions(prev => prev.filter(t => t.ticker !== target));

    if (isSupabaseConfigured) {
        await supabase.from('transactions').delete().eq('ticker', target).eq('user_id', currentUser?.id);
    } else {
        setLocalTransactions(prev => prev.filter(t => t.ticker !== target));
    }
  }, [setLocalTransactions, currentUser]);

  const addToWatchlist = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
    setWatchlist(prev => Array.from(new Set([...prev, target])));

    if (isSupabaseConfigured && currentUser) {
        try {
            await supabase.from('watchlist').insert({ user_id: currentUser.id, ticker: target });
        } catch (error) {
            console.log("Watchlist sync error (likely duplicate)", error);
        }
    } else {
        setLocalWatchlist(prev => Array.from(new Set([...prev, target])));
    }
  }, [setLocalWatchlist, currentUser]);

  const removeFromWatchlist = useCallback(async (ticker: string) => {
    const target = ticker.toUpperCase().trim();
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
      if (isNaN(valueInUSD)) return 'R$ 0,00';
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
      // Critical fix: Ensure we use TotalCost for calculation accuracy
      holding.totalInvested += Number(t.totalCost); 
      holding.totalQuantity += Number(t.quantity);
      holding.transactions.push(t);
    }
    
    const holdingsList = Object.values(holdingsMap).map((h: any) => {
      const asset = assets[h.ticker];
      const quote = quotes[h.ticker];
      if (!asset) return null;

      h.averagePrice = h.totalQuantity > 0 ? h.totalInvested / h.totalQuantity : 0;
      h.currentValue = quote ? (Number(quote.price) * h.totalQuantity) : 0;
      // SAFETY: Ensure numbers aren't NaN
      h.currentValue = isNaN(h.currentValue) ? 0 : h.currentValue;
      
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

      return { 
          ...h, 
          asset, 
          quote: quote || null, 
          dayChange: holdingDayChange || 0, 
          dayChangePercent: dayPercent || 0 
      };
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
            totalValueUSD += cvUSD || 0;
            totalInvestedUSD += tiUSD || 0;
            dayChangeUSD += dcUSD || 0;
        }

        return {
            ...h,
            currentValueUSD: cvUSD || 0,
            totalInvestedUSD: tiUSD || 0,
            totalGainLossUSD: (cvUSD - tiUSD) || 0,
            isLocked
        };
    }).sort((a: any, b: any) => b.currentValueUSD - a.currentValueUSD);

    const tglUSD = totalValueUSD - totalInvestedUSD;
    const tglpUSD = totalInvestedUSD > 0 ? (tglUSD / totalInvestedUSD) * 100 : 0;
    const dcpUSD = (totalValueUSD - dayChangeUSD) > 0 ? (dayChangeUSD / (totalValueUSD - dayChangeUSD)) * 100 : 0;

    return {
        holdings: finalHoldings,
        totalValue: totalValueUSD || 0,
        totalInvested: totalInvestedUSD || 0,
        totalGainLoss: tglUSD || 0,
        totalGainLossPercent: tglpUSD || 0,
        dayChange: dayChangeUSD || 0,
        dayChangePercent: dcpUSD || 0
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
