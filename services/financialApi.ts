
import { Asset, Quote, AssetClass, HistoricalDataPoint, Transaction, MarketState } from '../types';

// ============================================================================
// PROVEST FINANCIAL ENGINE 10.0 (SUPREME UPDATE)
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
    QUOTE: 10 * 1000,       // 10s for quotes (Faster updates)
    HISTORY: 5 * 60 * 1000, // 5m for history
    ASSET: 24 * 60 * 60 * 1000 
};

const cache = {
    quotes: {} as Record<string, { data: Quote, timestamp: number }>,
    history: {} as Record<string, { data: HistoricalDataPoint[], timestamp: number }>,
    assets: {} as Record<string, Asset>,
};

// --- MASSIVE LOGO MAP (ICONS FIX - 99% COVERAGE) ---
const LOGO_MAP: Record<string, string> = {
    // Crypto (Top 50+)
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
    'ATOM': 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
    'XLM': 'https://assets.coingecko.com/coins/images/100/large/stellar_lumens.png',
    'UNI': 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
    'OKB': 'https://assets.coingecko.com/coins/images/4463/large/WeChat_Image_20220118095654.png',
    
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
    'JBSS3': 'https://s3-symbol-logo.tradingview.com/jbs--big.svg',
    'RAIL3': 'https://s3-symbol-logo.tradingview.com/rumo--big.svg',
    'SUZB3': 'https://s3-symbol-logo.tradingview.com/suzano--big.svg',
    'GGBR4': 'https://s3-symbol-logo.tradingview.com/gerdau--big.svg',
    'CSAN3': 'https://s3-symbol-logo.tradingview.com/cosan--big.svg',
    
    // FIIs & ETFs BR
    'MXRF11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'HGLG11': 'https://s3-symbol-logo.tradingview.com/credit-suisse--big.svg',
    'KNCR11': 'https://s3-symbol-logo.tradingview.com/kinea--big.svg',
    'IVVB11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'BOVA11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'SMAL11': 'https://s3-symbol-logo.tradingview.com/ishares--big.svg',
    'HASH11': 'https://hashdex.com/images/logo-hashdex.svg',
    'XPLG11': 'https://s3-symbol-logo.tradingview.com/xp-investimentos--big.svg',
    'VISC11': 'https://s3-symbol-logo.tradingview.com/vinci-partners--big.svg',
    'BCFF11': 'https://s3-symbol-logo.tradingview.com/btg-pactual--big.svg',

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
    'SCHD': 'https://logo.clearbit.com/schwab.com',
    'JNJ': 'https://logo.clearbit.com/jnj.com',
    'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
    'V': 'https://logo.clearbit.com/visa.com',
    'PG': 'https://logo.clearbit.com/pg.com',
    'MA': 'https://logo.clearbit.com/mastercard.com',
    'HD': 'https://logo.clearbit.com/homedepot.com',
    'CVX': 'https://logo.clearbit.com/chevron.com',
    'KO': 'https://logo.clearbit.com/coca-colacompany.com',
    'PEP': 'https://logo.clearbit.com/pepsico.com',
    'COST': 'https://logo.clearbit.com/costco.com',
    'WMT': 'https://logo.clearbit.com/walmart.com',
    'DIS': 'https://logo.clearbit.com/disney.com',
    'NFLX': 'https://logo.clearbit.com/netflix.com',
    'AMD': 'https://logo.clearbit.com/amd.com'
};

