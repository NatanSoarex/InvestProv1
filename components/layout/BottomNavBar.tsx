
import React, { useState } from 'react';
import { View } from '../../App';
import { ChartPieIcon, BriefcaseIcon, SearchIcon, StarIcon, UserIcon, DocumentReportIcon, TrendingUpIcon } from './Sidebar';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface BottomNavBarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onOpenSupport: () => void;
}

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const DockItem: React.FC<{
  icon: React.ReactNode;
  view?: View;
  isActive: boolean;
  onClick: () => void;
  isSpecial?: boolean;
}> = ({ icon, isActive, onClick, isSpecial }) => {
  return (
    <button
      onClick={onClick}
      className={`relative group flex items-center justify-center transition-all duration-300 ${
        isSpecial 
        ? 'w-12 h-12 -mt-6 bg-brand-primary text-white rounded-full shadow-lg shadow-brand-primary/40 border-4 border-brand-bg hover:scale-110 hover:shadow-brand-primary/60' 
        : 'w-10 h-10 rounded-xl hover:bg-white/5'
      } ${isActive && !isSpecial ? 'text-brand-primary scale-110' : 'text-brand-secondary'}`}
    >
      {/* Active Indicator Dot for non-special items */}
      {isActive && !isSpecial && (
         <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(88,166,255,0.8)]"></span>
      )}
      
      <span className={`${isSpecial ? 'w-6 h-6' : 'w-6 h-6'}`}>
        {icon}
      </span>
    </button>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, setCurrentView, onOpenSupport }) => {
  const { t } = usePortfolio();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (view: View) => {
      setCurrentView(view);
      setIsMenuOpen(false);
  };

  return (
    <>
      {/* Menu Overlay (Glass Card) */}
      {isMenuOpen && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
            <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 origin-bottom-right">
                <div className="bg-[#161B22]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl min-w-[180px] flex flex-col gap-1">
                    <button onClick={() => handleNav('reports')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'reports' ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text hover:bg-white/5'}`}>
                        <span className="w-5 h-5"><DocumentReportIcon /></span>
                        <span className="font-medium text-sm">{t('reports')}</span>
                    </button>
                    <button onClick={() => handleNav('projections')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'projections' ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text hover:bg-white/5'}`}>
                        <span className="w-5 h-5"><TrendingUpIcon /></span>
                        <span className="font-medium text-sm">{t('projections')}</span>
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                    <button onClick={() => { onOpenSupport(); setIsMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-brand-text hover:bg-white/5`}>
                        <span className="w-5 h-5"><ChatIcon /></span>
                        <span className="font-medium text-sm">Suporte Online</span>
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                    <button onClick={() => handleNav('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'profile' ? 'bg-brand-primary/20 text-brand-primary' : 'text-brand-text hover:bg-white/5'}`}>
                        <span className="w-5 h-5"><UserIcon /></span>
                        <span className="font-medium text-sm">{t('profile')}</span>
                    </button>
                </div>
            </div>
        </>
      )}

      {/* Floating Glass Dock */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
        <div className="bg-[#0D1117]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl px-6 h-16 flex items-center justify-between relative">
            
            <DockItem 
                icon={<ChartPieIcon />} 
                isActive={currentView === 'dashboard'} 
                onClick={() => handleNav('dashboard')} 
            />
            
            <DockItem 
                icon={<BriefcaseIcon />} 
                isActive={currentView === 'portfolio'} 
                onClick={() => handleNav('portfolio')} 
            />

            {/* Central Prominent Search Button */}
            <DockItem 
                icon={<SearchIcon />} 
                isActive={currentView === 'search'} 
                onClick={() => handleNav('search')} 
                isSpecial={true}
            />

            <DockItem 
                icon={<StarIcon />} 
                isActive={currentView === 'watchlist'} 
                onClick={() => handleNav('watchlist')} 
            />

            {/* Menu Toggle (3 dots) */}
            <DockItem 
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                }
                isActive={isMenuOpen || ['reports', 'projections', 'profile'].includes(currentView)} 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
            />

        </div>
      </div>
    </>
  );
};
