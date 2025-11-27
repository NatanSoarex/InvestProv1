
import { Asset, Quote, AssetClass, HistoricalDataPoint, Transaction, MarketState } from '../types';

const YAHOO_QUOTE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_API = 'https://query2.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const BRAPI_BASE_URL = 'https://brapi.dev/api'; 
const BINANCE_API = 'https://api.binance.com/api/v3';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const AWESOMEAPI_BASE = 'https://economia.awesomeapi.com.br/json';
const COINCAP_API = 'https://api.coincap.io/v2/assets';
const KUCOIN_API = 'https://api.kucoin.com/api/v1/market/stats';
const GATEIO_API = 'https://data.gateapi.io/api2/1/ticker';
const BYBIT_API = 'https://api.bybit.com/v5/market/tickers';
const KRAKEN_API = 'https://api.kraken.com/0/public/Ticker';

const PROXIES = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, 
    (url: string) => url 
];

const CACHE_TTL = {
    QUOTE: 10 * 1000,       
    HISTORY: 2 * 60 * 1000, 
    ASSET: 24 * 60 * 60 * 1000 
};

const cache = {
    quotes: {} as Record<string, { data: Quote, timestamp: number }>,
    assets: {} as Record<string, Asset>,
};

// Expanded Logo Map for High Quality Asset Icons
const LOGO_MAP: Record<string, string> = {
    // Crypto
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    'ADA': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/avalance-1.png',
    'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',

    // Brazilian Stocks (Blue Chips)
    'PETR4': 'https://s3-symbol-logo.tradingview.com/petrobras--big.svg',
    'VALE3': 'https://s3-symbol-logo.tradingview.com/vale--big.svg',
    'ITUB4': 'https://s3-symbol-logo.tradingview.com/itau-unibanco--big.svg',
    'BBDC4': 'https://s3-symbol-logo.tradingview.com/banco-bradesco--big.svg',
    'BBAS3': 'https://s3-symbol-logo.tradingview.com/banco-brasil--big.svg',
    'WEGE3': 'https://s3-symbol-logo.tradingview.com/weg--big.svg',
    'ABEV3': 'https://s3-symbol-logo.tradingview.com/ambev--big.svg',
    'ALOS3': 'https://s3-symbol-logo.tradingview.com/aliansce-sonae--big.svg',
    'RENT3': 'https://s3-symbol-logo.tradingview.com/localiza--big.svg',
    'JBSS3': 'https://s3-symbol-logo.tradingview.com/jbs--big.svg',
    'ELET3': 'https://s3-symbol-logo.tradingview.com/eletrobras--big.svg',
    'NU': 'https://s3-symbol-logo.tradingview.com/nu-holdings--big.svg',
    'ROXO34': 'https://s3-symbol-logo.tradingview.com/nu-holdings--big.svg',

    // Brazilian FIIs & ETFs
    'MXRF11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'HGLG11': 'https://s3-symbol-logo.tradingview.com/credit-suisse--big.svg',
    'KNCR11': 'https://s3-symbol-logo.tradingview.com/kinea--big.svg',
    'XPLG11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'IVVB11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'BOVA11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'SMAL11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'HASH11': 'https://s3-symbol-logo.tradingview.com/hashdex--big.svg',
    'XINA11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',

    // Global Tech
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'GOOGL': 'https://logo.clearbit.com/abc.xyz',
    'GOOG': 'https://logo.clearbit.com/abc.xyz',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'NFLX': 'https://logo.clearbit.com/netflix.com',
    'AMD': 'https://logo.clearbit.com/amd.com',
    'INTC': 'https://logo.clearbit.com/intel.com',

    // Major US ETFs
    'VT': 'https://logo.clearbit.com/vanguard.com',
    'VOO': 'https://logo.clearbit.com/vanguard.com',
    'VTI': 'https://logo.clearbit.com/vanguard.com',
    'VGT': 'https://logo.clearbit.com/vanguard.com',
    'VNQ': 'https://logo.clearbit.com/vanguard.com',
    'BND': 'https://logo.clearbit.com/vanguard.com',
    'VUG': 'https://logo.clearbit.com/vanguard.com',
    'VYM': 'https://logo.clearbit.com/vanguard.com',
    'VWO': 'https://logo.clearbit.com/vanguard.com',
    'VXUS': 'https://logo.clearbit.com/vanguard.com',
    'BNDX': 'https://logo.clearbit.com/vanguard.com',
    'QQQ': 'https://logo.clearbit.com/invesco.com',
    'QQQM': 'https://logo.clearbit.com/invesco.com',
    'SPY': 'https://logo.clearbit.com/ssga.com',
    'DIA': 'https://logo.clearbit.com/ssga.com',
    'GLD': 'https://logo.clearbit.com/ssga.com',
    'IVV': 'https://logo.clearbit.com/ishares.com',
    'SMH': 'https://logo.clearbit.com/vaneck.com',
    'COIN': 'https://logo.clearbit.com/coinbase.com',
};

