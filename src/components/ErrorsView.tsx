import React from 'react';
import { CommonError } from '../types';

interface ErrorsViewProps {
  errorSearch: string;
  errorDisplayCount: number;
  displayedErrors: CommonError[];
  onErrorSearchChange: (value: string) => void;
  onErrorDisplayCountChange: (value: number) => void;
  onRefresh: () => void;
}

const ErrorsView: React.FC<ErrorsViewProps> = ({
  errorSearch,
  errorDisplayCount,
  displayedErrors,
  onErrorSearchChange,
  onErrorDisplayCountChange,
  onRefresh,
}) => {
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">设计常见问题</h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索错误案例..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={errorSearch}
              onChange={e => onErrorSearchChange(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">显示:</span>
            <select
              className="border rounded px-3 py-2 text-sm bg-white cursor-pointer hover:border-blue-400 focus:outline-none"
              value={errorDisplayCount}
              onChange={e => onErrorDisplayCountChange(Number(e.target.value))}
            >
              <option value={4}>4 条/页</option>
              <option value={8}>8 条/页</option>
              <option value={12}>12 条/页</option>
              <option value={100}>全部</option>
            </select>
          </div>
          <button onClick={onRefresh} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            随机刷新
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedErrors.map(err => (
            <div key={err.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:border-orange-300 hover:shadow-lg transition duration-300 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="font-bold text-lg text-slate-800">{err.title}</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{err.category}</span>
              </div>
              <p className="text-slate-600 mb-4 text-sm flex-1 leading-relaxed">{err.description}</p>
              <div className="bg-emerald-50 p-4 rounded text-sm text-emerald-800 border border-emerald-100">
                <span className="font-bold block mb-1">✅ 解决方案:</span> {err.solution}
              </div>
            </div>
          ))}
        </div>
        {displayedErrors.length === 0 && <div className="text-center py-20 text-slate-400">未找到相关预警</div>}
      </div>
    </div>
  );
};

export default ErrorsView;