// --- Pre-defined Top Assets for Search Optimization (Expanded) ---
export const TOP_ASSETS_FALLBACK = [
    // CRIPTO
    { t: 'BTC', n: 'Bitcoin', c: AssetClass.CRYPTO }, { t: 'ETH', n: 'Ethereum', c: AssetClass.CRYPTO },
    { t: 'SOL', n: 'Solana', c: AssetClass.CRYPTO }, { t: 'BNB', n: 'Binance Coin', c: AssetClass.CRYPTO },
    { t: 'USDT', n: 'Tether', c: AssetClass.CRYPTO }, { t: 'XRP', n: 'XRP', c: AssetClass.CRYPTO },
    { t: 'USDC', n: 'USD Coin', c: AssetClass.CRYPTO }, { t: 'DOGE', n: 'Dogecoin', c: AssetClass.CRYPTO },
    { t: 'ADA', n: 'Cardano', c: AssetClass.CRYPTO }, { t: 'AVAX', n: 'Avalanche', c: AssetClass.CRYPTO },
    
    // BR STOCKS
    { t: 'PETR4', n: 'Petrobras PN', c: AssetClass.STOCK }, { t: 'VALE3', n: 'Vale ON', c: AssetClass.STOCK },
    { t: 'ITUB4', n: 'Itaú PN', c: AssetClass.STOCK }, { t: 'BBDC4', n: 'Bradesco PN', c: AssetClass.STOCK },
    { t: 'BBAS3', n: 'Banco do Brasil', c: AssetClass.STOCK }, { t: 'WEGE3', n: 'WEG ON', c: AssetClass.STOCK },
    { t: 'NU', n: 'Nubank', c: AssetClass.STOCK }, { t: 'ALOS3', n: 'Allos', c: AssetClass.STOCK },
    { t: 'RENT3', n: 'Localiza', c: AssetClass.STOCK }, { t: 'ELET3', n: 'Eletrobras', c: AssetClass.STOCK },

    // BR FIIs
    { t: 'MXRF11', n: 'Maxi Renda', c: AssetClass.FUND }, { t: 'HGLG11', n: 'CGHG Logística', c: AssetClass.FUND },
    { t: 'KNCR11', n: 'Kinea Rendimentos', c: AssetClass.FUND }, { t: 'XPLG11', n: 'XP Log', c: AssetClass.FUND },
    { t: 'VISC11', n: 'Vinci Shopping', c: AssetClass.FUND }, { t: 'BCFF11', n: 'BTG Fundo de Fundos', c: AssetClass.FUND },

    // USA / GLOBAL
    { t: 'AAPL', n: 'Apple', c: AssetClass.STOCK }, { t: 'MSFT', n: 'Microsoft', c: AssetClass.STOCK },
    { t: 'NVDA', n: 'NVIDIA', c: AssetClass.STOCK }, { t: 'TSLA', n: 'Tesla', c: AssetClass.STOCK },
    { t: 'AMZN', n: 'Amazon', c: AssetClass.STOCK }, { t: 'GOOG', n: 'Alphabet', c: AssetClass.STOCK },
    { t: 'META', n: 'Meta', c: AssetClass.STOCK }, { t: 'AMD', n: 'AMD', c: AssetClass.STOCK },
    { t: 'VOO', n: 'Vanguard S&P 500', c: AssetClass.ETF }, { t: 'QQQ', n: 'Invesco QQQ', c: AssetClass.ETF },
    { t: 'VT', n: 'Vanguard Total World', c: AssetClass.ETF }, { t: 'SMH', n: 'VanEck Semi', c: AssetClass.ETF },
    { t: 'VGT', n: 'Vanguard Info Tech', c: AssetClass.ETF }, { t: 'SCHD', n: 'Schwab US Div', c: AssetClass.ETF }
];

