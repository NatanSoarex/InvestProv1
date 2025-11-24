
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SupportChat } from './SupportChat';
import { isSupabaseConfigured } from '../../services/supabase';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [generatedSecurityCode, setGeneratedSecurityCode] = useState<string>('');
  
  // Support Chat State
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }
        if (username.length < 3) {
            throw new Error("O usuário deve ter pelo menos 3 caracteres.");
        }
        // Adiciona @ se não tiver apenas para o registro de username
        const finalUsername = username.startsWith('@') ? username : `@${username}`;
        
        const newUser = await register({
          username: finalUsername,
          name,
          email,
          password
        });
        
        setGeneratedSecurityCode(newUser.securityCode);
        setShowWelcome(true);
        
        setTimeout(() => {
             // Estado global já atualizou, o componente vai desmontar
        }, 6000);
      } else {
        // Lógica de Login: Se parecer email, manda email. Se não, tenta tratar como user.
        let loginIdentifier = username;
        
        // Se não é email e estamos no modo local, adiciona @ por conveniência
        if (!isSupabaseConfigured && !username.includes('@')) {
             loginIdentifier = `@${username}`;
        }
        // Se estamos no Supabase e o usuário digitou apenas o user sem @, não fazemos nada (vai falhar se não for email, mas o erro orienta)
        
        await login(loginIdentifier, password);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro.");
      setIsLoading(false);
    }
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col items-center justify-center animate-in fade-in duration-500 p-4">
         <div className="text-center space-y-4 max-w-md bg-brand-surface p-8 rounded-2xl border border-brand-border shadow-2xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-success/20 mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-success animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
            </div>
            <h1 className="text-3xl font-bold text-brand-text">Bem-vindo!</h1>
            <p className="text-brand-secondary text-lg">Sua conta foi criada com sucesso.</p>
            
            {generatedSecurityCode && (
                <div className="my-6 p-4 bg-brand-bg rounded-xl border border-brand-primary/30">
                    <p className="text-sm text-brand-secondary uppercase font-bold mb-2">Seu Código de Segurança</p>
                    <div className="text-3xl font-mono font-black text-brand-primary tracking-widest select-all cursor-text">
                        {generatedSecurityCode}
                    </div>
                    <p className="text-xs text-brand-danger mt-2">
                        ⚠️ Anote este código! Você precisará dele para recuperar sua senha no suporte.
                    </p>
                </div>
            )}
            
            <p className="text-sm text-brand-secondary animate-pulse">Entrando no aplicativo...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4 relative overflow-hidden">
      {/* Background Details */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl"></div>
           <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-8">
           <div className="flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                <h1 className="text-3xl font-bold text-brand-text">ProVest</h1>
           </div>
           <p className="text-brand-secondary">{isRegistering ? 'Crie sua conta para começar' : 'Entre para acessar seu portfólio'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-lg text-brand-danger text-sm text-center">
                {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">
                {isRegistering ? 'Usuário' : 'E-mail ou Usuário'}
            </label>
            <div className="relative">
                {isRegistering && <span className="absolute left-3 top-2.5 text-brand-secondary">@</span>}
                <input 
                    type="text" 
                    value={isRegistering ? username.replace('@','') : username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full bg-brand-bg border border-brand-border rounded-lg py-2 ${isRegistering ? 'pl-7' : 'pl-4'} pr-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary`}
                    placeholder={isRegistering ? "usuario" : "seu@email.com"}
                    required
                />
            </div>
          </div>

          {isRegistering && (
            <>
                <div>
                    <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">Nome</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="Seu Nome"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">E-mail (Recuperação)</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="seu@email.com"
                        required
                    />
                </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">Senha</label>
            <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="••••••••"
                required
            />
          </div>

          {isRegistering && (
             <div>
                <label className="block text-xs font-bold text-brand-secondary uppercase mb-1">Confirmar Senha</label>
                <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="••••••••"
                    required
                />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processando...
                </span>
            ) : (isRegistering ? 'Registrar' : 'Entrar')}
          </button>
        </form>

        <div className="mt-6 text-center">
             <p className="text-sm text-brand-secondary">
                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                <button 
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                        setUsername('');
                    }}
                    className="text-brand-primary font-bold ml-2 hover:underline"
                >
                    {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                </button>
             </p>
        </div>
      </div>

      {/* Support Button */}
      <button 
        onClick={() => setIsSupportOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-brand-surface border border-brand-primary/30 text-brand-text px-4 py-3 rounded-full shadow-lg hover:bg-brand-primary/10 transition-all group z-40"
      >
        <div className="relative">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-success"></span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-primary group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        </div>
        <span className="font-semibold text-sm hidden md:inline">Suporte Online</span>
      </button>

      {/* Support Chat Modal */}
      {isSupportOpen && <SupportChat onClose={() => setIsSupportOpen(false)} />}

    </div>
  );
};
