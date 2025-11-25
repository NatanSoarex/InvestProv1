
import { Asset, Quote, AssetClass, HistoricalDataPoint, Transaction, MarketState } from '../types';

// ============================================================================
// PROVEST FINANCIAL ENGINE 7.1 (CHART FALLBACK & ACCURACY)
// ============================================================================

// --- Endpoints ---
const YAHOO_QUOTE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_API = 'https://query2.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const BRAPI_BASE_URL = 'https://brapi.dev/api'; 
const BINANCE_API = 'https://api.binance.com/api/v3';
const COINBASE_API = 'https://api.coinbase.com/v2';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const STOOQ_BASE_URL = 'https://stooq.com/q/l';
const AWESOMEAPI_BASE = 'https://economia.awesomeapi.com.br/json';

// --- Resilience Proxies ---
const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, 
    (url: string) => url 
];

// --- Cache Configuration ---
const CACHE_TTL = {
    QUOTE: 15 * 1000,       // 15s for quotes (More frequent)
    HISTORY: 5 * 60 * 1000, // 5m for history
    ASSET: 24 * 60 * 60 * 1000 
};

const cache = {
    quotes: {} as Record<string, { data: Quote, timestamp: number }>,
    history: {} as Record<string, { data: HistoricalDataPoint[], timestamp: number }>,
    assets: {} as Record<string, Asset>,
};

// --- MASSIVE LOGO MAP (ICONS FIX) ---
const LOGO_MAP: Record<string, string> = {
    // Crypto (Top 20)
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    'USDC': 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    'ADA': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
    'TRX': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
    'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
    'DOT': 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
    'LTC': 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
    'SHIB': 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    'BCH': 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png',
    
    // Stocks BR (Blue Chips & Populares)
    'PETR4': 'https://s3-symbol-logo.tradingview.com/petrobras--big.svg',
    'VALE3': 'https://s3-symbol-logo.tradingview.com/vale--big.svg',
    'ITUB4': 'https://s3-symbol-logo.tradingview.com/itau-unibanco--big.svg',
    'BBDC4': 'https://s3-symbol-logo.tradingview.com/bradesco--big.svg',
    'BBAS3': 'https://s3-symbol-logo.tradingview.com/banco-do-brasil--big.svg',
    'WEGE3': 'https://s3-symbol-logo.tradingview.com/weg--big.svg',
    'MGLU3': 'https://s3-symbol-logo.tradingview.com/magaz-luiza--big.svg',
    'NU': 'https://s3-symbol-logo.tradingview.com/nubank--big.svg',
    'ELET3': 'https://s3-symbol-logo.tradingview.com/eletrobras--big.svg',
    'PRIO3': 'https://s3-symbol-logo.tradingview.com/petrorio--big.svg',
    'ABEV3': 'https://s3-symbol-logo.tradingview.com/ambev--big.svg',
    'RENT3': 'https://s3-symbol-logo.tradingview.com/localiza--big.svg',
    'ALOS3': 'https://s3-symbol-logo.tradingview.com/aliansce-sonae--big.svg',
    
    // FIIs & ETFs BR
    'MXRF11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'HGLG11': 'https://s3-symbol-logo.tradingview.com/credit-suisse--big.svg',
    'KNCR11': 'https://s3-symbol-logo.tradingview.com/kinea--big.svg',
    'IVVB11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'BOVA11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'SMAL11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'HASH11': 'https://hashdex.com/images/logo-hashdex.svg',

    // US Stocks & ETFs (Global)
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'GOOG': 'https://logo.clearbit.com/abc.xyz',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'VOO': 'https://logo.clearbit.com/vanguard.com',
    'QQQ': 'https://logo.clearbit.com/invesco.com',
    'SPY': 'https://logo.clearbit.com/ssga.com',
    'VT': 'https://logo.clearbit.com/vanguard.com',
    'SMH': 'https://logo.clearbit.com/vaneck.com',
    'VGT': 'https://logo.clearbit.com/vanguard.com',
    'SCHD': 'https://logo.clearbit.com/schwab.com'
};

