

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Suggestion } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[]; // Lista de todos os usuários para o admin
  suggestions: Suggestion[]; // Lista de sugestões
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: Omit<User, 'id' | 'isAdmin' | 'isBanned' | 'subscriptionExpiresAt' | 'createdAt' | 'securityCode'>) => Promise<User>; // Retorna User para mostrar o código
  logout: () => void;
  updateUserSubscription: (userId: string, days: number) => void;
  banUser: (userId: string) => void;
  isPremium: (user: User) => boolean;
  verifyUserForSupport: (username: string, email: string, securityCode: string) => Promise<User | null>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;
  updateEmail: (userId: string, newEmail: string) => Promise<void>;
  addSuggestion: (text: string, user: User) => void;
}

// --- CONFIGURAÇÃO DE DESENVOLVIMENTO ---
// Mude para FALSE quando for lançar o aplicativo para o público!
const AUTO_LOGIN_DEV = true; 

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Helper para verificar se é o admin supremo
  // REGRA RIGOROSA: Apenas 'natansoarex' pode ser admin.
  const checkIsAdmin = (username: string) => {
      if (!username) return false;
      const cleanUser = username.toLowerCase().replace('@', '').trim();
      return cleanUser === 'natansoarex' || cleanUser === 'dev_admin'; // Permite o user de dev também
  };

  // Carregar usuários e sugestões do LocalStorage ao iniciar
  useEffect(() => {
    const storedUsers = localStorage.getItem('provest_users');
    let parsedUsers: User[] = [];
    
    if (storedUsers) {
      parsedUsers = JSON.parse(storedUsers);
      
      // GARANTIA DE INTEGRIDADE DO ADMIN:
      const updatedUsers = parsedUsers.map(u => ({
          ...u,
          isAdmin: checkIsAdmin(u.username)
      }));
      
      setUsers(updatedUsers);
      parsedUsers = updatedUsers; // Atualiza referência local
    }

    const storedSuggestions = localStorage.getItem('provest_suggestions');
    if (storedSuggestions) {
        setSuggestions(JSON.parse(storedSuggestions));
    }

    const sessionUser = localStorage.getItem('provest_session');
    
    // --- LÓGICA DE AUTO LOGIN (DEV MODE) ---
    if (AUTO_LOGIN_DEV && !sessionUser) {
        // Cria um usuário Admin/Premium temporário para desenvolvimento
        const devUser: User = {
            id: 'dev-mode-user',
            name: 'Desenvolvedor (Modo Teste)',
            username: '@dev_admin',
            email: 'dev@provest.app',
            password: '123',
            securityCode: '000000',
            isAdmin: true,
            isBanned: false,
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 Ano Premium
            createdAt: new Date().toISOString()
        };

        setCurrentUser(devUser);
        // Não salvamos na sessão persistente para garantir que se desligar o flag, ele desloga
        console.log("⚡ MODO DEV ATIVO: Login automático realizado como Admin.");
        
        // Garante que esse usuário exista na lista de usuários para não dar erro
        if (!parsedUsers.find(u => u.username === devUser.username)) {
            setUsers(prev => [...prev, devUser]);
        }
        return;
    }
    // ---------------------------------------

    if (sessionUser) {
      // Validar se o usuário ainda existe e não está banido
      const parsedSession = JSON.parse(sessionUser);
      const foundUser = parsedUsers.find((u: User) => u.id === parsedSession.id);
      
      if (foundUser && !foundUser.isBanned) {
        const userWithStrictRole = { ...foundUser, isAdmin: checkIsAdmin(foundUser.username) };
        setCurrentUser(userWithStrictRole);
      } else {
        localStorage.removeItem('provest_session');
      }
    }
  }, []);

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('provest_users', JSON.stringify(newUsers));
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (user) {
      if (user.isBanned) throw new Error("Esta conta foi banida pelo administrador.");
      
      // Reforça a verificação de admin no login
      const userWithRole = { ...user, isAdmin: checkIsAdmin(user.username) };
      
      setCurrentUser(userWithRole);
      localStorage.setItem('provest_session', JSON.stringify(userWithRole));
      return true;
    }
    throw new Error("Usuário ou senha incorretos.");
  };

  // Função auxiliar para gerar código ÚNICO
  const generateUniqueSecurityCode = (existingUsers: User[]): string => {
      let code = '';
      let isUnique = false;
      
      // Loop de segurança: Gera e verifica se já existe
      while (!isUnique) {
          // Gera número aleatório de 6 dígitos
          code = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Verifica se algum usuário JÁ tem esse código
          // eslint-disable-next-line no-loop-func
          const exists = existingUsers.some(u => u.securityCode === code);
          
          if (!exists) {
              isUnique = true;
          }
      }
      return code;
  };

  const register = async (data: Omit<User, 'id' | 'isAdmin' | 'isBanned' | 'subscriptionExpiresAt' | 'createdAt' | 'securityCode'>) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check for duplicate username (case insensitive)
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new Error("Este nome de usuário já está em uso.");
    }

    // Check for duplicate email (case insensitive)
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
        throw new Error("Este email já está cadastrado.");
    }

    // Define se é admin baseado unicamente no username
    const isAdminUser = checkIsAdmin(data.username);
    
    // Gera código de segurança ÚNICO
    const uniqueCode = generateUniqueSecurityCode(users);

    const newUser: User = {
      ...data,
      id: Date.now().toString(),
      securityCode: uniqueCode, // Atribui o código único
      isAdmin: isAdminUser, 
      isBanned: false,
      subscriptionExpiresAt: null, // Começa Free
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    setCurrentUser(newUser);
    localStorage.setItem('provest_session', JSON.stringify(newUser));
    
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('provest_session');
    setCurrentUser(null);
    if (AUTO_LOGIN_DEV) {
        alert("Modo DEV ativo: O login automático ocorrerá novamente ao atualizar a página.");
    }
  };

  const updateUserSubscription = (userId: string, days: number) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const currentExpiry = u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).getTime() : Date.now();
        const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
        const newExpiry = new Date(baseTime + (days * 24 * 60 * 60 * 1000)).toISOString();
        
        const updatedUser = { ...u, subscriptionExpiresAt: newExpiry };
        if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
            localStorage.setItem('provest_session', JSON.stringify(updatedUser));
        }
        return updatedUser;
      }
      return u;
    });
    saveUsers(updatedUsers);
  };

  const banUser = (userId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        if (checkIsAdmin(u.username)) return u;
        return { ...u, isBanned: !u.isBanned };
      }
      return u;
    });
    saveUsers(updatedUsers);
  };

  const isPremium = (user: User): boolean => {
    if (!user.subscriptionExpiresAt) return false;
    return new Date(user.subscriptionExpiresAt).getTime() > Date.now();
  };

  // --- Funções do Bot de Suporte ---

  const verifyUserForSupport = async (username: string, email: string, securityCode: string): Promise<User | null> => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simula processamento
      const user = users.find(u => 
          u.username.toLowerCase() === username.toLowerCase() && 
          u.email.toLowerCase() === email.toLowerCase() && 
          u.securityCode === securityCode
      );
      return user || null;
  };

  const resetPassword = async (userId: string, newPassword: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simula escrita no banco
      const updatedUsers = users.map(u => {
          if (u.id === userId) {
              return { ...u, password: newPassword };
          }
          return u;
      });
      saveUsers(updatedUsers);
      
      // Se o usuário resetado for o atual, atualiza sessão
      if (currentUser && currentUser.id === userId) {
          const updatedUser = { ...currentUser, password: newPassword };
          setCurrentUser(updatedUser);
          localStorage.setItem('provest_session', JSON.stringify(updatedUser));
      }
  };

  const updateEmail = async (userId: string, newEmail: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check duplication
      if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== userId)) {
          throw new Error("Este email já está em uso por outro usuário.");
      }

      const updatedUsers = users.map(u => {
          if (u.id === userId) {
              return { ...u, email: newEmail };
          }
          return u;
      });
      saveUsers(updatedUsers);

      if (currentUser && currentUser.id === userId) {
          const updatedUser = { ...currentUser, email: newEmail };
          setCurrentUser(updatedUser);
          localStorage.setItem('provest_session', JSON.stringify(updatedUser));
      }
  };

  const addSuggestion = (text: string, user: User) => {
      const newSuggestion: Suggestion = {
          id: Date.now().toString(),
          userId: user.id,
          username: user.username,
          text: text,
          createdAt: new Date().toISOString()
      };
      
      setSuggestions(prev => {
          const newState = [newSuggestion, ...prev];
          localStorage.setItem('provest_suggestions', JSON.stringify(newState));
          return newState;
      });
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, suggestions, login, register, logout, updateUserSubscription, banUser, isPremium, verifyUserForSupport, resetPassword, updateEmail, addSuggestion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};