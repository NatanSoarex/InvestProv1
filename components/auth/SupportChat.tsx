
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';

interface SupportChatProps {
    onClose: () => void;
}

type Message = {
    id: string;
    text: string;
    sender: 'bot' | 'user';
};

type ChatStep = 'AUTH_FORM' | 'MENU' | 'SECURE_ACTION_VERIFY' | 'PWD_NEW_PASS' | 'EMAIL_NEW_ADDR' | 'FINAL_CHECK' | 'CLOSING' | 'SUGGESTION_INPUT';

export const SupportChat: React.FC<SupportChatProps> = ({ onClose }) => {
    const { verifyUserForSupport, resetPassword, updateEmail, currentUser, addSuggestion } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Para iniciar o atendimento, preciso validar sua identidade.', sender: 'bot' }
    ]);
    const [step, setStep] = useState<ChatStep>('AUTH_FORM');
    
    const [currentAction, setCurrentAction] = useState<'PWD' | 'EMAIL' | null>(null);
    
    const [authForm, setAuthForm] = useState({ username: '', email: '', code: '' });
    const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
    
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Efeito para detectar se o usuário JÁ está logado (uso no Perfil)
    useEffect(() => {
        if (currentUser && step === 'AUTH_FORM') {
            setVerifiedUser(currentUser);
            setStep('MENU');
            setMessages([
                { id: '1', text: `Olá, ${currentUser.name}! Sou o assistente virtual do ProVest. 🤖`, sender: 'bot' },
                { id: '2', text: 'Como posso te ajudar hoje?', sender: 'bot' }
            ]);
        }
    }, [currentUser, step]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, step]);

    const addBotMessage = (text: string, delay = 1000) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'bot' }]);
            setIsTyping(false);
        }, delay);
    };

    const addUserMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user' }]);
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authForm.username || !authForm.email || !authForm.code) return;
        
        setMessages(prev => []); 
        setStep('AUTH_FORM'); 
        setIsTyping(true);

        try {
            const user = await verifyUserForSupport(authForm.username, authForm.email, authForm.code);
            setIsTyping(false);
            
            if (user) {
                setVerifiedUser(user);
                setStep('MENU');
                addBotMessage(`Olá, ${user.name}! Bem-vindo ao Suporte ProVest. 🤖`);
                setTimeout(() => {
                    addBotMessage('Como posso te ajudar hoje?');
                }, 1800);
            } else {
                addBotMessage('Não consegui encontrar um usuário com esses dados. Verifique o Usuário, Email e Código de Segurança e tente novamente.', 500);
            }
        } catch (error) {
            setIsTyping(false);
            addBotMessage('Ocorreu um erro ao verificar. Tente novamente.');
        }
    };

    const handleOptionSelect = (option: 'PWD' | 'EMAIL' | 'SUGGESTION') => {
        if (option === 'PWD') addUserMessage('Trocar Senha');
        if (option === 'EMAIL') addUserMessage('Alterar Email');
        if (option === 'SUGGESTION') addUserMessage('Dar uma Sugestão');
        
        if (option === 'PWD' || option === 'EMAIL') {
            setCurrentAction(option);
            setStep('SECURE_ACTION_VERIFY');
            setTimeout(() => {
                addBotMessage(`Entendido. Para alterações de segurança como ${option === 'PWD' ? 'senha' : 'email'}, preciso que você confirme seu Código de Segurança novamente.`);
                setTimeout(() => {
                    addBotMessage('Por favor, digite seu Código de Segurança.');
                }, 1200);
            }, 1000);
        } else if (option === 'SUGGESTION') {
            setStep('SUGGESTION_INPUT');
            setTimeout(() => {
                addBotMessage('Adoramos ouvir sugestões! 💡');
                setTimeout(() => {
                    addBotMessage('Por favor, digite sua sugestão abaixo para que a nossa equipe possa analisar.');
                }, 1200);
            }, 1000);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        
        const text = userInput;
        setUserInput('');
        addUserMessage(text);

        if (step === 'SECURE_ACTION_VERIFY') {
            if (verifiedUser && text.trim() === verifiedUser.securityCode) {
                addBotMessage('Código confirmado com sucesso! ✅');
                
                setTimeout(() => {
                    if (currentAction === 'PWD') {
                        setStep('PWD_NEW_PASS');
                        addBotMessage('Por favor, digite sua nova senha.');
                    } else if (currentAction === 'EMAIL') {
                        setStep('EMAIL_NEW_ADDR');
                        addBotMessage('Por favor, digite o novo endereço de email.');
                    }
                }, 1500);
            } else {
                addBotMessage('Código incorreto. Por favor, tente novamente.');
            }
        } 
        else if (step === 'PWD_NEW_PASS') {
            if (verifiedUser) {
                setIsTyping(true);
                await resetPassword(verifiedUser.id, text);
                setIsTyping(false);
                addBotMessage('Sua senha foi atualizada com sucesso! 🔐');
                setTimeout(() => {
                    setStep('FINAL_CHECK');
                    addBotMessage('Precisa de mais alguma coisa?');
                }, 1500);
            }
        } 
        else if (step === 'EMAIL_NEW_ADDR') {
            if (verifiedUser) {
                if (!text.includes('@') || !text.includes('.')) {
                    addBotMessage('Este email parece inválido. Tente novamente.');
                    return;
                }

                setIsTyping(true);
                try {
                    await updateEmail(verifiedUser.id, text);
                    setIsTyping(false);
                    addBotMessage('Seu email foi atualizado com sucesso! 📧');
                    setTimeout(() => {
                        setStep('FINAL_CHECK');
                        addBotMessage('Precisa de mais alguma coisa?');
                    }, 1500);
                } catch (err: any) {
                    setIsTyping(false);
                    addBotMessage(`Erro: ${err.message || 'Não foi possível atualizar o email.'}`);
                    setTimeout(() => {
                        addBotMessage('Tente um email diferente ou digite "cancelar" para voltar.');
                        setStep('MENU');
                    }, 2000);
                }
            }
        }
        else if (step === 'SUGGESTION_INPUT') {
            if (verifiedUser) {
                addSuggestion(text, verifiedUser);
                addBotMessage('Muito obrigado! Sua sugestão foi enviada diretamente para a aba administrativa. 🚀');
                setTimeout(() => {
                    setStep('FINAL_CHECK');
                    addBotMessage('Precisa de mais alguma coisa?');
                }, 1500);
            }
        }
        else if (step === 'FINAL_CHECK') {
            const lower = text.toLowerCase();
            if (lower.includes('nao') || lower.includes('não') || lower.includes('obrigado') || lower.includes('valeu') || lower.includes('tchau')) {
                addBotMessage('Perfeito! Sempre que precisar, entre em contato. 👋');
                setStep('CLOSING');
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                addBotMessage('Entendo. Como sou um bot automatizado, minhas funções são limitadas.');
                setTimeout(() => {
                   setStep('MENU');
                   addBotMessage('Voltando ao menu principal...');
                }, 2000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-brand-surface border border-brand-border w-full max-w-md h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="bg-brand-bg p-4 border-b border-brand-border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-success rounded-full border-2 border-brand-bg"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-text">Suporte ProVest</h3>
                            <p className="text-xs text-brand-secondary">Bot Assistente • Online</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-brand-secondary hover:text-brand-text p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 bg-brand-bg/50 p-4 overflow-y-auto space-y-4 scrollbar-hide">
                    {step === 'AUTH_FORM' && messages.length === 1 ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex-shrink-0 flex items-center justify-center text-sm">🤖</div>
                                <div className="bg-brand-surface border border-brand-border rounded-r-xl rounded-bl-xl p-3 text-sm text-brand-text max-w-[85%] shadow-sm">
                                    {messages[0].text}
                                </div>
                            </div>
                            <form onSubmit={handleAuthSubmit} className="bg-brand-surface p-4 rounded-xl border border-brand-border shadow-lg space-y-3">
                                <div>
                                    <label className="text-xs text-brand-secondary uppercase font-bold">Usuário</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={authForm.username}
                                        onChange={e => setAuthForm({...authForm, username: e.target.value})}
                                        className="w-full bg-brand-bg border border-brand-border rounded p-2 text-sm text-brand-text mt-1 focus:border-brand-primary outline-none"
                                        placeholder="@usuario"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-brand-secondary uppercase font-bold">Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={authForm.email}
                                        onChange={e => setAuthForm({...authForm, email: e.target.value})}
                                        className="w-full bg-brand-bg border border-brand-border rounded p-2 text-sm text-brand-text mt-1 focus:border-brand-primary outline-none"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-brand-secondary uppercase font-bold">Código de Segurança</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={authForm.code}
                                        onChange={e => setAuthForm({...authForm, code: e.target.value})}
                                        className="w-full bg-brand-bg border border-brand-border rounded p-2 text-sm text-brand-text mt-1 focus:border-brand-primary outline-none"
                                        placeholder="6 dígitos"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                                    Iniciar Atendimento
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                    {msg.sender === 'bot' && (
                                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex-shrink-0 flex items-center justify-center text-sm">🤖</div>
                                    )}
                                    <div className={`max-w-[80%] p-3 text-sm rounded-xl shadow-sm ${
                                        msg.sender === 'user' 
                                        ? 'bg-brand-primary text-white rounded-tr-none' 
                                        : 'bg-brand-surface border border-brand-border text-brand-text rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex-shrink-0 flex items-center justify-center text-sm">🤖</div>
                                    <div className="bg-brand-surface border border-brand-border rounded-r-xl rounded-bl-xl p-3 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce delay-75"></span>
                                        <span className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce delay-150"></span>
                                    </div>
                                </div>
                            )}
                            
                            {!isTyping && step === 'MENU' && (
                                <div className="flex flex-col gap-2 pl-11 animate-in fade-in">
                                    <button onClick={() => handleOptionSelect('PWD')} className="text-left p-3 bg-brand-surface hover:bg-brand-primary/10 border border-brand-primary/30 hover:border-brand-primary text-brand-primary rounded-lg text-sm transition-colors flex items-center gap-2">
                                        🔐 Trocar Senha
                                    </button>
                                    <button onClick={() => handleOptionSelect('EMAIL')} className="text-left p-3 bg-brand-surface hover:bg-brand-primary/10 border border-brand-primary/30 hover:border-brand-primary text-brand-primary rounded-lg text-sm transition-colors flex items-center gap-2">
                                        📧 Alterar Email
                                    </button>
                                     <button onClick={() => handleOptionSelect('SUGGESTION')} className="text-left p-3 bg-brand-surface hover:bg-yellow-500/10 border border-brand-border hover:border-yellow-500 text-brand-text hover:text-yellow-500 rounded-lg text-sm transition-colors flex items-center gap-2">
                                        💡 Dar uma Sugestão
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {step !== 'AUTH_FORM' && step !== 'MENU' && step !== 'CLOSING' && (
                    <div className="p-4 bg-brand-surface border-t border-brand-border">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input 
                                type={step === 'PWD_NEW_PASS' || step === 'SECURE_ACTION_VERIFY' ? 'password' : 'text'}
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                placeholder={
                                    step === 'PWD_NEW_PASS' ? "Nova senha..." : 
                                    step === 'SECURE_ACTION_VERIFY' ? "Código de segurança..." : 
                                    step === 'EMAIL_NEW_ADDR' ? "Novo email..." :
                                    step === 'SUGGESTION_INPUT' ? "Digite sua sugestão..." :
                                    "Digite sua mensagem..."
                                }
                                className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                autoFocus
                            />
                            <button 
                                type="submit" 
                                disabled={!userInput.trim() || isTyping}
                                className="p-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