// --- Pre-defined Top Assets for Search Optimization ---
export const TOP_ASSETS_FALLBACK = [
    // --- CRIPTOMOEDAS ---
    { t: 'BTC', n: 'Bitcoin', c: AssetClass.CRYPTO },
    { t: 'ETH', n: 'Ethereum', c: AssetClass.CRYPTO },
    { t: 'SOL', n: 'Solana', c: AssetClass.CRYPTO },
    { t: 'BNB', n: 'Binance Coin', c: AssetClass.CRYPTO },
    { t: 'USDT', n: 'Tether USD', c: AssetClass.CRYPTO },
    { t: 'XRP', n: 'XRP', c: AssetClass.CRYPTO },
    { t: 'DOGE', n: 'Dogecoin', c: AssetClass.CRYPTO },
    { t: 'ADA', n: 'Cardano', c: AssetClass.CRYPTO },
    { t: 'AVAX', n: 'Avalanche', c: AssetClass.CRYPTO },
    { t: 'SHIB', n: 'Shiba Inu', c: AssetClass.CRYPTO },

    // --- AÇÕES BRASIL ---
    { t: 'PETR4', n: 'Petrobras PN', c: AssetClass.STOCK },
    { t: 'VALE3', n: 'Vale ON', c: AssetClass.STOCK },
    { t: 'ITUB4', n: 'Itaú Unibanco PN', c: AssetClass.STOCK },
    { t: 'BBDC4', n: 'Bradesco PN', c: AssetClass.STOCK },
    { t: 'BBAS3', n: 'Banco do Brasil ON', c: AssetClass.STOCK },
    { t: 'WEGE3', n: 'WEG ON', c: AssetClass.STOCK },
    { t: 'NU', n: 'Nubank', c: AssetClass.STOCK },
    { t: 'ALOS3', n: 'Allos', c: AssetClass.STOCK },
    
    // --- FIIs / ETFs ---
    { t: 'MXRF11', n: 'Maxi Renda FII', c: AssetClass.FUND },
    { t: 'HGLG11', n: 'CGHG Logística FII', c: AssetClass.FUND },
    { t: 'IVVB11', n: 'iShares S&P 500', c: AssetClass.ETF },
    { t: 'BOVA11', n: 'iShares Ibovespa', c: AssetClass.ETF },
    { t: 'SMAL11', n: 'iShares Small Cap', c: AssetClass.ETF },
    { t: 'HASH11', n: 'Hashdex Crypto', c: AssetClass.ETF },

    // --- USA ---
    { t: 'AAPL', n: 'Apple Inc.', c: AssetClass.STOCK },
    { t: 'MSFT', n: 'Microsoft Corp.', c: AssetClass.STOCK },
    { t: 'NVDA', n: 'NVIDIA Corp.', c: AssetClass.STOCK },
    { t: 'TSLA', n: 'Tesla Inc.', c: AssetClass.STOCK },
    { t: 'VOO', n: 'Vanguard S&P 500', c: AssetClass.ETF },
    { t: 'QQQ', n: 'Invesco QQQ', c: AssetClass.ETF },
    { t: 'VT', n: 'Vanguard Total World', c: AssetClass.ETF },
    { t: 'SMH', n: 'VanEck Semiconductor', c: AssetClass.ETF },
    { t: 'VGT', n: 'Vanguard Info Tech', c: AssetClass.ETF },
    { t: 'SCHD', n: 'Schwab US Dividend', c: AssetClass.ETF }
];

// --- Helper: Robust Fetcher ---
const smartFetch = async (url: string, useProxy = true, timeoutMs = 5000, isCsv = false) => {
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
            if (isCsv) return await response.text();
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

// --- Helper: CSV Parser for Stooq ---
const parseStooqCsv = (csvText: string): Quote | null => {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return null;
        const data = lines[1].split(',');
        if (data.length < 7) return null;

        const price = parseFloat(data[6]); 
        const open = parseFloat(data[3]);
        
        if (isNaN(price) || price === 0) return null;

        const change = price - open;
        const changePercent = (change / open) * 100;

        return {
            price: price,
            change: change,
            changePercent: changePercent,
            previousClose: open, 
            marketState: MarketState.REGULAR
        };
    } catch (e) { return null; }
};

