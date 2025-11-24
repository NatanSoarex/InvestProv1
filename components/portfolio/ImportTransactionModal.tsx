
import React, { useState } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Transaction } from '../../types';

interface ImportTransactionModalProps {
  onClose: () => void;
}

export const ImportTransactionModal: React.FC<ImportTransactionModalProps> = ({ onClose }) => {
  const { importTransactions, t } = usePortfolio();
  const [csvContent, setCsvContent] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Omit<Transaction, 'id'>[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvContent(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (content: string) => {
    try {
      const lines = content.trim().split('\n');
      const parsed: Omit<Transaction, 'id'>[] = [];
      let hasHeader = false;

      lines.forEach((line, index) => {
        // Skip empty lines
        if (!line.trim()) return;

        // Basic CSV parsing logic (assuming comma separated)
        // Expected Format: Ticker, Quantity, TotalCost, Date (YYYY-MM-DD)
        const parts = line.split(',').map(p => p.trim());
        
        // Skip header if detected (simple check)
        if (index === 0 && (parts[0].toLowerCase() === 'ticker' || parts[0].toLowerCase() === 'ativo')) {
            hasHeader = true;
            return;
        }

        if (parts.length < 3) return;

        const ticker = parts[0];
        const qty = parseFloat(parts[1]);
        const total = parseFloat(parts[2]);
        const dateStr = parts[3] || new Date().toISOString().split('T')[0];
        const timeStr = parts[4] || "12:00";

        if (!ticker || isNaN(qty) || isNaN(total)) return;

        const price = total / qty;

        parsed.push({
            ticker,
            quantity: qty,
            totalCost: total,
            price: price,
            dateTime: new Date(`${dateStr}T${timeStr}`).toISOString(),
        });
      });

      if (parsed.length === 0) {
          setError("Nenhuma transação válida encontrada. Verifique o formato.");
      } else {
          setError('');
          setPreview(parsed);
      }
    } catch (err) {
        setError("Erro ao ler arquivo. Verifique a formatação.");
    }
  };

  const handleImport = () => {
      if (preview.length > 0) {
          importTransactions(preview);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-brand-surface rounded-xl p-6 w-full max-w-lg border border-brand-border shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-text">{t('importTransactions')}</h2>
          <button onClick={onClose} className="text-brand-secondary hover:text-brand-text text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
            <div className="bg-brand-bg p-4 rounded-lg border border-brand-border border-dashed text-center">
                <input 
                    type="file" 
                    accept=".csv,.txt" 
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-brand-text font-medium">{t('selectFile')} (CSV)</span>
                    <span className="text-xs text-brand-secondary">Formato: Ticker, Qtd, Custo Total, Data (AAAA-MM-DD)</span>
                </label>
            </div>

            {error && <p className="text-brand-danger text-sm text-center">{error}</p>}

            {preview.length > 0 && (
                <div className="max-h-60 overflow-y-auto bg-brand-bg/50 rounded-lg p-2 border border-brand-border">
                    <p className="text-xs text-brand-secondary uppercase font-bold mb-2 px-2">{preview.length} Transações Encontradas</p>
                    {preview.map((t, idx) => (
                        <div key={idx} className="flex justify-between text-sm px-2 py-1 border-b border-brand-border/30 last:border-0">
                            <span className="font-bold w-16">{t.ticker}</span>
                            <span className="text-brand-secondary">{t.quantity} un</span>
                            <span className="text-brand-success font-mono">R$ {t.totalCost}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-brand-secondary hover:text-brand-text">{t('cancel')}</button>
                <button 
                    onClick={handleImport}
                    disabled={preview.length === 0}
                    className="bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-bold"
                >
                    {t('confirmImport')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
