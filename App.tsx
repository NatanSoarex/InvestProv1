
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { AuthScreen } from './components/auth/AuthScreen';
import { SupportChat } from './components/auth/SupportChat';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const Portfolio = React.lazy(() => import('./components/portfolio/Portfolio'));
const Search = React.lazy(() => import('./components/search/Search'));
const Watchlist = React.lazy(() => import('./components/watchlist/Watchlist'));
const Reports = React.lazy(() => import('./components/reports/Reports'));
const Projections = React.lazy(() => import('./components/projections/Projections'));
const Profile = React.lazy(() => import('./components/profile/Profile'));

export type View = 'dashboard' | 'portfolio' | 'search' | 'watchlist' | 'reports' | 'projections' | 'profile';

const AuthenticatedApp: React.FC = () => {
  // FIX: Initialize view from localStorage to persist state on F5 refresh
  const [currentView, setCurrentView] = useState<View>(() => {
      const savedView = localStorage.getItem('provest_last_view');
      return (savedView as View) || 'dashboard';
  });
  
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { currentUser, isLoading } = useAuth();

  // FIX: Save current view to localStorage whenever it changes
  useEffect(() => {
      if (currentView) {
          localStorage.setItem('provest_last_view', currentView);
      }
  }, [currentView]);

  // Loading Spinner to prevent flicker or logout
  if (isLoading) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-brand-bg">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
                  <p className="text-brand-secondary text-sm animate-pulse">Carregando ProVest...</p>
              </div>
          </div>
      );
  }

  if (!currentUser) {
      return <AuthScreen />;
  }

  return (
    <PortfolioProvider key={currentUser.id}>
      <div className="flex min-h-screen font-sans">
        <Sidebar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onOpenSupport={() => setIsSupportOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-32 md:pb-8">
           <React.Suspense fallback={<div className="flex items-center justify-center h-full text-brand-primary">Carregando...</div>}>
             {currentView === 'dashboard' && <Dashboard />}
             {currentView === 'portfolio' && <Portfolio />}
             {currentView === 'search' && <Search />}
             {currentView === 'watchlist' && <Watchlist />}
             {currentView === 'reports' && <Reports />}
             {currentView === 'projections' && <Projections />}
             {currentView === 'profile' && <Profile />}
           </React.Suspense>
        </main>
        <BottomNavBar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onOpenSupport={() => setIsSupportOpen(true)}
        />
      </div>
      
      {isSupportOpen && <SupportChat onClose={() => setIsSupportOpen(false)} />}
    </PortfolioProvider>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
