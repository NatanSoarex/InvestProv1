
import { createClient } from '@supabase/supabase-js';

// Configuração Real do Supabase (Produção)
const SUPABASE_URL = 'https://spjpjjrjdobxqarjhtqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanBqanJqZG9ieHFhcmpodHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjEwNjAsImV4cCI6MjA3OTUzNzA2MH0.vLa_sB_G9yxScB1icSBVyKB7B7Nf7-XmbNo5YHdxHFA';

// Verificação se o Supabase está configurado corretamente
export const isSupabaseConfigured = 
  SUPABASE_URL.startsWith('https') && 
  SUPABASE_ANON_KEY.length > 20;

// Criação do cliente único
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para tipos do Banco de Dados
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          name: string
          email: string
          is_admin: boolean
          is_banned: boolean
          subscription_expires_at: string | null
          security_code: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          name?: string
          email?: string
          is_admin?: boolean
          is_banned?: boolean
          subscription_expires_at?: string | null
          security_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          name?: string
          email?: string
          is_admin?: boolean
          is_banned?: boolean
          subscription_expires_at?: string | null
          security_code?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          ticker: string
          quantity: number
          price: number
          total_cost: number
          date_time: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          quantity: number
          price: number
          total_cost: number
          date_time: string
          created_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          ticker: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          created_at?: string
        }
      }
    }
  }
}
