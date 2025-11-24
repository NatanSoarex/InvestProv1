
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
  refreshUserData: () => Promise<void>; 
  dbError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- HELPER: RETRY LOGIC (INSISTENT SAVE) ---
// Tenta executar uma função X vezes antes de desistir
async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(res => setTimeout(res, delay));
        return retryOperation(operation, retries - 1, delay);
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

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
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                const optimisticUser = mapSessionToUser(session);
                setCurrentUser(optimisticUser);

                // Insistent Profile Fetch
                (async () => {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (profile) {
                            const syncedUser = mapSessionToUser(session, profile);
                            setCurrentUser(syncedUser);
                        }
                    } catch (err) {
                        console.warn("Background sync failed (silent).", err);
                    }
                })();
            }

            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                     try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        const user = mapSessionToUser(session, profile || undefined);
                        setCurrentUser(user);
                     } catch (e) {
                        // Fallback to metadata if DB fails
                        if (!currentUser) {
                            const user = mapSessionToUser(session);
                            setCurrentUser(user);
                        }
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

  // --- ADMIN: REFRESH USER DATA (Robust) ---
  const refreshUserData = useCallback(async () => {
      if (!currentUser?.isAdmin) return;
      setDbError(null);
      
      if (isSupabaseConfigured) {
          try {
              // Force fetch profiles
              const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
              
              if (error) {
                  console.error("Admin Fetch Error:", error);
                  setDbError(error.code);
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
              } else {
                  // If empty list but no error (RLS issue likely), try to show self
                  if (currentUser) setUsers([currentUser]);
              }

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
          } catch (e) {
              console.error("Unexpected error fetching admin data:", e);
          }
      }
  }, [currentUser]);

  useEffect(() => {
      if (currentUser?.isAdmin) {
          refreshUserData();
      }
  }, [currentUser, refreshUserData]);


  // --- AÇÕES ---

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        let emailToLogin = username;

        if (!username.includes('@') || !username.includes('.')) {
             const targetUsername = username.startsWith('@') ? username : `@${username}`;
             try {
                 const { data } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', targetUsername)
                    .single();
                 
                 if (data && data.email) {
                     emailToLogin = data.email;
                 } else {
                     // Silent failure: let signIn handle it or throw specific error
                 }
             } catch (e) {
                 throw new Error("Não foi possível encontrar este nome de usuário. Tente usar seu E-MAIL.");
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
        // --- STEP 1: STRICT DUPLICATE CHECK ---
        try {
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .or(`email.eq.${data.email},username.eq.${data.username}`)
                .maybeSingle();

            if (existingUser) {
                throw new Error("ERRO CRÍTICO: Este Usuário ou E-mail já existe no sistema.");
            }
        } catch (e: any) {
            if (e.message && e.message.includes("ERRO CRÍTICO")) throw e;
        }

        // --- STEP 2: CREATE AUTH USER ---
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
            // --- STEP 3: INSISTENT SAVE (RETRY LOGIC) ---
            // Force insert into profiles. Retries 3 times if connection fails.
            const insertProfile = async () => {
                const isAdmin = checkIsAdminLocal(data.username);
                await supabase.from('profiles').insert({
                    id: authData.user!.id,
                    email: data.email,
                    username: data.username,
                    name: data.name,
                    security_code: securityCode,
                    is_admin: isAdmin
                });
            };

            try {
                await retryOperation(insertProfile, 3, 1000);
            } catch (profileErr) {
                console.error("Failed to force-save profile after retries:", profileErr);
                // If duplicate key error, it means trigger worked or user exists. Good.
            }

            // --- STEP 4: OPTIMISTIC LOGIN ---
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
        throw new Error("Erro ao criar conta no servidor.");

    } else {
        // Local Logic
        if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) throw new Error("Usuário já em uso.");
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
    // UI First
    setCurrentUser(null);
    if (isSupabaseConfigured) {
        try { await supabase.auth.signOut(); } catch (e) { }
    } else {
        localStorage.removeItem('provest_session');
    }
  };

  const updateUserSubscription = async (userId: string, days: number) => {
      const expiryDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();
      
      if (isSupabaseConfigured) {
          await supabase.from('profiles').update({ subscription_expires_at: expiryDate }).eq('id', userId);
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscriptionExpiresAt: expiryDate } : u));
      } else {
          const updated = users.map(u => u.id === userId ? { ...u, subscriptionExpiresAt: expiryDate } : u);
          saveLocalUsers(updated);
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
              if (u.id === userId) return { ...u, isBanned: !u.isBanned };
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
          const updated = users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
          saveLocalUsers(updated);
      }
  };

  const updateEmail = async (userId: string, newEmail: string) => {
      if (isSupabaseConfigured) {
          await supabase.auth.updateUser({ email: newEmail });
          await supabase.from('profiles').update({ email: newEmail }).eq('id', userId);
      } else {
          const updated = users.map(u => u.id === userId ? { ...u, email: newEmail } : u);
          saveLocalUsers(updated);
      }
  };

  const addSuggestion = async (text: string, user: User) => {
      if (isSupabaseConfigured) {
          await supabase.from('suggestions').insert({ user_id: user.id, text: text });
      } else {
          const newSug: Suggestion = { id: Date.now().toString(), userId: user.id, username: user.username, text, createdAt: new Date().toISOString() };
          setSuggestions([newSug, ...suggestions]);
      }
  };

  const isPremium = (user: User): boolean => {
    if (!user.subscriptionExpiresAt) return false;
    return new Date(user.subscriptionExpiresAt).getTime() > Date.now();
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, suggestions, login, register, logout, updateUserSubscription, banUser, isPremium, verifyUserForSupport, resetPassword, updateEmail, addSuggestion, refreshUserData, dbError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
