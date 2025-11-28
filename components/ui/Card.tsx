import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  // Premium Glassmorphism
  // High blur, subtle border, distinct separation from background
  const baseClasses = 'bg-[#151B28]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-xl transition-all duration-300';
  const clickableClasses = onClick ? 'cursor-pointer hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-neon' : '';
  
  return (
    <div className={`${baseClasses} ${className} ${clickableClasses}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={`text-lg font-bold text-brand-text mb-4 pb-3 border-b border-white/[0.08] tracking-tight flex items-center gap-2 ${className}`}>
        {children}
    </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={className}>
        {children}
    </div>
);