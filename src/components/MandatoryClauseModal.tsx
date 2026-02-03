import React from 'react';
import { MandatoryClause } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clauses?: MandatoryClause[]; // Optional because on initial render it might be empty
}

const MandatoryClauseModal: React.FC<Props> = ({ isOpen, onClose, clauses = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-red-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-red-800">每日强制性条文温习</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <p className="mb-4 text-slate-600">在开始设计工作前，请务必复核以下常用的强制性规范条文：</p>
          <div className="space-y-4">
            {clauses.map((clause) => (
              <div key={clause.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-md">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-bold text-red-700 text-sm">{clause.code}</span>
                  <span className="text-xs font-mono text-red-600 bg-white px-2 py-0.5 rounded border border-red-200">条文 {clause.clauseNumber}</span>
                </div>
                <p className="text-slate-800 font-medium">{clause.content}</p>
              </div>
            ))}
            {clauses.length === 0 && <p>条文加载中...</p>}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition shadow-md"
          >
            我已阅读并知晓
          </button>
        </div>
      </div>
    </div>
  );
};

export default MandatoryClauseModal;