// --- Helper: Logo Resolution ---
const resolveLogo = (ticker: string, name: string): string => {
    const t = ticker.toUpperCase().replace('.SA', '').replace('-USD', '').trim();
    if (LOGO_MAP[t]) return LOGO_MAP[t];
    
    // Heuristic fallback
    let domain = '';
    if (ticker.includes('.SA')) domain = `${t.toLowerCase()}.com.br`;
    else domain = `${t.toLowerCase()}.com`;
    
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

// --- Helper: Ticker Normalizer ---
const normalizeTicker = (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    const cryptoMatch = TOP_ASSETS_FALLBACK.find(a => a.t === t && a.c === AssetClass.CRYPTO);
    if (cryptoMatch) return { symbol: t, type: 'CRYPTO' };
    
    // Detect common crypto formats
    if (['BTC','ETH','SOL','BNB','XRP','USDT','USDC','DOGE','ADA','AVAX'].includes(t)) return { symbol: t, type: 'CRYPTO' };
    if (t.endsWith('-USD')) return { symbol: t.replace('-USD', ''), type: 'CRYPTO' };
    
    const brRegex = /^[A-Z]{4}(3|4|5|6|11)$/;
    if (t.endsWith('.SA')) return { symbol: t, type: 'BR' };
    if (brRegex.test(t)) return { symbol: `${t}.SA`, type: 'BR' };
    
    return { symbol: t, type: 'GLOBAL' };
};

// --- Helper: Crypto Mapper ---
const getCryptoMapping = (ticker: string) => {
    const t = ticker.replace('-USD', '').toUpperCase();
    const binanceSymbol = ['USDT', 'USDC', 'DAI'].includes(t) ? `${t}USDC` : `${t}USDT`;
    const coinbasePair = `${t}-USD`;
    const idMap: Record<string, string> = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin',
        'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin', 'AVAX': 'avalanche-2',
        'DOT': 'polkadot', 'MATIC': 'matic-network', 'LTC': 'litecoin', 'SHIB': 'shiba-inu'
    };
    const coinId = idMap[t] || t.toLowerCase();
    return { binanceSymbol, coinbasePair, coinId };
};

// ============================================================================
// PROVIDERS
// ============================================================================

