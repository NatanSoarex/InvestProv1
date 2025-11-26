
import { Asset, Quote, AssetClass, HistoricalDataPoint, Transaction, MarketState } from '../types';

// ============================================================================
// PROVEST FINANCIAL ENGINE 13.0 (HIGH VOLATILITY CHART)
// ============================================================================

// --- Endpoints ---
const YAHOO_QUOTE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_API = 'https://query2.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const BRAPI_BASE_URL = 'https://brapi.dev/api'; 
const BINANCE_API = 'https://api.binance.com/api/v3';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const AWESOMEAPI_BASE = 'https://economia.awesomeapi.com.br/json';
const COINCAP_API = 'https://api.coincap.io/v2/assets';
const KUCOIN_API = 'https://api.kucoin.com/api/v1/market/stats';

// --- Resilience Proxies ---
const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, 
    (url: string) => url 
];

// --- Cache Configuration ---
const CACHE_TTL = {
    QUOTE: 10 * 1000,       
    HISTORY: 2 * 60 * 1000, 
    ASSET: 24 * 60 * 60 * 1000 
};

const cache = {
    quotes: {} as Record<string, { data: Quote, timestamp: number }>,
    assets: {} as Record<string, Asset>,
};

// --- MASSIVE LOGO MAP ---
const LOGO_MAP: Record<string, string> = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    'PETR4': 'https://s3-symbol-logo.tradingview.com/petrobras--big.svg',
    'VALE3': 'https://s3-symbol-logo.tradingview.com/vale--big.svg',
    'ITUB4': 'https://s3-symbol-logo.tradingview.com/itau-unibanco--big.svg',
    'MXRF11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'HGLG11': 'https://s3-symbol-logo.tradingview.com/credit-suisse--big.svg',
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'VOO': 'https://logo.clearbit.com/vanguard.com',
    'QQQ': 'https://logo.clearbit.com/invesco.com',
    'IVVB11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'BOVA11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'SMAL11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'ALOS3': 'https://s3-symbol-logo.tradingview.com/aliansce-sonae--big.svg'
};

export const TOP_ASSETS_FALLBACK = [
    { t: 'BTC', n: 'Bitcoin', c: AssetClass.CRYPTO }, { t: 'ETH', n: 'Ethereum', c: AssetClass.CRYPTO },
    { t: 'PETR4', n: 'Petrobras PN', c: AssetClass.STOCK }, { t: 'VALE3', n: 'Vale ON', c: AssetClass.STOCK },
    { t: 'MXRF11', n: 'Maxi Renda', c: AssetClass.FUND }, { t: 'HGLG11', n: 'CGHG Logística', c: AssetClass.FUND },
    { t: 'AAPL', n: 'Apple', c: AssetClass.STOCK }, { t: 'NVDA', n: 'NVIDIA', c: AssetClass.STOCK },
    { t: 'VOO', n: 'Vanguard S&P 500', c: AssetClass.ETF }, { t: 'IVVB11', n: 'IVVB11', c: AssetClass.ETF }
];

// --- Helpers ---
const smartFetch = async (url: string, useProxy = true, timeoutMs = 2500) => {
    const separator = url.includes('?') ? '&' : '?';
    const bust = `_t=${Date.now()}`; 
    const finalUrl = `${url}${separator}${bust}`;

    const fetchWithTimeout = async (fetchUrl: string) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(fetchUrl, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.json();
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    };

    if (useProxy) {
        for (const proxyGen of PROXIES) {
            try {
                const proxyUrl = proxyGen(finalUrl);
                const target = proxyUrl === finalUrl ? finalUrl : proxyUrl;
                return await fetchWithTimeout(target);
            } catch (e) { /* continue */ }
        }
    } else {
        try {
            return await fetchWithTimeout(finalUrl);
        } catch (e) { throw e; }
    }
    throw new Error(`Failed to fetch ${url}`);
};

