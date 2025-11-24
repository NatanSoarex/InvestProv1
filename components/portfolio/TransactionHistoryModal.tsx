import React from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Holding } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface TransactionHistoryModalProps {
  holding: Holding;
  onClose: () => void;
}

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ holding, onClose }) => {
  const { transactions, removeTransaction, t } = usePortfolio();
  // Fix logic: BRL only if Brazil, else USD
  const currency = holding.asset.country === 'Brazil' ? 'BRL' : 'USD';

  // Get live transactions for this holding to ensure list updates immediately upon deletion
  const assetTransactions = transactions
    .filter(t => t.ticker === holding.asset.ticker)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const handleDelete = (id: string) => {
      // Immediate deletion as requested
      removeTransaction(id);
      if (assetTransactions.length === 1) {
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-brand-surface rounded-lg p-6 md:p-8 w-full max-w-2xl m-4 border border-brand-border max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-brand-text">{t('transactionHistory')}</h2>
            <p className="text-brand-secondary">{holding.asset.ticker} - {holding.asset.name}</p>
          </div>
          <button onClick={onClose} className="text-brand-secondary hover:text-brand-text text-3xl font-light">&times;</button>
        </div>
        
        <div className="overflow-y-auto">
            {assetTransactions.length > 0 ? (
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-brand-secondary uppercase sticky top-0 bg-brand-surface z-10">
                    <tr className="border-b border-brand-border">
                        <th className="p-3 font-semibold">{t('date')}</th>
                        <th className="p-3 font-semibold text-right">{t('quantity')}</th>
                        <th className="p-3 font-semibold text-right">{t('unitPrice')}</th>
                        <th className="p-3 font-semibold text-right">{t('totalCost')}</th>
                        <th className="p-3 font-semibold text-center">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50">
                    {assetTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-brand-bg/50 transition-colors">
                            <td className="p-3">{formatDate(transaction.dateTime)}</td>
                            <td className="p-3 text-right font-medium">{transaction.quantity.toLocaleString()}</td>
                            <td className="p-3 text-right text-brand-secondary">{formatCurrency(transaction.price, currency)}</td>
                            <td className="p-3 text-right font-medium text-brand-text">{formatCurrency(transaction.totalCost, currency)}</td>
                            <td className="p-3 text-center">
                                <button 
                                    onClick={() => handleDelete(transaction.id)}
                                    className="text-brand-secondary hover:text-brand-danger p-1.5 rounded-full hover:bg-brand-danger/10 transition-all"
                                    title={t('deleteAsset')}
                                >
                                    <TrashIcon />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            ) : (
                <div className="text-center py-12 text-brand-secondary">
                    <p>{t('noTransactions')}</p>
                </div>
            )}
        </div>

        <div className="flex justify-end pt-6 mt-auto flex-shrink-0 border-t border-brand-border">
            <button type="button" onClick={onClose} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-brand-primary/20">{t('close')}</button>
        </div>
      </div>
    </div>
  );
};