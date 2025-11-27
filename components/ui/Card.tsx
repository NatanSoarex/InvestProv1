import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  // Cleaner Glassmorphism
  // Less blur, clearer background for better readability
  const baseClasses = 'bg-brand-surface/70 backdrop-blur-md border border-white/5 rounded-2xl p-5 md:p-6 shadow-xl transition-all duration-300';
  const clickableClasses = onClick ? 'cursor-pointer hover:border-brand-primary/30 hover:-translate-y-1' : '';
  
  return (
    <div className={`${baseClasses} ${className} ${clickableClasses}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={`text-lg font-bold text-brand-text mb-4 pb-3 border-b border-white/5 tracking-tight flex items-center gap-2 ${className}`}>
        {children}
    </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={className}>
        {children}
    </div>
);