const resolveLogo = (ticker: string, name: string): string => {
    const t = ticker.toUpperCase().replace('.SA', '').replace('-USD', '').trim();
    if (LOGO_MAP[t]) return LOGO_MAP[t];
    let domain = ticker.includes('.SA') ? `${t.toLowerCase()}.com.br` : `${t.toLowerCase()}.com`;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

const normalizeTicker = (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    const cryptoMatch = TOP_ASSETS_FALLBACK.find(a => a.t === t && a.c === AssetClass.CRYPTO);
    if (cryptoMatch) return { symbol: t, type: 'CRYPTO' };
    
    if (['BTC','ETH','SOL','BNB','XRP','USDT','USDC'].includes(t)) return { symbol: t, type: 'CRYPTO' };
    
    const brRegex = /^[A-Z]{4}(3|4|5|6|11)$/;
    if (t.endsWith('.SA')) return { symbol: t, type: 'BR' };
    if (brRegex.test(t)) return { symbol: `${t}.SA`, type: 'BR' };
    
    return { symbol: t, type: 'GLOBAL' };
};

const getCryptoMapping = (ticker: string) => {
    const t = ticker.replace('-USD', '').toUpperCase();
    const binanceSymbol = ['USDT', 'USDC'].includes(t) ? `${t}USDC` : `${t}USDT`;
    const coinId = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'USDT': 'tether' }[t] || t.toLowerCase();
    return { binanceSymbol, coinId };
};

const calculateFallbackMetrics = (quote: Quote): Quote => {
    if ((quote.change === 0 || quote.changePercent === 0) && quote.price > 0 && quote.previousClose > 0) {
        const diff = quote.price - quote.previousClose;
        if (Math.abs(diff) > 0.0000001) {
            quote.change = diff;
            quote.changePercent = (diff / quote.previousClose) * 100;
        }
    }
    return quote;
};

// --- Providers ---
const providers = {
    binance: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${BINANCE_API}/ticker/24hr?symbol=${binanceSymbol}`, false, 1500);
            if (data?.lastPrice) {
                const price = parseFloat(data.lastPrice);
                const prev = parseFloat(data.prevClosePrice);
                return calculateFallbackMetrics({
                    price: price,
                    change: parseFloat(data.priceChange),
                    changePercent: parseFloat(data.priceChangePercent),
                    previousClose: prev || price,
                    marketState: MarketState.OPEN
                });
            }
        } catch (e) {}
        return null;
    },
    coincap: async (ticker: string): Promise<Quote | null> => {
        const { coinId } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${COINCAP_API}/${coinId}`, false, 2000);
            if (data?.data) {
                const price = parseFloat(data.data.priceUsd);
                const changePerc = parseFloat(data.data.changePercent24Hr);
                const prev = price / (1 + (changePerc / 100));
                return calculateFallbackMetrics({
                    price,
                    change: price - prev,
                    changePercent: changePerc,
                    previousClose: prev,
                    marketState: MarketState.OPEN
                });
            }
        } catch (e) {}
        return null;
    },
    kucoin: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        const symbol = binanceSymbol.replace('USDT', '-USDT').replace('USDC', '-USDC');
        try {
            const data = await smartFetch(`${KUCOIN_API}?symbol=${symbol}`, false, 2000);
            if (data?.data) {
                const price = parseFloat(data.data.last);
                const change = parseFloat(data.data.changePrice);
                const changePercent = parseFloat(data.data.changeRate) * 100;
                const prevClose = price - change;
                return {
                    price, change, changePercent, previousClose: prevClose, marketState: MarketState.OPEN
                };
            }
        } catch (e) {}
        return null;
    },
    coingecko: async (ticker: string): Promise<Quote | null> => {
        const { coinId } = getCryptoMapping(ticker);
        try {
            const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
            const data = await smartFetch(url, false, 2500);
            if (data && data[coinId]) {
                const price = data[coinId].usd;
                const changePerc = data[coinId].usd_24h_change;
                return calculateFallbackMetrics({
                    price: price,
                    change: price * (changePerc/100),
                    changePercent: changePerc,
                    previousClose: price / (1 + (changePerc/100)),
                    marketState: MarketState.OPEN
                });
            }
        } catch (e) {}
        return null;
    },
    yahoo: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${YAHOO_QUOTE_API}?symbols=${ticker}`, true, 4000);
            const q = data?.quoteResponse?.result?.[0];
            if (q) {
                const price = q.regularMarketPrice || 0;
                const prev = q.regularMarketPreviousClose || price;
                let state = MarketState.REGULAR;
                if (q.marketState === 'PRE') state = MarketState.PRE;
                if (q.marketState === 'POST') state = MarketState.POST;
                if (q.marketState === 'CLOSED') state = MarketState.CLOSED;
                
                let finalPrice = price;
                if (state === MarketState.PRE && q.preMarketPrice) finalPrice = q.preMarketPrice;
                if (state === MarketState.POST && q.postMarketPrice) finalPrice = q.postMarketPrice;

                return calculateFallbackMetrics({
                    price: finalPrice,
                    change: q.regularMarketChange || (finalPrice - prev),
                    changePercent: q.regularMarketChangePercent || 0,
                    previousClose: prev,
                    marketState: state
                });
            }
        } catch (e) {}
        return null;
    },
    brapi: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${BRAPI_BASE_URL}/quote/${ticker}`, false, 3000);
            const r = data?.results?.[0];
            if (r) {
                const price = r.regularMarketPrice || 0;
                const prev = r.regularMarketPreviousClose || price;
                return calculateFallbackMetrics({
                    price: price,
                    change: r.regularMarketChange || (price - prev),
                    changePercent: r.regularMarketChangePercent || 0,
                    previousClose: prev,
                    marketState: MarketState.REGULAR
                });
            }
        } catch (e) {}
        return null;
    },
    chartFallback: async (ticker: string): Promise<Quote | null> => {
        try {
            const url = `${YAHOO_CHART_API}/${ticker}?interval=1d&range=1d`;
            const data = await smartFetch(url, true, 4000);
            const result = data?.chart?.result?.[0]?.meta;
            if (result?.regularMarketPrice) {
                const price = result.regularMarketPrice;
                const prev = result.previousClose || price;
                return calculateFallbackMetrics({
                    price, change: price - prev, changePercent: 0, previousClose: prev, marketState: MarketState.REGULAR
                });
            }
        } catch(e) {}
        return null;
    }
};

