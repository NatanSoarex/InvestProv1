
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const baseClasses = 'bg-brand-surface border border-brand-border rounded-lg p-4 md:p-6 shadow-lg';
  const clickableClasses = onClick ? 'cursor-pointer hover:border-brand-primary transition-colors duration-200' : '';
  
  return (
    <div className={`${baseClasses} ${className} ${clickableClasses}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={`text-lg font-semibold text-brand-text mb-4 pb-3 border-b border-brand-border ${className}`}>
        {children}
    </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className='' }) => (
    <div className={className}>
        {children}
    </div>
);