export const TOP_ASSETS_FALLBACK = [
    { t: 'BTC', n: 'Bitcoin', c: AssetClass.CRYPTO }, { t: 'ETH', n: 'Ethereum', c: AssetClass.CRYPTO },
    { t: 'PETR4', n: 'Petrobras PN', c: AssetClass.STOCK }, { t: 'VALE3', n: 'Vale ON', c: AssetClass.STOCK },
    { t: 'MXRF11', n: 'Maxi Renda', c: AssetClass.FUND }, { t: 'HGLG11', n: 'CGHG Logística', c: AssetClass.FUND },
    { t: 'AAPL', n: 'Apple', c: AssetClass.STOCK }, { t: 'NVDA', n: 'NVIDIA', c: AssetClass.STOCK },
    { t: 'VOO', n: 'Vanguard S&P 500', c: AssetClass.ETF }, { t: 'IVVB11', n: 'iShares S&P 500', c: AssetClass.ETF }
];

const smartFetch = async (url: string, useProxy = true, timeoutMs = 1800) => {
    const separator = url.includes('?') ? '&' : '?';
    const bust = `_t=${Date.now()}-${Math.floor(Math.random() * 10000)}`; 
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
        // Proxy Rotation
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
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('vanguard')) return 'https://logo.clearbit.com/vanguard.com';
    if (lowerName.includes('ishares') || lowerName.includes('blackrock')) return 'https://logo.clearbit.com/ishares.com';
    if (lowerName.includes('invesco')) return 'https://logo.clearbit.com/invesco.com';
    if (lowerName.includes('spdr') || lowerName.includes('state street')) return 'https://logo.clearbit.com/ssga.com';
    if (lowerName.includes('ark ')) return 'https://logo.clearbit.com/ark-invest.com';
    if (lowerName.includes('vaneck')) return 'https://logo.clearbit.com/vaneck.com';

    let domain = ticker.includes('.SA') ? `${t.toLowerCase()}.com.br` : `${t.toLowerCase()}.com`;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

const normalizeTicker = (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    const cryptoMatch = TOP_ASSETS_FALLBACK.find(a => a.t === t && a.c === AssetClass.CRYPTO);
    if (cryptoMatch) return { symbol: t, type: 'CRYPTO' };
    if (['BTC','ETH','SOL','BNB','XRP','USDT','USDC','ADA','DOGE','AVAX','LINK'].includes(t)) return { symbol: t, type: 'CRYPTO' };
    const brRegex = /^[A-Z]{4}(3|4|5|6|11)$/;
    if (t.endsWith('.SA')) return { symbol: t, type: 'BR' };
    if (brRegex.test(t)) return { symbol: `${t}.SA`, type: 'BR' };
    return { symbol: t, type: 'GLOBAL' };
};

const getCryptoMapping = (ticker: string) => {
    const t = ticker.replace('-USD', '').toUpperCase();
    const binanceSymbol = ['USDT', 'USDC'].includes(t) ? `${t}USDC` : `${t}USDT`;
    const krakenPair = ['BTC','ETH','XRP','SOL','ADA'].includes(t) ? `${t}USD` : `${t}USDT`;
    const coinId = { 
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'USDT': 'tether',
        'BNB': 'binancecoin', 'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin',
        'AVAX': 'avalanche-2', 'LINK': 'chainlink'
    }[t] || t.toLowerCase();
    return { binanceSymbol, coinId, krakenPair };
};

