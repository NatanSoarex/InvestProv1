
import React, { useState } from 'react';
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
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { currentUser } = useAuth();

  if (!currentUser) {
      return <AuthScreen />;
  }

  return (
    // Reset Portfolio Context when user changes by using Key
    <PortfolioProvider key={currentUser.id}>
      <div className="flex min-h-screen font-sans">
        <Sidebar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onOpenSupport={() => setIsSupportOpen(true)}
        />
        {/* Adjusted padding to md:p-6 to minimize left gap as requested */}
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
      
      {/* Global Support Chat Modal */}
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
