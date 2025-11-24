
import React, { useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { formatDate } from '../../utils/formatters';

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.002 6.002 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.002 6.002 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.002 6.002 0 01-5.322 4.118zM9.097 13c-.454 1.147-.748 2.572-.837 4.118A6.002 6.002 0 014.083 13h1.946z" clipRule="evenodd" />
    </svg>
);

const CurrencyDollarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
    </svg>
);

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.572-2.872m2.197-2.197A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-2.17 4.106m-3.656 3.656a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

const Profile: React.FC = () => {
  const { settings, updateSettings, t } = usePortfolio();
  const { currentUser, logout, isPremium } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showSecurityCode, setShowSecurityCode] = useState(false);

  const premium = currentUser ? isPremium(currentUser) : false;

  const handleLogout = () => {
      logout();
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-brand-text">{t('myProfile')}</h1>
            <p className="text-brand-secondary mt-1">{t('profileSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
            {/* Botão SAIR */}
            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-brand-danger hover:bg-brand-danger/10 px-4 py-2 rounded-lg transition-colors"
            >
                <LogoutIcon />
                <span className="hidden md:inline">Sair</span>
            </button>
        </div>
      </div>

      {/* Identity Card */}
      <Card className="overflow-hidden p-0 border-brand-border relative group">
        {/* Banner Gradient */}
        <div className="h-32 bg-gradient-to-r from-brand-primary/20 via-brand-surface to-brand-bg relative">
             <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]"></div>
             
             {/* Botão de Edição (Lápis) - No banner do cartão */}
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="absolute top-4 right-4 p-2 bg-brand-bg/50 hover:bg-brand-text hover:text-brand-bg backdrop-blur-md border border-brand-border/50 rounded-full text-brand-secondary transition-all duration-200 shadow-lg" 
                title="Editar Perfil"
             >
                 <PencilIcon />
             </button>
        </div>
        
        <CardContent className="relative pt-0 pb-8 px-6 md:px-8">
           <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 gap-4">
                {/* Avatar */}
                <div className="relative">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=58A6FF&color=fff&size=256`}
                        alt="Profile" 
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-brand-surface shadow-xl bg-brand-surface object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-brand-success w-5 h-5 rounded-full border-2 border-brand-surface" title={t('online')}></div>
                </div>
                
                {/* Name & Handle & Badges (Organized Layout) */}
                <div className="flex-1 text-center md:text-left mb-2">
                    {isEditing ? (
                        <div className="bg-brand-bg/50 p-2 rounded border border-brand-border border-dashed">
                            <p className="text-sm text-brand-secondary italic">Edição de perfil em breve...</p>
                        </div>
                    ) : (
                        <>
                            {/* Nome */}
                            <h2 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">{currentUser.name}</h2>
                            
                            {/* Usuário */}
                            <p className="text-brand-primary font-medium text-base mb-3 block">{currentUser.username}</p>
                            
                            {/* Emblemas (Badges) organizados abaixo */}
                            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                {premium ? (
                                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold uppercase rounded-full border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)] backdrop-blur-sm">
                                        Premium
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary text-xs font-bold uppercase rounded-full border border-brand-secondary/30 backdrop-blur-sm">
                                        Free Plan
                                    </span>
                                )}
                                {currentUser.isAdmin && (
                                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold uppercase rounded-full border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)] backdrop-blur-sm">
                                        Admin
                                    </span>
                                )}
                            </div>
                            
                            {/* Expiração da assinatura (se houver) */}
                            {premium && currentUser.subscriptionExpiresAt && (
                                <p className="text-[10px] text-brand-secondary mt-2 opacity-70">
                                    Válido até {formatDate(currentUser.subscriptionExpiresAt)}
                                </p>
                            )}
                        </>
                    )}
                </div>
           </div>
           
           {/* Código de Segurança */}
           <div className="mt-6 pt-4 border-t border-brand-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
               <div className="flex flex-col sm:items-start items-center">
                   <span className="text-[10px] uppercase tracking-widest font-bold text-brand-secondary">Código de Segurança (Único)</span>
                   <span className="text-xs text-brand-secondary/60">Use este código para atendimento no suporte.</span>
               </div>
               
               <div className="flex items-center bg-brand-bg/50 border border-brand-border rounded-lg overflow-hidden">
                   <div className={`px-4 py-2 font-mono font-bold tracking-widest transition-all duration-300 ${showSecurityCode ? 'text-brand-primary' : 'text-transparent blur-[6px] select-none'}`}>
                       {currentUser.securityCode || '------'}
                   </div>
                   <button 
                        onClick={() => setShowSecurityCode(!showSecurityCode)}
                        className="p-2.5 hover:bg-brand-surface border-l border-brand-border text-brand-secondary hover:text-brand-text transition-colors"
                        title={showSecurityCode ? "Ocultar Código" : "Mostrar Código"}
                   >
                       {showSecurityCode ? <EyeOffIcon /> : <EyeIcon />}
                   </button>
               </div>
           </div>
        </CardContent>
      </Card>

      {/* Preferences / Settings */}
      <Card className="overflow-visible">
          <CardHeader>{t('appPreferences')}</CardHeader>
          <CardContent className="space-y-6">
              
              {/* Currency Selector */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-brand-surface/50 rounded-xl border border-brand-border">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-bg rounded-lg text-brand-success">
                          <CurrencyDollarIcon />
                      </div>
                      <div>
                          <h3 className="font-semibold text-brand-text">{t('displayCurrency')}</h3>
                          <p className="text-xs text-brand-secondary">{t('displayCurrencyDesc')}</p>
                      </div>
                  </div>
                  <div className="relative">
                      <select 
                        value={settings.currency}
                        onChange={(e) => updateSettings({ currency: e.target.value as 'BRL' | 'USD' })}
                        className="appearance-none bg-brand-bg border border-brand-border text-brand-text py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer min-w-[160px]"
                      >
                          <option value="BRL">BRL (R$)</option>
                          <option value="USD">USD ($)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-secondary">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                  </div>
              </div>

              {/* Language Selector */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-brand-surface/50 rounded-xl border border-brand-border">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-bg rounded-lg text-blue-400">
                          <GlobeIcon />
                      </div>
                      <div>
                          <h3 className="font-semibold text-brand-text">{t('language')}</h3>
                          <p className="text-xs text-brand-secondary">{t('languageDesc')}</p>
                      </div>
                  </div>
                  <div className="relative">
                      <select 
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value as 'pt-BR' | 'en-US' })}
                        className="appearance-none bg-brand-bg border border-brand-border text-brand-text py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer min-w-[160px]"
                      >
                          <option value="pt-BR">Português (Brasil)</option>
                          <option value="en-US">English (US)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-secondary">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                  </div>
              </div>

          </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
