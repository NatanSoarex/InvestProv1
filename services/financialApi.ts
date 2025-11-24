
import { Asset, Quote, AssetClass, HistoricalDataPoint, Transaction, MarketState } from '../types';

// ============================================================================
// PROVEST FINANCIAL ENGINE 5.0 (Cloud Ready & Expanded Search)
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
    QUOTE: 25 * 1000,       
    HISTORY: 5 * 60 * 1000, 
    ASSET: 24 * 60 * 60 * 1000 
};

const cache = {
    quotes: {} as Record<string, { data: Quote, timestamp: number }>,
    history: {} as Record<string, { data: HistoricalDataPoint[], timestamp: number }>,
    assets: {} as Record<string, Asset>,
};

// --- Pre-defined Top Assets for Search Optimization ---
// MASSIVE FALLBACK LIST FOR INSTANT SEARCH (Seed Data for future DB)
export const TOP_ASSETS_FALLBACK = [
    // --- CRIPTOMOEDAS (TOP 30) ---
    { t: 'BTC', n: 'Bitcoin', c: AssetClass.CRYPTO },
    { t: 'ETH', n: 'Ethereum', c: AssetClass.CRYPTO },
    { t: 'SOL', n: 'Solana', c: AssetClass.CRYPTO },
    { t: 'BNB', n: 'Binance Coin', c: AssetClass.CRYPTO },
    { t: 'USDT', n: 'Tether USD', c: AssetClass.CRYPTO },
    { t: 'XRP', n: 'XRP', c: AssetClass.CRYPTO },
    { t: 'USDC', n: 'USDC', c: AssetClass.CRYPTO },
    { t: 'ADA', n: 'Cardano', c: AssetClass.CRYPTO },
    { t: 'AVAX', n: 'Avalanche', c: AssetClass.CRYPTO },
    { t: 'DOGE', n: 'Dogecoin', c: AssetClass.CRYPTO },
    { t: 'DOT', n: 'Polkadot', c: AssetClass.CRYPTO },
    { t: 'TRX', n: 'TRON', c: AssetClass.CRYPTO },
    { t: 'LINK', n: 'Chainlink', c: AssetClass.CRYPTO },
    { t: 'MATIC', n: 'Polygon', c: AssetClass.CRYPTO },
    { t: 'LTC', n: 'Litecoin', c: AssetClass.CRYPTO },
    { t: 'SHIB', n: 'Shiba Inu', c: AssetClass.CRYPTO },
    { t: 'DAI', n: 'Dai', c: AssetClass.CRYPTO },
    { t: 'BCH', n: 'Bitcoin Cash', c: AssetClass.CRYPTO },
    { t: 'UNI', n: 'Uniswap', c: AssetClass.CRYPTO },
    { t: 'XLM', n: 'Stellar', c: AssetClass.CRYPTO },
    { t: 'ATOM', n: 'Cosmos', c: AssetClass.CRYPTO },
    { t: 'XMR', n: 'Monero', c: AssetClass.CRYPTO },
    { t: 'ETC', n: 'Ethereum Classic', c: AssetClass.CRYPTO },
    { t: 'HBAR', n: 'Hedera', c: AssetClass.CRYPTO },
    { t: 'FIL', n: 'Filecoin', c: AssetClass.CRYPTO },
    { t: 'LDO', n: 'Lido DAO', c: AssetClass.CRYPTO },
    { t: 'APT', n: 'Aptos', c: AssetClass.CRYPTO },
    { t: 'ARB', n: 'Arbitrum', c: AssetClass.CRYPTO },
    { t: 'OP', n: 'Optimism', c: AssetClass.CRYPTO },
    { t: 'NEAR', n: 'NEAR Protocol', c: AssetClass.CRYPTO },
    { t: 'PEPE', n: 'Pepe', c: AssetClass.CRYPTO },
    { t: 'RNDR', n: 'Render', c: AssetClass.CRYPTO },

    // --- AÇÕES BRASIL (TOP IBOVESPA & VAREJO) ---
    // Energia & Utilidade
    { t: 'PETR4', n: 'Petrobras PN', c: AssetClass.STOCK },
    { t: 'PETR3', n: 'Petrobras ON', c: AssetClass.STOCK },
    { t: 'VALE3', n: 'Vale ON', c: AssetClass.STOCK },
    { t: 'ELET3', n: 'Eletrobras ON', c: AssetClass.STOCK },
    { t: 'ELET6', n: 'Eletrobras PNB', c: AssetClass.STOCK },
    { t: 'WEGE3', n: 'WEG ON', c: AssetClass.STOCK },
    { t: 'PRIO3', n: 'PetroRio ON', c: AssetClass.STOCK },
    { t: 'CPLE6', n: 'Copel PNB', c: AssetClass.STOCK },
    { t: 'CMIG4', n: 'Cemig PN', c: AssetClass.STOCK },
    { t: 'SBSP3', n: 'Sabesp ON', c: AssetClass.STOCK },
    { t: 'EQTL3', n: 'Equatorial ON', c: AssetClass.STOCK },
    { t: 'CSNA3', n: 'CSN ON', c: AssetClass.STOCK },
    { t: 'GGBR4', n: 'Gerdau PN', c: AssetClass.STOCK },
    { t: 'GOAU4', n: 'Metalúrgica Gerdau', c: AssetClass.STOCK },
    { t: 'TAEE11', n: 'Taesa Unit', c: AssetClass.STOCK },
    { t: 'TRPL4', n: 'ISA CTEEP PN', c: AssetClass.STOCK },
    { t: 'KLBN11', n: 'Klabin Unit', c: AssetClass.STOCK },
    { t: 'SUZB3', n: 'Suzano ON', c: AssetClass.STOCK },
    
    // Bancos & Financeiro
    { t: 'ITUB4', n: 'Itaú Unibanco PN', c: AssetClass.STOCK },
    { t: 'BBDC4', n: 'Bradesco PN', c: AssetClass.STOCK },
    { t: 'BBAS3', n: 'Banco do Brasil ON', c: AssetClass.STOCK },
    { t: 'BPAC11', n: 'BTG Pactual Unit', c: AssetClass.STOCK },
    { t: 'SANB11', n: 'Santander Unit', c: AssetClass.STOCK },
    { t: 'BBSE3', n: 'BB Seguridade ON', c: AssetClass.STOCK },
    { t: 'CXSE3', n: 'Caixa Seguridade', c: AssetClass.STOCK },
    { t: 'B3SA3', n: 'B3 ON', c: AssetClass.STOCK },
    { t: 'XP', n: 'XP Inc', c: AssetClass.STOCK },
    { t: 'NU', n: 'Nubank', c: AssetClass.STOCK },
    
    // Varejo & Consumo
    { t: 'MGLU3', n: 'Magazine Luiza ON', c: AssetClass.STOCK },
    { t: 'LREN3', n: 'Lojas Renner ON', c: AssetClass.STOCK },
    { t: 'ASAI3', n: 'Assaí ON', c: AssetClass.STOCK },
    { t: 'CRFB3', n: 'Carrefour Brasil', c: AssetClass.STOCK },
    { t: 'RDOR3', n: 'Rede D\'Or', c: AssetClass.STOCK },
    { t: 'RADL3', n: 'Raia Drogasil ON', c: AssetClass.STOCK },
    { t: 'HAPV3', n: 'Hapvida ON', c: AssetClass.STOCK },
    { t: 'JBSS3', n: 'JBS ON', c: AssetClass.STOCK },
    { t: 'BRFS3', n: 'BRF ON', c: AssetClass.STOCK },
    { t: 'ABEV3', n: 'Ambev ON', c: AssetClass.STOCK },
    { t: 'NTCO3', n: 'Natura ON', c: AssetClass.STOCK },
    
    // Outros
    { t: 'RENT3', n: 'Localiza ON', c: AssetClass.STOCK },
    { t: 'EMBR3', n: 'Embraer ON', c: AssetClass.STOCK },
    { t: 'AZUL4', n: 'Azul PN', c: AssetClass.STOCK },
    { t: 'GOLL4', n: 'Gol PN', c: AssetClass.STOCK },
    { t: 'CVCB3', n: 'CVC Brasil ON', c: AssetClass.STOCK },
    { t: 'VIVT3', n: 'Vivo Telefônica', c: AssetClass.STOCK },
    { t: 'TIMS3', n: 'TIM ON', c: AssetClass.STOCK },
    
    // --- FIIS (TOP LIQUIDEZ IFIX) ---
    { t: 'MXRF11', n: 'Maxi Renda FII', c: AssetClass.FUND },
    { t: 'HGLG11', n: 'CGHG Logística FII', c: AssetClass.FUND },
    { t: 'KNCR11', n: 'Kinea Rendimentos', c: AssetClass.FUND },
    { t: 'KNIP11', n: 'Kinea Índices', c: AssetClass.FUND },
    { t: 'XPLG11', n: 'XP Log FII', c: AssetClass.FUND },
    { t: 'XPML11', n: 'XP Malls FII', c: AssetClass.FUND },
    { t: 'VISC11', n: 'Vinci Shopping FII', c: AssetClass.FUND },
    { t: 'BTLG11', n: 'BTG Logística FII', c: AssetClass.FUND },
    { t: 'IRDM11', n: 'Iridium Recebíveis', c: AssetClass.FUND },
    { t: 'HCTR11', n: 'Hectare CE FII', c: AssetClass.FUND },
    { t: 'VGHF11', n: 'Valora Hedge Fund', c: AssetClass.FUND },
    { t: 'BCFF11', n: 'BTG Fundo de Fundos', c: AssetClass.FUND },
    { t: 'TGAR11', n: 'TG Ativo Real FII', c: AssetClass.FUND },
    { t: 'BRCR11', n: 'BTG Corp Office', c: AssetClass.FUND },
    { t: 'JSRE11', n: 'JS Real Estate', c: AssetClass.FUND },
    { t: 'CPTS11', n: 'Capitânia Securities', c: AssetClass.FUND },
    { t: 'RECR11', n: 'Rec Recebíveis', c: AssetClass.FUND },
    { t: 'HGRU11', n: 'CSHG Renda Urbana', c: AssetClass.FUND },
    { t: 'MALL11', n: 'Malls Brasil Plural', c: AssetClass.FUND },
    { t: 'VGIP11', n: 'Valora Cri Índice', c: AssetClass.FUND },
    { t: 'ALZR11', n: 'Alianza Trust Renda', c: AssetClass.FUND },
    { t: 'VRTA11', n: 'Fator Verita', c: AssetClass.FUND },
    
    // --- ETFs BRASIL ---
    { t: 'IVVB11', n: 'iShares S&P 500', c: AssetClass.ETF },
    { t: 'BOVA11', n: 'iShares Ibovespa', c: AssetClass.ETF },
    { t: 'SMAL11', n: 'iShares Small Cap', c: AssetClass.ETF },
    { t: 'HASH11', n: 'Hashdex Crypto', c: AssetClass.ETF },
    { t: 'XINA11', n: 'Trend China', c: AssetClass.ETF },
    { t: 'NASD11', n: 'Trend Nasdaq', c: AssetClass.ETF },
    { t: 'GOLD11', n: 'Trend Ouro', c: AssetClass.ETF },
    { t: 'DIVO11', n: 'Itau Dividentos', c: AssetClass.ETF },
    { t: 'B5P211', n: 'Itau Tesouro IPCA', c: AssetClass.ETF },

    // --- USA STOCKS (TECH & BLUE CHIPS) ---
    { t: 'AAPL', n: 'Apple Inc.', c: AssetClass.STOCK },
    { t: 'MSFT', n: 'Microsoft Corp.', c: AssetClass.STOCK },
    { t: 'GOOG', n: 'Alphabet Inc.', c: AssetClass.STOCK },
    { t: 'AMZN', n: 'Amazon.com Inc.', c: AssetClass.STOCK },
    { t: 'TSLA', n: 'Tesla Inc.', c: AssetClass.STOCK },
    { t: 'NVDA', n: 'NVIDIA Corp.', c: AssetClass.STOCK },
    { t: 'META', n: 'Meta Platforms', c: AssetClass.STOCK },
    { t: 'NFLX', n: 'Netflix Inc.', c: AssetClass.STOCK },
    { t: 'AMD', n: 'AMD Inc.', c: AssetClass.STOCK },
    { t: 'INTC', n: 'Intel Corp.', c: AssetClass.STOCK },
    { t: 'IBM', n: 'IBM', c: AssetClass.STOCK },
    { t: 'CRM', n: 'Salesforce', c: AssetClass.STOCK },
    { t: 'ADBE', n: 'Adobe', c: AssetClass.STOCK },
    { t: 'PYPL', n: 'PayPal', c: AssetClass.STOCK },
    { t: 'UBER', n: 'Uber Technologies', c: AssetClass.STOCK },
    { t: 'PLTR', n: 'Palantir', c: AssetClass.STOCK },
    { t: 'COIN', n: 'Coinbase Global', c: AssetClass.STOCK },
    { t: 'KO', n: 'Coca-Cola', c: AssetClass.STOCK },
    { t: 'PEP', n: 'PepsiCo', c: AssetClass.STOCK },
    { t: 'MCD', n: 'McDonalds', c: AssetClass.STOCK },
    { t: 'DIS', n: 'Walt Disney', c: AssetClass.STOCK },
    { t: 'NKE', n: 'Nike', c: AssetClass.STOCK },
    { t: 'V', n: 'Visa', c: AssetClass.STOCK },
    { t: 'MA', n: 'Mastercard', c: AssetClass.STOCK },
    { t: 'JPM', n: 'JPMorgan Chase', c: AssetClass.STOCK },
    { t: 'BAC', n: 'Bank of America', c: AssetClass.STOCK },
    { t: 'WMT', n: 'Walmart', c: AssetClass.STOCK },
    { t: 'SBUX', n: 'Starbucks', c: AssetClass.STOCK },
    { t: 'T', n: 'AT&T', c: AssetClass.STOCK },

    // --- USA ETFs ---
    { t: 'VOO', n: 'Vanguard S&P 500', c: AssetClass.ETF },
    { t: 'VTI', n: 'Vanguard Total Stock', c: AssetClass.ETF },
    { t: 'QQQ', n: 'Invesco QQQ', c: AssetClass.ETF },
    { t: 'SPY', n: 'SPDR S&P 500', c: AssetClass.ETF },
    { t: 'SCHD', n: 'Schwab US Dividend', c: AssetClass.ETF },
    { t: 'JEPI', n: 'JPMorgan Equity Premium', c: AssetClass.ETF },
    { t: 'ARKK', n: 'ARK Innovation', c: AssetClass.ETF },
    { t: 'VUG', n: 'Vanguard Growth', c: AssetClass.ETF },
    { t: 'VT', n: 'Vanguard Total World', c: AssetClass.ETF },
    { t: 'VNQ', n: 'Vanguard Real Estate', c: AssetClass.ETF },
    { t: 'TQQQ', n: 'ProShares UltraPro QQQ', c: AssetClass.ETF },
    { t: 'SOXL', n: 'Direxion Daily Semi', c: AssetClass.ETF }
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

// --- Helper: Logo Resolution Engine (Enhanced V2) ---
const resolveLogo = (ticker: string, name: string): string => {
    const t = ticker.toUpperCase().replace('.SA', '').trim();
    
    // 1. HARDCODED HIGH-QUALITY LOGOS (Major Assets)
    const hardcoded: Record<string, string> = {
        // Crypto
        'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        'USDT': 'https://assets.coingecko.com/coins/images/325/large/tether.png',
        'BNB': 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
        'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
        'ADA': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
        'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
        'USDC': 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
        'DOT': 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
        'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
        'LTC': 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
        'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
        'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
        'TRX': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
        'SHIB': 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
        'DAI': 'https://assets.coingecko.com/coins/images/9956/large/4943.png',
        'UNI': 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
        'ATOM': 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
        'PEPE': 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
        // US Tech
        'AAPL': 'https://logo.clearbit.com/apple.com',
        'MSFT': 'https://logo.clearbit.com/microsoft.com',
        'GOOG': 'https://logo.clearbit.com/google.com',
        'GOOGL': 'https://logo.clearbit.com/google.com',
        'AMZN': 'https://logo.clearbit.com/amazon.com',
        'TSLA': 'https://logo.clearbit.com/tesla.com',
        'NVDA': 'https://logo.clearbit.com/nvidia.com',
        'META': 'https://logo.clearbit.com/meta.com',
        'NFLX': 'https://logo.clearbit.com/netflix.com',
    };

    if (hardcoded[t]) return hardcoded[t];

    // 2. DOMAIN MAPPING (Brazilian & Specific Stocks)
    const domainMap: Record<string, string> = {
        // BR Stocks
        'PETR3': 'petrobras.com.br', 'PETR4': 'petrobras.com.br',
        'VALE3': 'vale.com',
        'ITUB3': 'itau.com.br', 'ITUB4': 'itau.com.br',
        'BBDC3': 'bradesco.com.br', 'BBDC4': 'bradesco.com.br',
        'BBAS3': 'bb.com.br',
        'WEGE3': 'weg.net',
        'MGLU3': 'magazineluiza.com.br',
        'RENT3': 'localiza.com',
        'RDOR3': 'rededor.com.br',
        'PRIO3': 'prio3.com.br',
        'CSNA3': 'csn.com.br',
        'GGBR4': 'gerdau.com.br',
        'JBSS3': 'jbs.com.br',
        'ELET3': 'eletrobras.com', 'ELET6': 'eletrobras.com',
        'EMBR3': 'embraer.com',
        'VIVT3': 'vivo.com.br',
        'TIMS3': 'tim.com.br',
        'RAIL3': 'rumolog.com',
        'SUZB3': 'suzano.com.br',
        'BPAC11': 'btgpactual.com',
        'SANB11': 'santander.com.br',
        'HAPV3': 'hapvida.com.br',
        'CMIG4': 'cemig.com.br',
        'CPLE6': 'copel.com',
        'SBSP3': 'sabesp.com.br',
        'RADL3': 'raiadrogasil.com.br',
        'LREN3': 'lojasrenner.com.br',
        'ASAI3': 'assai.com.br',
        'NU': 'nubank.com.br', 'ROXO34': 'nubank.com.br',
        'XP': 'xpi.com.br',
        'PAGS': 'pagseguro.uol.com.br',
        'STNE': 'stone.co',
        'AZUL4': 'voeazul.com.br',
        'GOLL4': 'voegol.com.br',
        'CVCB3': 'cvc.com.br',
        'ALOS3': 'allos.co',
        'ABEV3': 'ambev.com.br',
        'BRFS3': 'brf-global.com',
        'NTCO3': 'naturaco.com',
        'EQTL3': 'equatorialenergia.com.br',
        // BR FIIs
        'MXRF11': 'xp.com.br',
        'HGLG11': 'credit-suisse.com',
        'KNCR11': 'kinea.com.br', 'KNIP11': 'kinea.com.br', 'KNHY11': 'kinea.com.br',
        'XPLG11': 'xp.com.br', 'XPML11': 'xp.com.br',
        'VISC11': 'vinci-partners.com',
        'BTLG11': 'btgpactual.com',
        'IRDM11': 'iridiumgestao.com.br',
        'HCTR11': 'hectarecapital.com.br',
        'VGHF11': 'valora.com.br',
        'TGAR11': 'tgcore.com.br',
        'BCFF11': 'btgpactual.com',
        'BRCR11': 'btgpactual.com',
        // US/Global Generic
        'KO': 'coca-colacompany.com',
        'PEP': 'pepsico.com',
        'MCD': 'mcdonalds.com',
        'DIS': 'disney.com',
        'NKE': 'nike.com',
        'V': 'visa.com',
        'MA': 'mastercard.com',
        'JPM': 'jpmorganchase.com',
        'BAC': 'bankofamerica.com',
        'IVVB11': 'ishares.com',
        'BOVA11': 'b3.com.br',
        'SMAL11': 'b3.com.br',
        'SBUX': 'starbucks.com',
        'T': 'att.com'
    };

    const domain = domainMap[t];
    if (domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    if (!ticker.endsWith('.SA') && ticker.length <= 5) {
        const cleanName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        return `https://logo.clearbit.com/${cleanName}.com`;
    }

    return `https://ui-avatars.com/api/?name=${t}&background=0D1117&color=C9D1D9&bold=true&font-size=0.4&length=3&rounded=true`;
};

// --- Helper: Ticker Normalizer ---
const normalizeTicker = (ticker: string) => {
    const t = ticker.toUpperCase().trim();
    
    // Check if it's a known crypto in our fallback list
    const cryptoMatch = TOP_ASSETS_FALLBACK.find(a => a.t === t && a.c === AssetClass.CRYPTO);
    if (cryptoMatch) return { symbol: t, type: 'CRYPTO' };
    
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
        'DOT': 'polkadot', 'MATIC': 'matic-network', 'LINK': 'chainlink', 'LTC': 'litecoin',
        'USDC': 'usd-coin', 'TRX': 'tron', 'SHIB': 'shiba-inu', 'DAI': 'dai', 'BCH': 'bitcoin-cash',
        'UNI': 'uniswap', 'XLM': 'stellar', 'PEPE': 'pepe', 'ATOM': 'cosmos', 'XMR': 'monero'
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
                return {
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChange),
                    changePercent: parseFloat(data.priceChangePercent),
                    previousClose: parseFloat(data.prevClosePrice),
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
                // Coinbase spot endpoint lacks change, fallback to 0 or previous logic if needed
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
                    price: price,
                    change: change,
                    changePercent: changePerc,
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
                
                // MATHEMATICAL FALLBACK FOR BR API:
                let change = r.regularMarketChange;
                let changePercent = r.regularMarketChangePercent;
                const price = r.regularMarketPrice;
                const prevClose = r.regularMarketPreviousClose;

                // AGGRESSIVE FALLBACK: If API says 0% but prices differ
                if (price && prevClose && price !== prevClose) {
                    const diff = price - prevClose;
                    if (!changePercent || Math.abs(changePercent) < 0.0001) {
                         change = diff;
                         changePercent = (diff / prevClose) * 100;
                    }
                }

                if ((!prevClose || prevClose === 0) && price > 0 && change) {
                     const inferredPrev = price - change;
                     changePercent = (change / inferredPrev) * 100;
                }

                return {
                    price: price,
                    change: change,
                    changePercent: changePercent,
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
                if (q.quoteType === 'MUTUALFUND' && ticker === 'BTC') return null; 

                const price = q.regularMarketPrice;
                const prevClose = q.regularMarketPreviousClose;
                
                let state = MarketState.REGULAR;
                if (q.marketState === 'PRE') state = MarketState.PRE;
                if (q.marketState === 'POST') state = MarketState.POST;
                if (q.marketState === 'CLOSED') state = MarketState.CLOSED;

                let finalPrice = price;
                if (state === MarketState.PRE && q.preMarketPrice) finalPrice = q.preMarketPrice;
                if (state === MarketState.POST && q.postMarketPrice) finalPrice = q.postMarketPrice;

                let change = q.regularMarketChange;
                let changePercent = q.regularMarketChangePercent;

                const hasZeroChange = changePercent === undefined || Math.abs(changePercent) < 0.00001;
                
                if (finalPrice > 0 && prevClose > 0) {
                     const diff = finalPrice - prevClose;
                     if (Math.abs(diff) > 0.000001 && hasZeroChange) {
                         change = diff;
                         changePercent = (diff / prevClose) * 100;
                     }
                }
                
                if (finalPrice > 0 && (!prevClose || prevClose === 0)) {
                    if (q.regularMarketOpen > 0) {
                        const diff = finalPrice - q.regularMarketOpen;
                        change = diff;
                        changePercent = (diff / q.regularMarketOpen) * 100;
                    }
                }

                return {
                    price: finalPrice,
                    change: change || (finalPrice - prevClose),
                    changePercent: changePercent || ((finalPrice - prevClose)/prevClose)*100 || 0,
                    previousClose: prevClose,
                    marketState: state
                };
            }
        } catch (e) {}
        return null;
    },
    stooq: async (ticker: string): Promise<Quote | null> => {
        try {
            const url = `${STOOQ_BASE_URL}/?s=${ticker.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`;
            const csvData = await smartFetch(url, true, 3000, true); 
            if (typeof csvData === 'string') {
                return parseStooqCsv(csvData);
            }
        } catch (e) {}
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
        
        // 1. Filter Local Matches First (Instant Result & High Accuracy)
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

        // Smart sorting: Exact ticker match first, then exact name match
        localResults.sort((a, b) => {
             const aTicker = a.ticker.toLowerCase();
             const bTicker = b.ticker.toLowerCase();
             const exactA = aTicker === qLower || aTicker === `${qLower}.sa`;
             const exactB = bTicker === qLower || bTicker === `${qLower}.sa`;
             if (exactA && !exactB) return -1;
             if (!exactA && exactB) return 1;
             return 0;
        });

        // Limit local results if we have too many, to allow mixing with API results if needed
        // But if we have a lot of good local matches, prefer them as they are faster.
        if (localResults.length >= 8) {
            return localResults.slice(0, 15);
        }

        try {
            // 2. Try Yahoo Finance for broad search if local is sparse
            const url = `${YAHOO_SEARCH_URL}?q=${query}&quotesCount=10&newsCount=0`;
            const data = await smartFetch(url, true, 2000); 
            
            const yahooMatches = (data?.quotes || [])
                .filter((q: any) => q.quoteType !== 'OPTION')
                .map((q: any) => {
                    let assetClass = AssetClass.STOCK;
                    if (q.quoteType === 'ETF') assetClass = AssetClass.ETF;
                    if (q.quoteType === 'CRYPTOCURRENCY') assetClass = AssetClass.CRYPTO;
                    if (q.quoteType === 'MUTUALFUND') assetClass = AssetClass.FUND;

                    let ticker = q.symbol;
                    return {
                        ticker: ticker,
                        name: q.shortname || q.longname || q.symbol,
                        logo: resolveLogo(ticker, q.shortname || ticker),
                        country: ticker.endsWith('.SA') ? 'Brazil' : 'USA',
                        assetClass: assetClass,
                        sector: 'General',
                        industry: 'General',
                        marketCap: 0, volume: 0, peRatio: 0, pbRatio: 0, dividendYield: 0, beta: 0
                    };
                });

            // Merge Local Results with API Results (Local takes precedence)
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
                quote = await providers.binance(symbol);
                if (!quote) quote = await providers.coingecko(symbol); 
                if (!quote) quote = await providers.yahoo(`${symbol}-USD`); 
                if (!quote) quote = await providers.coinbase(symbol);
            }

            if (type === 'BR') {
                quote = await providers.brapi(symbol);
                if (!quote) quote = await providers.yahoo(symbol);
            }

            if (type === 'GLOBAL') {
                quote = await providers.yahoo(symbol);
                if (!quote) quote = await providers.stooq(symbol);
            }

            if (!quote) {
                 quote = await providers.yahoo(symbol);
            }

            if (quote) {
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
        const isToday = new Date(dateTime).toDateString() === new Date().toDateString();

        if (isToday) {
            const q = await financialApi.getQuotes([symbol]);
            if (q[symbol]) return { price: q[symbol].price };
        }

        const ts = Math.floor(new Date(dateTime).getTime() / 1000);
        const p1 = ts - 86400;
        const p2 = ts + 86400;
        
        try {
            const url = `${YAHOO_CHART_API}/${type === 'CRYPTO' ? symbol + '-USD' : symbol}?period1=${p1}&period2=${p2}&interval=5m`;
            const data = await smartFetch(url, true);
            const result = data?.chart?.result?.[0];
            
            if (result?.indicators?.quote?.[0]?.close) {
                const prices = result.indicators.quote[0].close.filter((p:number) => p !== null);
                if (prices.length > 0) return { price: prices[prices.length - 1] };
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

        const holdings: Record<string, number> = {};
        let totalInvestedBase = 0;

        transactions.forEach(t => {
            const { symbol } = normalizeTicker(t.ticker); 
            holdings[symbol] = (holdings[symbol] || 0) + t.quantity;
            const isBRL = symbol.endsWith('.SA');
            const rate = isBRL && fxRate > 0 ? (1/fxRate) : 1;
            totalInvestedBase += (t.totalCost * rate);
        });

        const tickers = Object.keys(holdings);
        const histories: Record<string, {date: number, price: number}[]> = {};
        
        await Promise.all(tickers.map(async (ticker) => {
            let rawData;
            const now = Math.floor(Date.now() / 1000);
            const yahooTicker = ticker.endsWith('.SA') ? ticker : (['BTC','ETH'].includes(ticker) ? `${ticker}-USD` : ticker);

            if (range === '1D') {
                const startOfDay = new Date();
                startOfDay.setHours(0,0,0,0);
                const p1 = Math.floor(startOfDay.getTime() / 1000);
                rawData = await smartFetch(`${YAHOO_CHART_API}/${yahooTicker}?period1=${p1}&period2=${now}&interval=5m`, true);
            } else {
                const mapRange: Record<string, string> = { '5D': '5d', '1M': '1mo', '6M': '6mo', 'YTD': 'ytd', '1Y': '1y', 'ALL': '5y' };
                const mapInterval: Record<string, string> = { '5D': '15m', '1M': '90m', '6M': '1d', 'YTD': '1d', '1Y': '1d', 'ALL': '1wk' };
                rawData = await smartFetch(`${YAHOO_CHART_API}/${yahooTicker}?interval=${mapInterval[range]}&range=${mapRange[range]}`, true);
            }

            const res = rawData?.chart?.result?.[0];
            if (res?.timestamp && res?.indicators?.quote?.[0]?.close) {
                const closes = res.indicators.quote[0].close;
                histories[ticker] = res.timestamp.map((ts: number, i: number) => ({
                    date: ts * 1000,
                    price: closes[i] || null 
                })).filter((d: any) => d.date > 0);
            }
        }));

        const allTimestamps = new Set<number>();
        Object.values(histories).forEach(list => {
            list.forEach(p => allTimestamps.add(p.date));
        });
        
        if (allTimestamps.size === 0 && currentQuotes) {
             allTimestamps.add(Date.now());
        }

        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
        
        if (['1D', '5D'].includes(range)) {
            const now = Date.now();
            if (sortedTimestamps.length === 0 || (now - sortedTimestamps[sortedTimestamps.length-1] > 60000)) {
                sortedTimestamps.push(now);
            }
        }

        const result: HistoricalDataPoint[] = [];
        const lastKnownPrices: Record<string, number> = {};

        tickers.forEach(t => {
            const first = histories[t]?.find(p => p.price !== null);
            if (first) {
                lastKnownPrices[t] = first.price;
            } else if (currentQuotes && currentQuotes[t]) {
                lastKnownPrices[t] = currentQuotes[t].price;
            }
        });

        for (const ts of sortedTimestamps) {
            let currentValueUSD = 0;
            const isLastPoint = ts === sortedTimestamps[sortedTimestamps.length - 1];
            
            tickers.forEach(ticker => {
                const qty = holdings[ticker];
                if (qty > 0) {
                    const assetHistory = histories[ticker] || [];
                    const match = assetHistory.find(p => p.date === ts);
                    
                    if (match && match.price !== null) {
                        lastKnownPrices[ticker] = match.price;
                    }
                    
                    let price = lastKnownPrices[ticker] || 0;
                    if (isLastPoint && currentQuotes && currentQuotes[ticker]) {
                         price = currentQuotes[ticker].price;
                    }

                    const isBRL = ticker.endsWith('.SA');
                    const rate = isBRL && fxRate > 0 ? (1/fxRate) : 1;
                    
                    currentValueUSD += (price * qty * rate);
                }
            });

            if (currentValueUSD > 0 || sortedTimestamps.length === 1) {
                result.push({
                    date: new Date(ts).toISOString(),
                    price: parseFloat(currentValueUSD.toFixed(2)),
                    invested: parseFloat(totalInvestedBase.toFixed(2))
                });
            }
        }

        return result;
    }
};
