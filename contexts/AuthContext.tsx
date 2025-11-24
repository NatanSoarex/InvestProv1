
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Suggestion } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface AuthContextType {
  currentUser: User | null;
  users: User[]; // Lista de todos os usuários para o admin
  suggestions: Suggestion[]; // Lista de sugestões
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
      return cleanUser === 'natansoarex' || cleanUser === 'dev_admin';
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

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const initAuth = async () => {
        if (isSupabaseConfigured) {
            // MODO SUPABASE
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Busca perfil completo
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        username: profile.username,
                        name: profile.name,
                        email: profile.email,
                        password: '', // Não armazenamos senha no frontend com Supabase
                        securityCode: profile.security_code,
                        isAdmin: profile.is_admin,
                        isBanned: profile.is_banned,
                        subscriptionExpiresAt: profile.subscription_expires_at,
                        createdAt: profile.created_at
                    });
                }
            }

            // Listener de mudanças de Auth
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                } else if (session?.user) {
                     const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                     if (profile) {
                        setCurrentUser({
                            id: profile.id,
                            username: profile.username,
                            name: profile.name,
                            email: profile.email,
                            password: '',
                            securityCode: profile.security_code,
                            isAdmin: profile.is_admin,
                            isBanned: profile.is_banned,
                            subscriptionExpiresAt: profile.subscription_expires_at,
                            createdAt: profile.created_at
                        });
                     }
                }
            });
            
            // Carregar lista de usuários se for admin (simplificado para demo)
            if (session?.user) {
                 // Check admin role locally first or assume fetch
            }

        } else {
            // MODO LOCAL STORAGE
            const localUsers = loadLocalUsers();
            
            // Atualiza status de Admin
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

  // Carregar lista de usuários para Admin (funciona em ambos os modos)
  useEffect(() => {
      const fetchAllUsers = async () => {
          if (!currentUser?.isAdmin) return;
          
          if (isSupabaseConfigured) {
              const { data } = await supabase.from('profiles').select('*');
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
              
              const { data: sugs } = await supabase.from('suggestions').select('*');
              if (sugs) {
                  const mappedSugs: Suggestion[] = sugs.map(s => ({
                      id: s.id,
                      userId: s.user_id,
                      username: 'User', // Join necessário idealmente
                      text: s.text,
                      createdAt: s.created_at
                  }));
                  setSuggestions(mappedSugs); 
              }

          } else {
              // Modo Local já carrega no init
          }
      };
      fetchAllUsers();
  }, [currentUser]);


  // --- AÇÕES ---

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
        let emailToLogin = username;

        // Se NÃO parece um email (é um username tipo @user), tenta buscar o email correspondente
        if (!username.includes('@') || !username.includes('.')) {
             // Garante formato @username
             const targetUsername = username.startsWith('@') ? username : `@${username}`;
             
             // Busca na tabela de perfis
             const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', targetUsername)
                .single();
             
             if (data && data.email) {
                 emailToLogin = data.email;
             } else {
                 // Se não achar, deixa falhar no signIn ou lança erro aqui
                 throw new Error("Usuário não encontrado. Tente entrar com o E-mail.");
             }
        }

        // Login com o email (seja o digitado ou o encontrado via username)
        const { error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
        if (error) throw new Error("Credenciais inválidas.");
        return true;

    } else {
        // Modo Local
        await new Promise(resolve => setTimeout(resolve, 500));
        // Suporta login por @username ou email no modo local também
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
        // Registro no Supabase
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
            return {
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
        }
        throw new Error("Erro ao criar conta.");

    } else {
        // Registro Local
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
    <AuthContext.Provider value={{ currentUser, users, suggestions, login, register, logout, updateUserSubscription, banUser, isPremium, verifyUserForSupport, resetPassword, updateEmail, addSuggestion }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