// ============================================================================
// EXPORTED API
// ============================================================================

export const financialApi = {
    searchAssets: async (query: string): Promise<Asset[]> => {
        if (query.length < 2) return [];
        const qLower = query.toLowerCase();
        
        const localResults = TOP_ASSETS_FALLBACK.filter(i => 
            i.t.toLowerCase().includes(qLower) || i.n.toLowerCase().includes(qLower)
        ).map(m => {
            const normalized = normalizeTicker(m.t).symbol;
            return {
                ticker: normalized, 
                name: m.n, 
                logo: resolveLogo(normalized, m.n),
                country: normalized.endsWith('.SA') ? 'Brazil' : (m.c === AssetClass.CRYPTO ? 'Global' : 'USA'),
                assetClass: m.c, 
                sector: '', industry: '', marketCap:0, volume:0, peRatio:0, pbRatio:0, dividendYield:0, beta:0
            };
        });

        if (localResults.length >= 3) return localResults;

        try {
            const url = `${YAHOO_SEARCH_URL}?q=${query}&quotesCount=10&newsCount=0`;
            const data = await smartFetch(url, true, 2000); 
            const yahooMatches = (data?.quotes || [])
                .filter((q: any) => q.quoteType !== 'OPTION')
                .map((q: any) => ({
                    ticker: q.symbol,
                    name: q.shortname || q.longname || q.symbol,
                    logo: resolveLogo(q.symbol, q.shortname),
                    country: q.symbol.endsWith('.SA') ? 'Brazil' : 'USA',
                    assetClass: q.quoteType === 'CRYPTOCURRENCY' ? AssetClass.CRYPTO : (q.quoteType === 'ETF' ? AssetClass.ETF : AssetClass.STOCK),
                    sector: '', industry: '', marketCap: 0, volume: 0, peRatio: 0, pbRatio: 0, dividendYield: 0, beta: 0
                }));
            
            return [...localResults, ...yahooMatches].slice(0, 10);
        } catch (e) {
            return localResults;
        }
    },

    getAssetDetails: async (ticker: string): Promise<Asset | undefined> => {
        if (cache.assets[ticker]) return cache.assets[ticker];
        const { symbol, type } = normalizeTicker(ticker);
        const fallback = TOP_ASSETS_FALLBACK.find(a => normalizeTicker(a.t).symbol === symbol);
        
        const asset: Asset = {
            ticker: symbol,
            name: fallback ? fallback.n : symbol,
            logo: resolveLogo(symbol, fallback ? fallback.n : symbol),
            country: type === 'BR' ? 'Brazil' : (type === 'CRYPTO' ? 'Global' : 'USA'),
            assetClass: fallback ? fallback.c : (type === 'CRYPTO' ? AssetClass.CRYPTO : AssetClass.STOCK),
            sector: '-', industry: '-', marketCap: 0, volume: 0, peRatio: 0, pbRatio: 0, dividendYield: 0, beta: 0
        };
        cache.assets[symbol] = asset;
        return asset;
    },

    getQuotes: async (tickers: string[]): Promise<Record<string, Quote>> => {
        const result: Record<string, Quote> = {};
        const now = Date.now();
        const toFetch: string[] = [];

        tickers.forEach(t => {
            if (cache.quotes[t] && (now - cache.quotes[t].timestamp < CACHE_TTL.QUOTE)) {
                result[t] = cache.quotes[t].data;
            } else {
                toFetch.push(t);
            }
        });

        if (toFetch.length === 0) return result;

        await Promise.all(toFetch.map(async (rawTicker) => {
            const { symbol, type } = normalizeTicker(rawTicker);
            let quote: Quote | null = null;

            if (type === 'CRYPTO') {
                const sources = [providers.binance, providers.coincap, providers.kucoin, providers.coingecko, providers.yahoo];
                for (const provider of sources) {
                    const q = await provider(type === 'CRYPTO' && provider === providers.yahoo ? `${symbol}-USD` : symbol);
                    if (q) {
                        if (Math.abs(q.changePercent) > 0.00001) {
                            quote = q; break; 
                        } else if (!quote) {
                            quote = q; 
                        }
                    }
                }
            } else if (type === 'BR') {
                quote = await providers.brapi(symbol) || await providers.yahoo(symbol);
            } else {
                quote = await providers.yahoo(symbol);
            }

            if (!quote || quote.price === 0) {
                quote = await providers.chartFallback(symbol);
            }

            if (quote) {
                if (Math.abs(quote.changePercent) < 0.00001 && quote.price > 0 && quote.previousClose > 0) {
                    const diff = quote.price - quote.previousClose;
                    quote.change = diff;
                    quote.changePercent = (diff / quote.previousClose) * 100;
                }
                cache.quotes[rawTicker] = { data: quote, timestamp: now };
                result[rawTicker] = quote;
            }
        }));

        return result;
    },

    getFxRate: async (from: string, to: string): Promise<number> => {
        try {
            const url = `${AWESOMEAPI_BASE}/last/${from}-${to}`;
            const data = await smartFetch(url, false);
            const key = `${from}${to}`;
            if (data[key]) return parseFloat(data[key].bid);
        } catch (e) {}
        return 5.25; 
    },

    // --- DASHBOARD HISTORY ENGINE (HIGH VOLATILITY MODE) ---
    // Using 5m intervals for 1D to show the jagged 'Up and Down' line
    getPortfolioPriceHistory: async (
        transactions: Transaction[], 
        fxRate: number, 
        range: '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | 'ALL',
        currentQuotes?: Record<string, Quote>
    ): Promise<HistoricalDataPoint[]> => {
        if (transactions.length === 0) return [];

        const now = new Date();
        let startTime = new Date();
        let interval = '1d';
        
        if (range === '1D') {
            startTime.setHours(0, 0, 0, 0); 
            interval = '5m'; // High Granularity for 1D
        } else if (range === '5D') {
            startTime.setDate(now.getDate() - 5);
            interval = '15m';
        } else if (range === '1M') {
            startTime.setMonth(now.getMonth() - 1);
            interval = '60m';
        } else {
            startTime.setFullYear(now.getFullYear() - 1);
            interval = '1d';
        }

        const period1 = Math.floor(startTime.getTime() / 1000);
        const period2 = Math.floor(now.getTime() / 1000);

        const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
        const assetHistoryMap: Record<string, { timestamp: number[], close: number[] }> = {};

        // 1. Fetch History
        await Promise.all(uniqueTickers.map(async (ticker) => {
            const { symbol, type } = normalizeTicker(ticker);
            const apiSymbol = type === 'CRYPTO' ? `${symbol}-USD` : symbol;
            try {
                const url = `${YAHOO_CHART_API}/${apiSymbol}?period1=${period1}&period2=${period2}&interval=${interval}`;
                const data = await smartFetch(url, true);
                const result = data?.chart?.result?.[0];
                if (result?.timestamp && result?.indicators?.quote?.[0]?.close) {
                    assetHistoryMap[ticker] = {
                        timestamp: result.timestamp,
                        close: result.indicators.quote[0].close
                    };
                }
            } catch (e) {}
        }));

        // 2. Snapshot Mode: Apply CURRENT holdings to historical prices
        const currentHoldings: Record<string, number> = {};
        transactions.forEach(tx => {
            currentHoldings[tx.ticker] = (currentHoldings[tx.ticker] || 0) + tx.quantity;
        });

        // 3. Generate Timeline
        let timeline: number[] = [];
        const timestamps = Object.values(assetHistoryMap).flatMap(h => h.timestamp);
        if (timestamps.length > 0) {
            timeline = Array.from(new Set(timestamps)).sort((a, b) => a - b);
        } 
        
        // If we have no data points (e.g. market closed, API empty), generate a synthetic timeline
        if (timeline.length < 5 && range === '1D') {
            const start = Math.floor(startTime.getTime() / 1000);
            const end = Math.floor(now.getTime() / 1000);
            const points = 100; // Generate 100 points for smooth curve
            const step = (end - start) / points; 
            for(let i=0; i<=points; i++) timeline.push(Math.floor(start + (i * step)));
        }

        const resultData: HistoricalDataPoint[] = [];
        const lastKnownPrices: Record<string, number> = {};

        if (currentQuotes) {
            Object.keys(currentQuotes).forEach(k => {
                if (currentQuotes[k]?.price) lastKnownPrices[k] = currentQuotes[k].price;
            });
        }

        timeline.forEach(ts => {
            let portfolioValue = 0;

            Object.keys(currentHoldings).forEach(ticker => {
                const qty = currentHoldings[ticker];
                if (qty <= 0) return;

                let price = 0;
                const history = assetHistoryMap[ticker];
                
                if (history) {
                    // Find closest timestamp
                    const idx = history.timestamp.findIndex(t => Math.abs(t - ts) < 600); // 10 min buffer
                    if (idx !== -1 && history.close[idx]) {
                        price = history.close[idx];
                        lastKnownPrices[ticker] = price;
                    } else {
                        price = lastKnownPrices[ticker] || 0; 
                    }
                } else {
                    price = lastKnownPrices[ticker] || 0;
                }

                if (price > 0) {
                    const { type } = normalizeTicker(ticker);
                    let val = price * qty;
                    if (type === 'BR' && fxRate > 0) val = val / fxRate;
                    portfolioValue += val;
                }
            });

            if (portfolioValue > 0) {
                resultData.push({
                    date: new Date(ts * 1000).toISOString(),
                    price: portfolioValue
                });
            }
        });

        // 4. Force Snap to Current Live Value (The 30s Update Hook)
        if (currentQuotes) {
            let liveValue = 0;
            Object.keys(currentHoldings).forEach(t => {
                if (currentQuotes[t]) {
                    const { type } = normalizeTicker(t);
                    let val = currentQuotes[t].price * currentHoldings[t];
                    if (type === 'BR' && fxRate > 0) val = val / fxRate;
                    liveValue += val;
                }
            });
            
            // Append live value as the absolute final point
            resultData.push({ date: now.toISOString(), price: liveValue });
        }

        return resultData;
    },
    
    getHistoricalPriceAtTime: async (ticker: string, dateTime: string): Promise<{price: number} | null> => {
        const { symbol, type } = normalizeTicker(ticker);
        const ts = Math.floor(new Date(dateTime).getTime() / 1000);
        try {
            const url = `${YAHOO_CHART_API}/${type === 'CRYPTO' ? symbol + '-USD' : symbol}?period1=${ts - 40000}&period2=${ts + 40000}&interval=60m`;
            const data = await smartFetch(url, true);
            const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
            const price = quotes.find((p: any) => p);
            if (price) return { price };
        } catch (e) {}
        return null;
    }
};