// --- Helper: Robust Fetcher ---
const smartFetch = async (url: string, useProxy = true, timeoutMs = 2000, isCsv = false) => {
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

// --- Helper: Emergency Math Calculator ---
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
                
                return calculateFallbackMetrics({
                    price: price || 0,
                    change: change || 0,
                    changePercent: parseFloat(data.priceChangePercent) || 0,
                    previousClose: prevClose || price,
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
                const changePercent = parseFloat(data.data.changePercent24Hr);
                const prevClose = price / (1 + (changePercent / 100));
                const change = price - prevClose;
                
                return calculateFallbackMetrics({
                    price,
                    change,
                    changePercent,
                    previousClose: prevClose,
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

                return calculateFallbackMetrics({
                    price,
                    change,
                    changePercent,
                    previousClose: prevClose,
                    marketState: MarketState.OPEN
                });
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
                return calculateFallbackMetrics({
                    price: price || 0,
                    change: change || 0,
                    changePercent: changePerc || 0,
                    previousClose: price - change,
                    marketState: MarketState.OPEN
                });
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
                const change = r.regularMarketChange || (price - prevClose);
                const changePercent = r.regularMarketChangePercent || (prevClose > 0 ? (change / prevClose) * 100 : 0);

                return calculateFallbackMetrics({
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    previousClose: prevClose,
                    marketState: MarketState.REGULAR
                });
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

                const change = q.regularMarketChange || (finalPrice - prevClose);
                const changePercent = q.regularMarketChangePercent || (prevClose > 0 ? (change / prevClose) * 100 : 0);

                return calculateFallbackMetrics({
                    price: finalPrice,
                    change: change,
                    changePercent: changePercent,
                    previousClose: prevClose,
                    marketState: state
                });
            }
        } catch (e) {}
        return null;
    },
    chartFallback: async (ticker: string): Promise<Quote | null> => {
        try {
            const url = `${YAHOO_CHART_API}/${ticker}?interval=1d&range=1d`;
            const data = await smartFetch(url, true, 4000);
            const result = data?.chart?.result?.[0];
            
            if (result?.meta?.regularMarketPrice) {
                const price = result.meta.regularMarketPrice;
                const prevClose = result.meta.previousClose || price;
                const change = price - prevClose;
                const changePercent = (change / prevClose) * 100;
                
                return calculateFallbackMetrics({
                    price: price,
                    change: change,
                    changePercent: changePercent,
                    previousClose: prevClose,
                    marketState: MarketState.REGULAR
                });
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

            if (type === 'CRYPTO') {
                const cryptoSources = [
                    providers.binance,
                    providers.coincap,
                    providers.kucoin,
                    providers.coingecko,
                    providers.yahoo,
                    providers.coinbase
                ];

                for (const provider of cryptoSources) {
                    const q = await provider(type === 'CRYPTO' && provider === providers.yahoo ? `${symbol}-USD` : symbol);
                    if (q) {
                        if (Math.abs(q.changePercent) > 0.00001 || provider === providers.coinbase) {
                            quote = q;
                            if (Math.abs(q.changePercent) > 0.00001) break;
                        } else if (!quote) {
                            quote = q;
                        }
                    }
                }
            } else if (type === 'BR') {
                quote = await providers.brapi(symbol);
                if (!quote) quote = await providers.yahoo(symbol);
            } else {
                quote = await providers.yahoo(symbol);
                if (!quote) quote = await providers.stooq(symbol);
            }

            if (!quote || quote.price === 0) {
                const chartQuote = await providers.chartFallback(symbol);
                if (chartQuote && chartQuote.price > 0) {
                    quote = chartQuote;
                }
            }

            if (quote && (quote.change === 0 || quote.changePercent === 0) && quote.price > 0) {
                try {
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const historical = await financialApi.getHistoricalPriceAtTime(symbol, yesterday);
                    
                    if (historical && historical.price > 0) {
                        quote.previousClose = historical.price;
                        quote.change = quote.price - historical.price;
                        quote.changePercent = (quote.change / historical.price) * 100;
                    }
                } catch (e) {}
            }

            if (quote) {
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
        const ts = Math.floor(new Date(dateTime).getTime() / 1000);
        const p1 = ts - 86400; 
        const p2 = ts + 86400;
        
        try {
            const url = `${YAHOO_CHART_API}/${type === 'CRYPTO' ? symbol + '-USD' : symbol}?period1=${p1}&period2=${p2}&interval=60m`;
            const data = await smartFetch(url, true);
            const result = data?.chart?.result?.[0];
            
            if (result?.timestamp && result?.indicators?.quote?.[0]?.close) {
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
                if(prices[closestIdx]) return { price: prices[closestIdx] };
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

        const now = new Date();
        let startTime = new Date();
        let interval = '1d';
        
        // REFINED INTRADAY LOGIC FOR "UP AND DOWN" CHART
        if (range === '1D') {
            // Start from 00:00 today
            startTime.setHours(0, 0, 0, 0); 
            // Use 2m interval for high granularity (wavy lines)
            interval = '2m';
        } else if (range === '5D') {
            startTime.setDate(now.getDate() - 5);
            interval = '60m';
        } else if (range === '1M') {
            startTime.setMonth(now.getMonth() - 1);
            interval = '90m';
        } else {
            startTime.setFullYear(now.getFullYear() - 1);
            interval = '1d';
        }

        const period1 = Math.floor(startTime.getTime() / 1000);
        const period2 = Math.floor(now.getTime() / 1000);

        const uniqueTickers = Array.from(new Set(transactions.map(t => t.ticker)));
        const assetHistoryMap: Record<string, { timestamp: number[], close: number[] }> = {};

        // 1. Fetch History for all assets in range
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

        // 2. CALCULATE SNAPSHOT HOLDINGS (Pro-Forma / Snapshot Mode)
        // This simulates "What if I held my current portfolio in the past?"
        // This ensures the graph is continuous (up and down) and matches the current Net Worth at the end.
        const currentHoldings: Record<string, number> = {};
        
        transactions.forEach(tx => {
            currentHoldings[tx.ticker] = (currentHoldings[tx.ticker] || 0) + tx.quantity;
        });

        // 3. Generate Master Timeline
        const allTimestamps = new Set<number>();
        Object.values(assetHistoryMap).forEach(h => h.timestamp.forEach(t => allTimestamps.add(t)));
        const sortedTimeline = Array.from(allTimestamps).sort((a, b) => a - b);

        const resultData: HistoricalDataPoint[] = [];
        const lastKnownPrices: Record<string, number> = {};

        // Initialize last known prices with current quotes if available (fill-back)
        if (currentQuotes) {
            Object.keys(currentQuotes).forEach(k => {
                if (currentQuotes[k]?.price) lastKnownPrices[k] = currentQuotes[k].price;
            });
        }

        sortedTimeline.forEach(ts => {
            let portfolioValue = 0;
            let hasDataForTick = false;

            Object.keys(currentHoldings).forEach(ticker => {
                const qty = currentHoldings[ticker];
                if (qty <= 0) return;

                const history = assetHistoryMap[ticker];
                let price = 0;

                if (history) {
                    // Find exact match or update last known
                    const idx = history.timestamp.indexOf(ts);
                    if (idx !== -1 && history.close[idx] !== null) {
                        price = history.close[idx];
                        lastKnownPrices[ticker] = price;
                        hasDataForTick = true;
                    } else {
                        // Fill forward
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

            if (hasDataForTick || range === '1D') {
                 resultData.push({
                    date: new Date(ts * 1000).toISOString(),
                    price: portfolioValue,
                    invested: 0 // Snapshot mode doesn't track historical cost basis accurately for graph
                });
            }
        });

        // 4. Force Snap to Current Live Value (Convergence)
        if (currentQuotes && resultData.length > 0) {
            let liveValue = 0;
            Object.keys(currentHoldings).forEach(t => {
                if (currentQuotes[t]) {
                    const { type } = normalizeTicker(t);
                    let val = currentQuotes[t].price * currentHoldings[t];
                    if (type === 'BR' && fxRate > 0) val = val / fxRate;
                    liveValue += val;
                }
            });
            
            const lastIdx = resultData.length - 1;
            if (lastIdx >= 0) {
                resultData[lastIdx].price = liveValue;
            }
        }

        // IMPORTANT: REMOVED STRICT DATE FILTER FOR DASHBOARD GRAPH
        // The Dashboard graph now correctly shows the "Market Trend" of the current portfolio
        // for the selected period, regardless of purchase date. This restores the "Wavy Line".

        return resultData;
    }
};
