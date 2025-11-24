

export enum AssetClass {
  STOCK = 'Stock',
  ETF = 'ETF',
  FUND = 'Fund',
  CRYPTO = 'Crypto',
}

export enum MarketState {
  PRE = 'PRE',
  REGULAR = 'REGULAR',
  POST = 'POST',
  CLOSED = 'CLOSED',
  OPEN = 'OPEN', // For Crypto (24/7)
}

export interface User {
  id: string;
  name: string;
  username: string; // O arroba
  email: string;
  password: string; // Em um app real, isso seria hash
  securityCode: string; // Código de segurança para suporte
  isAdmin: boolean;
  isBanned: boolean;
  subscriptionExpiresAt: string | null; // ISO Date
  createdAt: string;
}

export interface Suggestion {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string; // ISO Date
}

export interface Asset {
  ticker: string;
  name: string;
  logo: string;
  country: string;
  assetClass: AssetClass;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  pbRatio: number | null;
  dividendYield: number | null;
  beta: number | null;
  volume: number;
}

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketState?: MarketState;
}

export interface Transaction {
  id: string;
  ticker: string;
  dateTime: string; // ISO 8601 format
  quantity: number;
  price: number; // Price per share at time of transaction (market price)
  fees?: number; // Optional transaction fees
  totalCost: number; // Total cost including fees (quantity * price + fees)
}

export interface Holding {
  asset: Asset;
  quote: Quote | null;
  totalQuantity: number;
  averagePrice: number;
  totalInvested: number; // In native currency
  currentValue: number; // In native currency
  totalGainLoss: number; // In native currency
  totalGainLossPercent: number;
  portfolioPercent: number;
  transactions: Transaction[];
  dayChange: number; // In native currency
  dayChangePercent: number;
  
  // USD Converted Values (Added to fix TS Build Error)
  currentValueUSD: number;
  totalInvestedUSD: number;
  totalGainLossUSD: number;
  dayChangeUSD: number;

  // Subscription Logic
  isLocked?: boolean; // Se true, não conta para o total e aparece borrado
}

export interface HistoricalDataPoint {
  date: string;
  price: number;   // Current Market Value
  invested?: number; // Total Cost Basis (The "Staircase")
}