
export const formatCurrency = (value: number, currency: 'BRL' | 'USD') => {
    // Standard Financial Display (Totals, Gains, Net Worth)
    // Clean: Always 2 decimals unless value is extremely small (dust)
    const absValue = Math.abs(value);
    
    let minDecimals = 2;
    let maxDecimals = 2;

    // Handle dust/micro-values only if they are the TOTAL value
    if (absValue > 0 && absValue < 0.01) {
        minDecimals = 2;
        maxDecimals = 6;
    }

    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(value);
};

export const formatUnitPrice = (value: number, currency: 'BRL' | 'USD') => {
    // Specific formatter for Unit Prices (Quote Price, Average Price)
    // Needs higher precision for crypto/penny stocks, but clean for standard assets
    const absValue = Math.abs(value);
    
    let minDecimals = 2;
    let maxDecimals = 2;

    if (absValue > 0 && absValue < 0.01) {
        // Shiba Inu / Sats
        minDecimals = 6;
        maxDecimals = 8;
    } else if (absValue >= 0.01 && absValue < 1.0) {
        // Penny Stocks / Stablecoins partials
        minDecimals = 4;
        maxDecimals = 4;
    } else if (absValue >= 1.0 && absValue < 50) {
        // Low value stocks/crypto
        minDecimals = 2;
        maxDecimals = 2; // Keep it clean (e.g., $25.50 instead of $25.5000)
    } else {
        // Standard stocks (AAPL, BTC)
        minDecimals = 2;
        maxDecimals = 2;
    }

    return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(value);
};

export const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatDate = (isoString: string) => new Date(isoString).toLocaleString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});
