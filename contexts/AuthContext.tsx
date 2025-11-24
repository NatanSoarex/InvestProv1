
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Suggestion } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface AuthContextType {
  currentUser: User | null;
  users: User[]; 
  suggestions: Suggestion[]; 
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: Omit<User, 'id' | 'isAdmin' | 'isBanned' | 'subscriptionExpiresAt' | 'createdAt' | 'securityCode'>) => Promise<User>; 
  logout: () => void;
  updateUserSubscription: (userId: string, days: number) => void;
  banUser: (userId: string) => void;
  isPremium: (user: User) => boolean;
  verifyUserForSupport: (username: string, email: string, securityCode: string) => Promise<User | null>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;
  updateEmail: (userId: string, newEmail: string) => Promise<void>;
  addSuggestion: (text: string, user: User) => void;
  refreshUserData: () => Promise<void>; // Nova função exposta
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // --- LOCAL STORAGE HELPERS (Modo Offline) ---
  const loadLocalUsers = () => {
      const stored = localStorage.getItem('provest_users');
      return stored ? JSON.parse(stored) : [];
  };
  
  const saveLocalUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      localStorage.setItem('provest_users', JSON.stringify(newUsers));
  };

  const checkIsAdminLocal = (username: string) => {
      if (!username) return false;
      const cleanUser = username.toLowerCase().replace('@', '').trim();
      return cleanUser === 'natansoarex';
  };

  const generateUniqueSecurityCode = (existingUsers: User[]): string => {
      let code = '';
      let isUnique = false;
      while (!isUnique) {
          code = Math.floor(100000 + Math.random() * 900000).toString();
          // eslint-disable-next-line no-loop-func
          const exists = existingUsers.some(u => u.securityCode === code);
          if (!exists) isUnique = true;
      }
      return code;
  };

  // --- HELPER: MAP SESSION TO USER ---
  const mapSessionToUser = (session: any, dbProfile?: any): User => {
      const meta = session.user.user_metadata || {};
      
      // Prioridade: Perfil do DB -> Metadados da Sessão -> Email do Auth
      const username = dbProfile?.username || meta.username || session.user.email;
      const name = dbProfile?.name || meta.name || 'Usuário';
      const securityCode = dbProfile?.security_code || meta.security_code || '------';
      const isAdmin = dbProfile?.is_admin || username === '@natansoarex';
      const isBanned = dbProfile?.is_banned || false;
      const subscriptionExpiresAt = dbProfile?.subscription_expires_at || null;
      const createdAt = dbProfile?.created_at || new Date().toISOString();

      return {
          id: session.user.id,
          username,
          name,
          email: session.user.email || '',
          password: '', // Never stored
          securityCode,
          isAdmin,
          isBanned,
          subscriptionExpiresAt,
          createdAt
      };
  };

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const initAuth = async () => {
        const AUTO_LOGIN_DEV = false; 

        if (AUTO_LOGIN_DEV) {
             setCurrentUser({
                id: 'dev_admin',
                username: '@natansoarex',
                name: 'Admin Dev',
                email: 'admin@provest.com',
                password: '',
                securityCode: '000000',
                isAdmin: true,
                isBanned: false,
                subscriptionExpiresAt: new Date(Date.now() + 31536000000).toISOString(),
                createdAt: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        if (isSupabaseConfigured) {
            // MODO SUPABASE (Cloud)
            
            // 1. Tenta recuperar sessão existente (Rápido)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                // A. Login Imediato com Metadados (Otimista)
                const optimisticUser = mapSessionToUser(session);
                setCurrentUser(optimisticUser);

                // B. Sincronização em Segundo Plano (Async/Await para evitar erro de Build TS)
                (async () => {
                    try {
                        const { data: profile, error } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (profile && !error) {
                            const syncedUser = mapSessionToUser(session, profile);
                            setCurrentUser(syncedUser);
                        }
                    } catch (err) {
                        console.warn("Background profile sync failed, maintaining session state.", err);
                    }
                })();
            }

            // 2. Listener para Mudanças de Estado
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                     // Tenta atualizar perfil completo, mas SEMPRE garante o login com metadados se falhar
                     try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        // Se achou perfil no banco, usa ele. Se não, usa os dados da sessão.
                        const user = mapSessionToUser(session, profile || undefined);
                        setCurrentUser(user);
                     } catch (e) {
                        // Falha de rede ou banco: Usa dados da sessão para não deslogar
                        const user = mapSessionToUser(session);
                        setCurrentUser(user);
                     }
                }
            });
            
        } else {
            // MODO LOCAL STORAGE (Offline)
            const localUsers = loadLocalUsers();
            const updatedUsers = localUsers.map((u: User) => ({
                ...u,
                isAdmin: checkIsAdminLocal(u.username)
            }));
            setUsers(updatedUsers);

            const sessionUser = localStorage.getItem('provest_session');
            if (sessionUser) {
                const parsedSession = JSON.parse(sessionUser);
                const foundUser = updatedUsers.find((u: User) => u.id === parsedSession.id);
                if (foundUser && !foundUser.isBanned) {
                    setCurrentUser(foundUser);
                } else {
                    localStorage.removeItem('provest_session');
                }
            }
            
            const storedSuggestions = localStorage.getItem('provest_suggestions');
            if (storedSuggestions) setSuggestions(JSON.parse(storedSuggestions));
        }
        setLoading(false);
    };

    initAuth();
  }, []);

  // Função para atualizar dados de usuários e sugestões (Disponível para Admin)
  const refreshUserData = useCallback(async () => {
      if (!currentUser?.isAdmin) return;
      
      if (isSupabaseConfigured) {
          // Busca perfis
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) {
              console.error("Erro ao buscar perfis:", error.message);
          }
          if (data) {
              const mappedUsers: User[] = data.map(p => ({
                  id: p.id,
                  username: p.username,
                  name: p.name,
                  email: p.email,
                  password: '',
                  securityCode: p.security_code,
                  isAdmin: p.is_admin,
                  isBanned: p.is_banned,
                  subscriptionExpiresAt: p.subscription_expires_at,
                  createdAt: p.created_at
              }));
              setUsers(mappedUsers);
          }

          // Busca sugestões
          const { data: sugs } = await supabase.from('suggestions').select('*');
          if (sugs) {
              const mappedSugs: Suggestion[] = sugs.map(s => ({
                  id: s.id,
                  userId: s.user_id,
                  username: 'User',
                  text: s.text,
                  createdAt: s.created_at
              }));
              setSuggestions(mappedSugs); 
          }
      }
  }, [currentUser]);

  // Carregar lista de usuários para Admin na montagem ou quando muda user
  useEffect(() => {
      refreshUserData();
  }, [refreshUserData]);


  // --- AÇÕES ---

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        let emailToLogin = username;

        // Tenta resolver Username -> Email se não for formato de email
        if (!username.includes('@') || !username.includes('.')) {
             const targetUsername = username.startsWith('@') ? username : `@${username}`;
             
             try {
                 // Tenta buscar email (pode falhar por RLS se não for admin/public)
                 const { data } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', targetUsername)
                    .single();
                 
                 if (data && data.email) {
                     emailToLogin = data.email;
                 } else {
                     throw new Error("USER_NOT_FOUND");
                 }
             } catch (e) {
                 throw new Error("Não foi possível encontrar pelo nome de usuário (Segurança Cloud). Por favor, use o E-MAIL para entrar.");
             }
        }

        const { error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
        if (error) throw new Error("Credenciais inválidas ou erro de conexão.");
        return true;

    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        const user = users.find(u => 
            (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) 
            && u.password === password
        );
        
        if (user) {
            if (user.isBanned) throw new Error("Esta conta foi banida.");
            setCurrentUser(user);
            localStorage.setItem('provest_session', JSON.stringify(user));
            return true;
        }
        throw new Error("Usuário ou senha incorretos.");
    }
  };

  const register = async (data: Omit<User, 'id' | 'isAdmin' | 'isBanned' | 'subscriptionExpiresAt' | 'createdAt' | 'securityCode'>) => {
    const securityCode = generateUniqueSecurityCode(users); 

    if (isSupabaseConfigured) {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    username: data.username,
                    name: data.name,
                    security_code: securityCode
                }
            }
        });

        if (error) throw new Error(error.message);
        
        if (authData.user) {
            // Login Otimista: Define usuário imediatamente para evitar espera do banco de dados
            const newUser: User = {
                id: authData.user.id,
                username: data.username,
                name: data.name,
                email: data.email,
                password: '',
                securityCode: securityCode,
                isAdmin: checkIsAdminLocal(data.username),
                isBanned: false,
                subscriptionExpiresAt: null,
                createdAt: new Date().toISOString()
            };
            setCurrentUser(newUser);
            return newUser;
        }
        throw new Error("Erro ao criar conta.");

    } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) throw new Error("Usuário já em uso.");
        if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) throw new Error("Email já cadastrado.");

        const newUser: User = {
            ...data,
            id: Date.now().toString(),
            securityCode: securityCode,
            isAdmin: checkIsAdminLocal(data.username),
            isBanned: false,
            subscriptionExpiresAt: null,
            createdAt: new Date().toISOString(),
        };

        const updated = [...users, newUser];
        saveLocalUsers(updated);
        setCurrentUser(newUser);
        localStorage.setItem('provest_session', JSON.stringify(newUser));
        return newUser;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    } else {
        localStorage.removeItem('provest_session');
    }
    setCurrentUser(null);
  };

  const updateUserSubscription = async (userId: string, days: number) => {
      const expiryDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();
      
      if (isSupabaseConfigured) {
          await supabase.from('profiles').update({ subscription_expires_at: expiryDate }).eq('id', userId);
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscriptionExpiresAt: expiryDate } : u));
      } else {
          const updated = users.map(u => u.id === userId ? { ...u, subscriptionExpiresAt: expiryDate } : u);
          saveLocalUsers(updated);
          if (currentUser?.id === userId) {
              const me = updated.find(u => u.id === userId);
              if (me) {
                  setCurrentUser(me);
                  localStorage.setItem('provest_session', JSON.stringify(me));
              }
          }
      }
  };

  const banUser = async (userId: string) => {
      if (isSupabaseConfigured) {
          const user = users.find(u => u.id === userId);
          if (user) {
              await supabase.from('profiles').update({ is_banned: !user.isBanned }).eq('id', userId);
              setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !u.isBanned } : u));
          }
      } else {
          const updated = users.map(u => {
              if (u.id === userId) {
                  if (checkIsAdminLocal(u.username)) return u;
                  return { ...u, isBanned: !u.isBanned };
              }
              return u;
          });
          saveLocalUsers(updated);
      }
  };

  const verifyUserForSupport = async (username: string, email: string, securityCode: string): Promise<User | null> => {
      if (isSupabaseConfigured) {
          const { data } = await supabase.from('profiles')
            .select('*')
            .ilike('username', username)
            .eq('email', email)
            .eq('security_code', securityCode)
            .single();
          
          if (data) {
              return {
                  id: data.id,
                  username: data.username,
                  name: data.name,
                  email: data.email,
                  password: '',
                  securityCode: data.security_code,
                  isAdmin: data.is_admin,
                  isBanned: data.is_banned,
                  subscriptionExpiresAt: data.subscription_expires_at,
                  createdAt: data.created_at
              };
          }
          return null;
      } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.securityCode === securityCode
          ) || null;
      }
  };

  const resetPassword = async (userId: string, newPassword: string) => {
      if (isSupabaseConfigured) {
          await supabase.auth.updateUser({ password: newPassword });
      } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const updated = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
          saveLocalUsers(updated);
          if (currentUser?.id === userId) {
              setCurrentUser({ ...currentUser, password: newPassword });
          }
      }
  };

  const updateEmail = async (userId: string, newEmail: string) => {
      if (isSupabaseConfigured) {
          await supabase.auth.updateUser({ email: newEmail });
          await supabase.from('profiles').update({ email: newEmail }).eq('id', userId);
      } else {
          if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== userId)) {
              throw new Error("Email já em uso.");
          }
          const updated = users.map(u => u.id === userId ? { ...u, email: newEmail } : u);
          saveLocalUsers(updated);
          if (currentUser?.id === userId) {
              setCurrentUser({ ...currentUser, email: newEmail });
          }
      }
  };

  const addSuggestion = async (text: string, user: User) => {
      if (isSupabaseConfigured) {
          await supabase.from('suggestions').insert({
              user_id: user.id,
              text: text
          });
      } else {
          const newSug: Suggestion = {
              id: Date.now().toString(),
              userId: user.id,
              username: user.username,
              text,
              createdAt: new Date().toISOString()
          };
          const updated = [newSug, ...suggestions];
          setSuggestions(updated);
          localStorage.setItem('provest_suggestions', JSON.stringify(updated));
      }
  };

  const isPremium = (user: User): boolean => {
    if (!user.subscriptionExpiresAt) return false;
    return new Date(user.subscriptionExpiresAt).getTime() > Date.now();
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, suggestions, login, register, logout, updateUserSubscription, banUser, isPremium, verifyUserForSupport, resetPassword, updateEmail, addSuggestion, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