// CRITICAL: Force Calculation of Change if API Returns 0
const calculateRobustMetrics = (price: number, prevClose: number, apiChange: number = 0, apiPercent: number = 0, state: MarketState = MarketState.REGULAR): Quote => {
    let change = apiChange;
    let changePercent = apiPercent;

    // If API says 0% but we know Price and PrevClose, we calculate it.
    if (price > 0 && prevClose > 0) {
        const mathChange = price - prevClose;
        
        // If API is missing change OR API says 0 but price moved significantly
        if (Math.abs(apiChange) < 0.000001 || (Math.abs(mathChange) > 0.000001 && Math.abs(apiChange) < 0.000001)) {
            change = mathChange;
            changePercent = (mathChange / prevClose) * 100;
        }
    }

    return {
        price,
        change,
        changePercent,
        previousClose: prevClose,
        marketState: state
    };
};

// --- 10+ DATA SOURCES ---

const providers = {
    // 1. BINANCE (Primary Crypto)
    binance: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${BINANCE_API}/ticker/24hr?symbol=${binanceSymbol}`, false, 1500);
            if (data?.lastPrice) {
                const price = parseFloat(data.lastPrice);
                const prev = parseFloat(data.prevClosePrice);
                return calculateRobustMetrics(price, prev, parseFloat(data.priceChange), parseFloat(data.priceChangePercent), MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 2. GATE.IO (High Volume)
    gateio: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        const symbol = binanceSymbol.replace('USDT','_USDT').replace('USDC','_USDC');
        try {
            const data = await smartFetch(`${GATEIO_API}/${symbol}`, false, 1500);
            if (data?.last) {
                const price = parseFloat(data.last);
                const changePercent = parseFloat(data.percentChange);
                const prev = price / (1 + (changePercent/100));
                return calculateRobustMetrics(price, prev, price - prev, changePercent, MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 3. BYBIT (Derivatives/Spot)
    bybit: async (ticker: string): Promise<Quote | null> => {
        const { binanceSymbol } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${BYBIT_API}?category=spot&symbol=${binanceSymbol}`, false, 1500);
            const item = data?.result?.list?.[0];
            if (item) {
                const price = parseFloat(item.lastPrice);
                const prev = parseFloat(item.prevPrice24h);
                const changePercent = parseFloat(item.price24hPcnt) * 100;
                return calculateRobustMetrics(price, prev, price - prev, changePercent, MarketState.OPEN);
            }
        } catch(e) {}
        return null;
    },
    // 4. KRAKEN (Reliable)
    kraken: async (ticker: string): Promise<Quote | null> => {
        const { krakenPair } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${KRAKEN_API}?pair=${krakenPair}`, false, 2000);
            if (data?.result) {
                const key = Object.keys(data.result)[0];
                const info = data.result[key];
                const price = parseFloat(info.c[0]); // Last trade closed
                const open24 = parseFloat(info.o);   // Opening price 24h ago
                const change = price - open24;
                const percent = (change / open24) * 100;
                return calculateRobustMetrics(price, open24, change, percent, MarketState.OPEN);
            }
        } catch(e) {}
        return null;
    },
    // 5. COINCAP
    coincap: async (ticker: string): Promise<Quote | null> => {
        const { coinId } = getCryptoMapping(ticker);
        try {
            const data = await smartFetch(`${COINCAP_API}/${coinId}`, false, 2000);
            if (data?.data) {
                const price = parseFloat(data.data.priceUsd);
                const changePerc = parseFloat(data.data.changePercent24Hr);
                const prev = price / (1 + (changePerc / 100));
                return calculateRobustMetrics(price, prev, price - prev, changePerc, MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 6. KUCOIN
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
                return calculateRobustMetrics(price, prevClose, change, changePercent, MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 7. COINGECKO
    coingecko: async (ticker: string): Promise<Quote | null> => {
        const { coinId } = getCryptoMapping(ticker);
        try {
            const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
            const data = await smartFetch(url, false, 2500);
            if (data && data[coinId]) {
                const price = data[coinId].usd;
                const changePerc = data[coinId].usd_24h_change;
                const prev = price / (1 + (changePerc/100));
                return calculateRobustMetrics(price, prev, price - prev, changePerc, MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 8. AWESOMEAPI (Currency & Crypto Backup)
    awesome: async (ticker: string): Promise<Quote | null> => {
        const t = ticker.replace('-USD','').toUpperCase();
        try {
            const data = await smartFetch(`${AWESOMEAPI_BASE}/last/${t}-USD`, false, 1500);
            const key = `${t}USD`;
            if (data[key]) {
                const price = parseFloat(data[key].bid);
                const changePercent = parseFloat(data[key].pctChange);
                const prev = price / (1 + (changePercent/100));
                return calculateRobustMetrics(price, prev, price - prev, changePercent, MarketState.OPEN);
            }
        } catch (e) {}
        return null;
    },
    // 9. YAHOO FINANCE (Stocks/Global/Backup)
    yahoo: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${YAHOO_QUOTE_API}?symbols=${ticker}`, true, 3500);
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

                return calculateRobustMetrics(
                    finalPrice, 
                    prev, 
                    q.regularMarketChange, 
                    q.regularMarketChangePercent, 
                    state
                );
            }
        } catch (e) {}
        return null;
    },
    // 10. BRAPI (Brazilian Stocks)
    brapi: async (ticker: string): Promise<Quote | null> => {
        try {
            const data = await smartFetch(`${BRAPI_BASE_URL}/quote/${ticker}`, false, 2500);
            const r = data?.results?.[0];
            if (r) {
                const price = r.regularMarketPrice || 0;
                const prev = r.regularMarketPreviousClose || price;
                return calculateRobustMetrics(
                    price, 
                    prev, 
                    r.regularMarketChange, 
                    r.regularMarketChangePercent, 
                    MarketState.REGULAR
                );
            }
        } catch (e) {}
        return null;
    }
};

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
            // Shorter cache TTL for quotes to ensure freshness
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
                // MEGA UPDATE: Priority Chain with 8 Sources for Crypto
                const sources = [
                    providers.gateio, 
                    providers.bybit, 
                    providers.binance, 
                    providers.kraken, 
                    providers.coincap, 
                    providers.kucoin, 
                    providers.coingecko, 
                    providers.awesome,
                    providers.yahoo
                ];
                
                for (const provider of sources) {
                    const q = await provider(type === 'CRYPTO' && provider === providers.yahoo ? `${symbol}-USD` : symbol);
                    if (q) {
                        // HUNTER ALGORITHM: Accept if change is NOT zero or if we tried everything
                        if (Math.abs(q.changePercent) > 0.00001) {
                            quote = q; 
                            break; 
                        } else if (!quote) {
                            quote = q; // Keep best effort
                        }
                    }
                }
            } else if (type === 'BR') {
                // BR priority: Brapi -> Yahoo
                quote = await providers.brapi(symbol) || await providers.yahoo(symbol);
            } else {
                // US/Global priority: Yahoo -> Chart Fallback
                quote = await providers.yahoo(symbol);
            }

            // Fallback to Chart API if Quote API fails completely on logic (0% stocks)
            if (!quote || quote.price === 0 || (quote.change === 0 && type !== 'CRYPTO')) {
                // For Stocks, 0% change might mean market closed, but we check Chart just in case
                try {
                    const url = `${YAHOO_CHART_API}/${symbol}?interval=1d&range=1d`;
                    const data = await smartFetch(url, true, 4000);
                    const meta = data?.chart?.result?.[0]?.meta;
                    if (meta?.regularMarketPrice) {
                        quote = calculateRobustMetrics(
                            meta.regularMarketPrice, 
                            meta.previousClose, 
                            meta.regularMarketPrice - meta.previousClose, 
                            0, // Let calc handle it
                            MarketState.REGULAR
                        );
                    }
                } catch(e) {}
            }

            if (quote) {
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
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); 
            interval = '5m'; 
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

        // SNAPSHOT MODE: Apply CURRENT holdings to historical prices
        const currentHoldings: Record<string, number> = {};
        transactions.forEach(tx => {
            currentHoldings[tx.ticker] = (currentHoldings[tx.ticker] || 0) + tx.quantity;
        });

        let timeline: number[] = [];
        const timestamps = Object.values(assetHistoryMap).flatMap(h => h.timestamp);
        if (timestamps.length > 0) {
            timeline = Array.from(new Set(timestamps)).sort((a, b) => a - b);
        } 
        
        if (timeline.length < 2) {
            const start = Math.floor(startTime.getTime() / 1000);
            const end = Math.floor(now.getTime() / 1000);
            const points = range === '1D' ? 60 : 30;
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
                    const idx = history.timestamp.findIndex(t => Math.abs(t - ts) < 600); 
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

        // Ensure the last point matches live data to prevent "jumps"
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
