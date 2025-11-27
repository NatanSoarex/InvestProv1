import React from 'react';
import { View } from '../../App';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { isSupabaseConfigured } from '../../services/supabase';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onOpenSupport: () => void;
}

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  view?: View;
  currentView: View;
  onClick: () => void;
}> = ({ icon, label, view, currentView, onClick }) => {
  const isActive = view ? currentView === view : false;
  return (
    <button
      onClick={onClick}
      className={`group flex items-center w-full px-4 py-3.5 text-sm font-medium rounded-r-full transition-all duration-500 mb-2 relative overflow-hidden ${
        isActive
          ? 'text-white bg-gradient-to-r from-brand-primary/20 to-transparent'
          : 'text-brand-secondary hover:text-white hover:bg-white/5'
      }`}
    >
      {/* Active Indicator (Neon Glow) */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 bg-brand-primary shadow-[0_0_15px_rgba(0,229,255,0.8)] transition-all duration-300 rounded-r-full ${isActive ? 'opacity-100 h-full' : 'opacity-0 h-0'}`}></span>

      <span className={`w-6 h-6 mr-3 transition-transform duration-300 ${isActive ? 'text-brand-primary scale-110 drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'group-hover:text-brand-text group-hover:scale-105'}`}>{icon}</span>
      <span className={`hidden md:inline relative z-10 tracking-wide ${isActive ? 'font-bold' : ''}`}>{label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onOpenSupport }) => {
  const { t } = usePortfolio();

  return (
    <nav className="hidden md:flex flex-col w-72 h-screen bg-transparent border-r border-white/5 sticky top-0 py-8 pr-6 backdrop-blur-sm">
      <div className="flex items-center mb-10 px-6">
        <div className="relative group cursor-default">
             <div className="absolute -inset-2 bg-brand-primary rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-primary relative z-10 drop-shadow-neon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
        </div>
        <div className="ml-4">
            <h1 className="hidden md:inline text-2xl font-black text-white tracking-tight">ProVest</h1>
            <p className="text-[10px] text-brand-primary font-mono tracking-widest uppercase opacity-70">Intelligent Wealth</p>
        </div>
      </div>

      <div className="space-y-1">
        <NavItem
            icon={<ChartPieIcon />}
            label={t('dashboard')}
            view="dashboard"
            currentView={currentView}
            onClick={() => setCurrentView('dashboard')}
        />
        <NavItem
            icon={<BriefcaseIcon />}
            label={t('portfolio')}
            view="portfolio"
            currentView={currentView}
            onClick={() => setCurrentView('portfolio')}
        />
        <NavItem
            icon={<SearchIcon />}
            label={t('search')}
            view="search"
            currentView={currentView}
            onClick={() => setCurrentView('search')}
        />
        <NavItem
            icon={<StarIcon />}
            label={t('watchlist')}
            view="watchlist"
            currentView={currentView}
            onClick={() => setCurrentView('watchlist')}
        />
        <NavItem
            icon={<DocumentReportIcon />}
            label={t('reports')}
            view="reports"
            currentView={currentView}
            onClick={() => setCurrentView('reports')}
        />
        <NavItem
            icon={<TrendingUpIcon />}
            label={t('projections')}
            view="projections"
            currentView={currentView}
            onClick={() => setCurrentView('projections')}
        />
      </div>

      <div className="mt-auto pt-6 border-t border-white/10 mx-4 space-y-1">
        <NavItem
          icon={<ChatIcon />}
          label="Suporte"
          currentView={currentView}
          onClick={onOpenSupport}
        />
        <NavItem
          icon={<UserIcon />}
          label={t('profile')}
          view="profile"
          currentView={currentView}
          onClick={() => setCurrentView('profile')}
        />
      </div>

      <div className="mt-8 px-6 text-[10px] text-center font-mono flex flex-col gap-2">
         <div className={`flex items-center justify-center gap-2 py-1.5 rounded-full border border-white/5 transition-all ${isSupabaseConfigured ? 'bg-brand-success/10 border-brand-success/20' : 'bg-brand-surface'}`}>
             <span className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'bg-brand-success shadow-[0_0_5px_#00FFA3] animate-pulse' : 'bg-brand-secondary'}`}></span>
             <span className={`${isSupabaseConfigured ? 'text-brand-success' : 'text-brand-secondary'} font-bold tracking-wider`}>
                 {isSupabaseConfigured ? 'CLOUD SYNC' : 'LOCAL MODE'}
             </span>
         </div>
         <p className="text-brand-secondary opacity-30">v5.0.0 // FUTURISTIC</p>
      </div>
    </nav>
  );
};

// Export Icons
export const ChartPieIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
  </svg>
);
export const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4.75A2.75 2.75 0 0013.25 2h-2.5A2.75 2.75 0 008 4.75V6M4 10h16v10H4V10z" />
  </svg>
);
export const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);
export const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);
export const DocumentReportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
export const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.976 5.197m-3.976-5.197L6 21" />
  </svg>
);
export const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);