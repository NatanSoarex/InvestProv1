
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { formatDate } from '../../utils/formatters';

interface AdminPanelProps {
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const { users, currentUser, updateUserSubscription, banUser, isPremium, suggestions, refreshUserData } = useAuth();
    const [selectedDays, setSelectedDays] = useState(30);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'USERS' | 'SUGGESTIONS'>('USERS');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!currentUser?.isAdmin) return null;

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshUserData();
        setIsRefreshing(false);
    };

    // Script SQL Robusto e Limpo para Configuração do Banco
    const sqlCommand = `-- 1. Tabelas Principais (Se nao existirem)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  name text,
  email text,
  security_code text,
  is_admin boolean default false,
  is_banned boolean default false,
  subscription_expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  ticker text not null,
  quantity numeric not null,
  price numeric not null,
  total_cost numeric not null,
  date_time timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  ticker text not null,
  created_at timestamptz default now(),
  unique(user_id, ticker)
);

create table if not exists public.suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  text text not null,
  created_at timestamptz default now()
);

-- 2. Habilitar Seguranca (RLS)
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlist enable row level security;
alter table public.suggestions enable row level security;

-- 3. Politicas de Acesso (Policies)
-- Perfis
create policy "Perfis publicos" on public.profiles for select using (true);
create policy "Usuario atualiza proprio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Admin ve todos perfis" on public.profiles for select using ((select is_admin from public.profiles where id = auth.uid()) = true);

-- Transacoes
create policy "Usuario ve suas transacoes" on public.transactions for select using (auth.uid() = user_id);
create policy "Usuario cria suas transacoes" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Usuario deleta suas transacoes" on public.transactions for delete using (auth.uid() = user_id);

-- Watchlist
create policy "Usuario ve sua watchlist" on public.watchlist for select using (auth.uid() = user_id);
create policy "Usuario cria na watchlist" on public.watchlist for insert with check (auth.uid() = user_id);
create policy "Usuario deleta da watchlist" on public.watchlist for delete using (auth.uid() = user_id);

-- Sugestoes
create policy "Admin ve sugestoes" on public.suggestions for select using ((select is_admin from public.profiles where id = auth.uid()) = true);
create policy "Usuario envia sugestao" on public.suggestions for insert with check (auth.uid() = user_id);

-- 4. Gatilho Automatico (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name, username, security_code, is_admin)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'security_code',
    (new.raw_user_meta_data->>'username' = '@natansoarex')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

    const handleCopySQL = () => {
        navigator.clipboard.writeText(sqlCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Verifica se o problema é filtro ou banco de dados vazio
    const isDatabaseIssue = users.length <= 1 && !searchTerm; 
    const isSearchEmpty = users.length > 1 && filteredUsers.length === 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-brand-border bg-brand-bg/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-brand-text">Painel Administrativo</h2>
                    </div>
                    <button onClick={onClose} className="text-brand-secondary hover:text-brand-text text-2xl">&times;</button>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex border-b border-brand-border bg-brand-surface/50">
                    <button 
                        onClick={() => setActiveTab('USERS')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'USERS' 
                            ? 'border-brand-primary text-brand-primary bg-brand-primary/5' 
                            : 'border-transparent text-brand-secondary hover:text-brand-text hover:bg-brand-surface'
                        }`}
                    >
                        Gerenciar Usuários
                    </button>
                    <button 
                        onClick={() => setActiveTab('SUGGESTIONS')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'SUGGESTIONS' 
                            ? 'border-brand-primary text-brand-primary bg-brand-primary/5' 
                            : 'border-transparent text-brand-secondary hover:text-brand-text hover:bg-brand-surface'
                        }`}
                    >
                        Sugestões ({suggestions.length})
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col bg-brand-bg/30">
                    
                    {/* USERS TAB */}
                    {activeTab === 'USERS' && (
                        <>
                            <div className="mb-4 flex gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Buscar usuário por nome ou @..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                                <button 
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text hover:bg-brand-bg disabled:opacity-50"
                                    title="Recarregar Lista"
                                >
                                    {isRefreshing ? (
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto border border-brand-border rounded-lg bg-brand-surface">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-brand-bg text-brand-secondary uppercase font-semibold sticky top-0">
                                        <tr>
                                            <th className="p-4">Usuário</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Assinatura</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border/50">
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map(user => {
                                                const premium = isPremium(user);
                                                return (
                                                    <tr key={user.id} className="hover:bg-brand-surface/50">
                                                        <td className="p-4">
                                                            <div className="font-bold text-brand-text">{user.name}</div>
                                                            <div className="text-brand-secondary text-xs">{user.username}</div>
                                                            <div className="text-brand-secondary text-[10px]">{user.email}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            {user.isAdmin ? (
                                                                <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded text-xs border border-brand-primary/20">Admin</span>
                                                            ) : user.isBanned ? (
                                                                <span className="px-2 py-1 bg-brand-danger/10 text-brand-danger rounded text-xs border border-brand-danger/20">Banido</span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-brand-success/10 text-brand-success rounded text-xs border border-brand-success/20">Ativo</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {premium ? (
                                                                <div>
                                                                    <div className="text-brand-success font-medium">Premium</div>
                                                                    <div className="text-xs text-brand-secondary">Expira: {formatDate(user.subscriptionExpiresAt!)}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-brand-secondary">Free (Max 6)</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="flex items-center bg-brand-bg rounded-lg border border-brand-border p-1">
                                                                    <button 
                                                                        onClick={() => updateUserSubscription(user.id, selectedDays)}
                                                                        className="px-2 py-1 text-xs font-bold bg-brand-primary text-white rounded hover:bg-blue-600"
                                                                    >
                                                                        +{selectedDays}d
                                                                    </button>
                                                                    <input 
                                                                        type="number" 
                                                                        value={selectedDays} 
                                                                        onChange={(e) => setSelectedDays(Number(e.target.value))}
                                                                        className="w-12 bg-transparent text-center text-xs text-brand-text focus:outline-none"
                                                                    />
                                                                </div>
                                                                
                                                                {!user.isAdmin && (
                                                                    <button 
                                                                        onClick={() => banUser(user.id)}
                                                                        className={`p-2 rounded-lg border transition-colors ${
                                                                            user.isBanned 
                                                                            ? 'border-brand-success text-brand-success hover:bg-brand-success/10' 
                                                                            : 'border-brand-danger text-brand-danger hover:bg-brand-danger/10'
                                                                        }`}
                                                                        title={user.isBanned ? "Desbanir" : "Banir"}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-brand-secondary">
                                                    {isDatabaseIssue ? (
                                                        <div className="flex flex-col items-center gap-4 bg-brand-surface/50 p-6 rounded-xl border border-brand-border">
                                                            <div className="p-3 bg-brand-bg rounded-full">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-brand-text mb-1">Configuração do Banco de Dados Necessária</p>
                                                                <p className="text-xs opacity-80 max-w-md mx-auto mb-3">
                                                                    Parece que as tabelas ou permissões (RLS) não estão configuradas corretamente no Supabase.
                                                                </p>
                                                                <div className="flex flex-col gap-2 items-center w-full">
                                                                    <pre className="bg-black/30 p-3 rounded text-[10px] font-mono w-full text-left overflow-x-auto border border-brand-border/30 block text-brand-secondary h-32">
                                                                        {sqlCommand}
                                                                    </pre>
                                                                    <button 
                                                                        onClick={handleCopySQL}
                                                                        className={`w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${copied ? 'bg-brand-success text-white' : 'bg-brand-primary text-white hover:bg-brand-primary/80'}`}
                                                                    >
                                                                        {copied ? (
                                                                            <>
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                                Copiado!
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                                                Copiar Script de Instalação
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                    <p className="text-[10px] text-brand-secondary mt-1">Cole este código no <b>SQL Editor</b> do Supabase e clique em Run.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="py-10">
                                                            <p className="text-lg font-medium">Nenhum usuário encontrado.</p>
                                                            <p className="text-sm opacity-60">Tente um termo de busca diferente.</p>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* SUGGESTIONS TAB */}
                    {activeTab === 'SUGGESTIONS' && (
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {suggestions.length === 0 ? (
                                <div className="text-center py-20 text-brand-secondary opacity-50 flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <p className="text-lg font-medium">Nenhuma sugestão enviada ainda.</p>
                                </div>
                            ) : (
                                suggestions.map((sug) => (
                                    <div key={sug.id} className="bg-brand-surface border border-brand-border p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-brand-primary/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                                                    {sug.username.charAt(1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-brand-text">{sug.username}</p>
                                                    <p className="text-xs text-brand-secondary">{formatDate(sug.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-brand-bg/50 p-3 rounded-lg border border-brand-border/30 text-sm text-brand-text italic">
                                            "{sug.text}"
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