const providers = {
    binance: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${BINANCE_API}/ticker/24hr?symbol=${binanceSymbol}`, false, 1500);
            if (data && data.lastPrice) {
                const price = parseFloat(data.lastPrice);
                const change = parseFloat(data.priceChange);
                const prevClose = parseFloat(data.prevClosePrice);
                
                return {
                    price: price || 0,
                    change: change || 0,
                    changePercent: parseFloat(data.priceChangePercent) || 0,
                    previousClose: prevClose || price,
                    marketState: MarketState.OPEN
                };
            }
        } catch (e) {}
        return null;
    },
    coinbase: async (ticker: string): Promise<Quote | null> => {
        const { coinbasePair } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${COINBASE_API}/prices/${coinbasePair}/spot`, false, 2000);
            if (data?.data?.amount) {
                const price = parseFloat(data.data.amount);
                return {
                    price: price,
                    change: 0, 
                    changePercent: 0,
                    previousClose: price, 
                    marketState: MarketState.OPEN
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
                const r = data[coinId];
                const price = r.usd;
                const changePerc = r.usd_24h_change;
                const change = price * (changePerc / 100);
                return {
                    price: price || 0,
                    change: change || 0,
                    changePercent: changePerc || 0,
                    previousClose: price - change,
                    marketState: MarketState.OPEN
                };
            }
        } catch (e) {}
        return null;
    },
    brapi: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${BRAPI_BASE_URL}/quote/${ticker}`, false, 3000);
            if (data?.results?.[0]) {
                const r = data.results[0];
                const price = r.regularMarketPrice || 0;
                const prevClose = r.regularMarketPreviousClose || price;
                
                let change = r.regularMarketChange;
                let changePercent = r.regularMarketChangePercent;

                // Force Math if API returns 0
                if (price > 0 && prevClose > 0 && (change === 0 || change === null)) {
                     const diff = price - prevClose;
                     if (Math.abs(diff) > 0.000001) {
                         change = diff;
                         changePercent = (diff / prevClose) * 100;
                     }
                }

                return {
                    price: price,
                    change: change || 0,
                    changePercent: changePercent || 0,
                    previousClose: prevClose,
                    marketState: MarketState.REGULAR
                };
            }
        } catch (e) {}
        return null;
    },
    yahoo: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${YAHOO_QUOTE_API}?symbols=${ticker}`, true, 4000);
            if (data?.quoteResponse?.result?.[0]) {
                const q = data.quoteResponse.result[0];
                const price = q.regularMarketPrice || 0;
                const prevClose = q.regularMarketPreviousClose || price;
                
                let state = MarketState.REGULAR;
                if (q.marketState === 'PRE') state = MarketState.PRE;
                if (q.marketState === 'POST') state = MarketState.POST;
                if (q.marketState === 'CLOSED') state = MarketState.CLOSED;

                let finalPrice = price;
                if (state === MarketState.PRE && q.preMarketPrice) finalPrice = q.preMarketPrice;
                if (state === MarketState.POST && q.postMarketPrice) finalPrice = q.postMarketPrice;

                let change = q.regularMarketChange;
                let changePercent = q.regularMarketChangePercent;

                // Aggressive Calculation Check
                if (finalPrice > 0 && prevClose > 0 && (change === 0 || change === null)) {
                     const diff = finalPrice - prevClose;
                     if (Math.abs(diff) > 0.000001) {
                         change = diff;
                         changePercent = (diff / prevClose) * 100;
                     }
                }

                return {
                    price: finalPrice,
                    change: change || 0,
                    changePercent: changePercent || 0,
                    previousClose: prevClose,
                    marketState: state
                };
            }
        } catch (e) {}
        return null;
    },
    chartFallback: async (ticker: string): Promise<Quote | null> => {
        // LAST RESORT: Get price from Chart API if Quote API fails
        try {
            const url = `${YAHOO_CHART_API}/${ticker}?interval=1d&range=1d`;
            const data = await smartFetch(url, true, 4000);
            const result = data?.chart?.result?.[0];
            
            if (result?.meta?.regularMarketPrice) {
                const price = result.meta.regularMarketPrice;
                const prevClose = result.meta.previousClose || price;
                const change = price - prevClose;
                const changePercent = (change / prevClose) * 100;
                
                return {
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    previousClose: prevClose,
                    marketState: MarketState.REGULAR
                };
            }
        } catch(e) {}
        return null;
    },
    stooq: async (ticker: string): Promise<Quote | null> => {
        try {
            const url = `${STOOQ_BASE_URL}/?s=${ticker.toLowerCase()}&f=sd2t2ohlcv&h&e=csv`;
            const csvData = await smartFetch(url, true, 3000, true);
            if (typeof csvData === 'string') {
                return parseStooqCsv(csvData);
            }
        } catch(e) {}
        return null;
    }
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const financialApi = {

    searchAssets: async (query: string): Promise<Asset[]> => {
        if (query.length < 2) return [];
        const qLower = query.toLowerCase();
        
        // 1. Local Matches (Instant)
        const localResults = TOP_ASSETS_FALLBACK.filter(i => 
            i.t.toLowerCase().includes(qLower) || 
            i.n.toLowerCase().includes(qLower)
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

        if (localResults.length >= 5) return localResults.slice(0, 10);

        // 2. Remote Search
        try {
            const url = `${YAHOO_SEARCH_URL}?q=${query}&quotesCount=10&newsCount=0`;
            const data = await smartFetch(url, true, 2000); 
            
            const yahooMatches = (data?.quotes || [])
                .filter((q: any) => q.quoteType !== 'OPTION')
                .map((q: any) => {
                    let assetClass = AssetClass.STOCK;
                    if (q.quoteType === 'ETF') assetClass = AssetClass.ETF;
                    if (q.quoteType === 'CRYPTOCURRENCY') assetClass = AssetClass.CRYPTO;
                    let ticker = q.symbol;
                    return {
                        ticker: ticker,
                        name: q.shortname || q.longname || q.symbol,
                        logo: resolveLogo(ticker, q.shortname || ticker),
                        country: ticker.endsWith('.SA') ? 'Brazil' : 'USA',
                        assetClass: assetClass,
                        sector: 'General', industry: 'General',
                        marketCap: 0, volume: 0, peRatio: 0, pbRatio: 0, dividendYield: 0, beta: 0
                    };
                });

            // Merge and Deduplicate
            const map = new Map();
            localResults.forEach(item => map.set(item.ticker, item));
            yahooMatches.forEach((item: Asset) => {
                if (!map.has(item.ticker)) map.set(item.ticker, item);
            });

            return Array.from(map.values());

        } catch (e) {
            return localResults;
        }
    },

    getAssetDetails: async (ticker: string): Promise<Asset | undefined> => {
        if (cache.assets[ticker]) return cache.assets[ticker];
        
        const { symbol, type } = normalizeTicker(ticker);
        const fallbackData = TOP_ASSETS_FALLBACK.find(a => 
            normalizeTicker(a.t).symbol === symbol || a.t === ticker
        );

        const basicAsset: Asset = {
            ticker: symbol,
            name: fallbackData ? fallbackData.n : symbol,
            logo: resolveLogo(symbol, fallbackData ? fallbackData.n : symbol),
            country: type === 'BR' ? 'Brazil' : (type === 'CRYPTO' ? 'Global' : 'USA'),
            assetClass: fallbackData ? fallbackData.c : (type === 'CRYPTO' ? AssetClass.CRYPTO : AssetClass.STOCK),
            sector: '-', industry: '-', marketCap: 0, volume: 0, peRatio: 0, pbRatio: 0, dividendYield: 0, beta: 0
        };

        cache.assets[symbol] = basicAsset; 
        return basicAsset;
    },

    getQuotes: async (tickers: string[]): Promise<Record<string, Quote>> => {
        const result: Record<string, Quote> = {};
        const now = Date.now();
        const toFetch: string[] = [];

        tickers.forEach(t => {
            const { symbol } = normalizeTicker(t);
            if (cache.quotes[symbol] && (now - cache.quotes[symbol].timestamp < CACHE_TTL.QUOTE)) {
                result[t] = cache.quotes[symbol].data;
                if (t !== symbol) result[symbol] = cache.quotes[symbol].data; 
            } else {
                toFetch.push(t);
            }
        });

        if (toFetch.length === 0) return result;

        await Promise.all(toFetch.map(async (rawTicker) => {
            let quote: Quote | null = null;
            const { symbol, type } = normalizeTicker(rawTicker);

            // PRIORITY CHAIN
            if (type === 'CRYPTO') {
                quote = await providers.binance(symbol);
                if (!quote) quote = await providers.coingecko(symbol); 
                if (!quote) quote = await providers.yahoo(`${symbol}-USD`); 
                if (!quote) quote = await providers.coinbase(symbol);
            } else if (type === 'BR') {
                quote = await providers.brapi(symbol);
                if (!quote) quote = await providers.yahoo(symbol);
            } else {
                // USA / GLOBAL
                quote = await providers.yahoo(symbol);
                if (!quote) quote = await providers.stooq(symbol);
            }

            // Ultimate Fallback: Yahoo Chart API if Quote API returns 0 or fails
            // This ensures graph and portfolio balance are in sync
            if (!quote || quote.price === 0) {
                const chartQuote = await providers.chartFallback(symbol);
                if (chartQuote && chartQuote.price > 0) {
                    quote = chartQuote;
                }
            }

            if (quote) {
                // SANITIZE OUTPUT TO PREVENT CRASH
                quote.price = Number(quote.price) || 0;
                quote.change = Number(quote.change) || 0;
                quote.changePercent = Number(quote.changePercent) || 0;
                quote.previousClose = Number(quote.previousClose) || 0;

                cache.quotes[symbol] = { data: quote, timestamp: now };
                result[rawTicker] = quote; 
                result[symbol] = quote;    
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

    getHistoricalPriceAtTime: async (ticker: string, dateTime: string): Promise<{price: number} | null> => {
        const { symbol, type } = normalizeTicker(ticker);
        
        // Use +/- 24h window to find closing price around that time
        const ts = Math.floor(new Date(dateTime).getTime() / 1000);
        const p1 = ts - 86400; 
        const p2 = ts + 86400;
        
        try {
            const url = `${YAHOO_CHART_API}/${type === 'CRYPTO' ? symbol + '-USD' : symbol}?period1=${p1}&period2=${p2}&interval=60m`;
            const data = await smartFetch(url, true);
            const result = data?.chart?.result?.[0];
            
            if (result?.timestamp && result?.indicators?.quote?.[0]?.close) {
                // Find the closest candle to the target timestamp
                const timestamps = result.timestamp;
                const prices = result.indicators.quote[0].close;
                
                let closestIdx = 0;
                let minDiff = Infinity;
                
                for(let i=0; i<timestamps.length; i++) {
                    const diff = Math.abs(timestamps[i] - ts);
                    if(diff < minDiff && prices[i] !== null) {
                        minDiff = diff;
                        closestIdx = i;
                    }
                }
                
                if(prices[closestIdx]) {
                    return { price: prices[closestIdx] };
                }
            }
        } catch (e) {}
        
        return null;
    },

    getPortfolioPriceHistory: async (
        transactions: Transaction[], 
        fxRate: number, 
        range: '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | 'ALL',
        currentQuotes?: Record<string, Quote>
    ): Promise<HistoricalDataPoint[]> => {
        if (transactions.length === 0) return [];

        // 1. Define Time Range
        const now = new Date();
        let startTime = new Date();
        let interval = '1d';
        
        if (range === '1D') {
            startTime.setHours(0, 0, 0, 0); 
            interval = '5m';
        } else if (range === '5D') {
            startTime.setDate(now.getDate() - 5);
            interval = '60m';
        } else if (range === '1M') {
            startTime.setMonth(now.getMonth() - 1);
            interval = '90m';
        } else if (range === '6M') {
            startTime.setMonth(now.getMonth() - 6);
            interval = '1d';
        } else if (range === '1Y' || range === 'YTD') {
            startTime.setFullYear(now.getFullYear() - 1);
            interval = '1d';
        } else {
            startTime.setFullYear(now.getFullYear() - 5);
            interval = '1wk';
        }

        const period1 = Math.floor(startTime.getTime() / 1000);
        const period2 = Math.floor(now.getTime() / 1000);

        // 2. Fetch History for ALL assets
        const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
        const assetHistoryMap: Record<string, { timestamp: number[], close: number[] }> = {};

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

        // 3. Build Master Timeline (Union of all timestamps)
        let allTimestamps: number[] = [];
        Object.values(assetHistoryMap).forEach(h => allTimestamps.push(...h.timestamp));
        allTimestamps = Array.from(new Set(allTimestamps)).sort((a, b) => a - b);

        // Fallback if API fails
        if (allTimestamps.length === 0) {
            allTimestamps = [period1, period2];
        }

        // 4. Calculate Portfolio Value at each Point (TRUE TIME TRAVEL)
        const resultData: HistoricalDataPoint[] = [];
        const lastKnownPrices: Record<string, number> = {};

        // Pre-sort transactions by date
        const sortedTx = [...transactions].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

        allTimestamps.forEach(ts => {
            const currentDate = new Date(ts * 1000);
            
            // A. Calculate Invested Amount & Active Holdings at this timestamp
            let investedInUSD = 0;
            const currentHoldings: Record<string, number> = {};

            for (const t of sortedTx) {
                const txDate = new Date(t.dateTime);
                if (txDate.getTime() <= currentDate.getTime()) {
                    // Transaction happened BEFORE this point in graph
                    currentHoldings[t.ticker] = (currentHoldings[t.ticker] || 0) + t.quantity;
                    
                    const { type } = normalizeTicker(t.ticker);
                    let cost = t.totalCost;
                    if (type === 'BR' && fxRate > 0) cost = cost / fxRate;
                    investedInUSD += cost;
                }
            }

            // B. Calculate Market Value
            let portfolioValue = 0;

            Object.keys(currentHoldings).forEach(ticker => {
                const history = assetHistoryMap[ticker];
                let price = 0;

                if (history) {
                    // Find closest price in history
                    // Binary search or simple find for now (optimization: maintain index)
                    const idx = history.timestamp.findIndex(t => t >= ts);
                    
                    if (idx !== -1 && Math.abs(history.timestamp[idx] - ts) < 7200) { // 2h window
                         price = history.close[idx];
                         if (price) lastKnownPrices[ticker] = price;
                    } else if (lastKnownPrices[ticker]) {
                        price = lastKnownPrices[ticker]; // Forward fill
                    } else if (history.close.length > 0) {
                        price = history.close[0]; // Initial fill
                    }
                }
                
                // Fallback to current live quote if history ends or fails
                if (!price && currentQuotes && currentQuotes[ticker]) {
                    price = currentQuotes[ticker].price;
                }

                if (price) {
                    const qty = currentHoldings[ticker];
                    const { type } = normalizeTicker(ticker);
                    
                    let valueInUSD = price * qty;
                    if (type === 'BR' && fxRate > 0) valueInUSD = valueInUSD / fxRate;
                    
                    portfolioValue += valueInUSD;
                }
            });

            // Only push point if we had investment OR value
            if (investedInUSD > 0 || portfolioValue > 0) {
                resultData.push({
                    date: currentDate.toISOString(),
                    price: portfolioValue,
                    invested: investedInUSD
                });
            }
        });

        // Stitch Last Point (Live)
        resultData.push({
            date: new Date().toISOString(),
            price: resultData.length > 0 ? resultData[resultData.length-1].price : 0, // Will be updated by dashboard
            invested: resultData.length > 0 ? resultData[resultData.length-1].invested : 0
        });

        return resultData;
    }
};
