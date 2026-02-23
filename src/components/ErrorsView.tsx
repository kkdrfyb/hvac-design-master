import React from 'react';
import { CommonError } from '../types';

interface ErrorsViewProps {
  errorSearch: string;
  errorDisplayCount: number;
  displayedErrors: CommonError[];
  knowledgeError?: string;
  isAdmin: boolean;
  onErrorSearchChange: (value: string) => void;
  onErrorDisplayCountChange: (value: number) => void;
  onRefresh: () => void;
  onCreateError: (payload: Omit<CommonError, 'id'>) => Promise<void>;
  onDeleteError: (id: string) => Promise<void>;
}

const ErrorsView: React.FC<ErrorsViewProps> = ({
  errorSearch,
  errorDisplayCount,
  displayedErrors,
  knowledgeError,
  isAdmin,
  onErrorSearchChange,
  onErrorDisplayCountChange,
  onRefresh,
  onCreateError,
  onDeleteError,
}) => {
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftCategory, setDraftCategory] = React.useState('');
  const [draftDescription, setDraftDescription] = React.useState('');
  const [draftSolution, setDraftSolution] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">设计常见问题</h2>
        </div>
        {knowledgeError && <div className="text-xs text-red-600">{knowledgeError}</div>}
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
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 pt-2">
            <input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder="问题标题"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white"
            />
            <input
              value={draftCategory}
              onChange={e => setDraftCategory(e.target.value)}
              placeholder="分类"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white"
            />
            <input
              value={draftDescription}
              onChange={e => setDraftDescription(e.target.value)}
              placeholder="问题描述"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white md:col-span-2"
            />
            <input
              value={draftSolution}
              onChange={e => setDraftSolution(e.target.value)}
              placeholder="解决方案"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white md:col-span-2"
            />
            <button
              disabled={saving}
              onClick={async () => {
                if (!(draftTitle && draftCategory && draftDescription && draftSolution)) return;
                setSaving(true);
                try {
                  await onCreateError({
                    title: draftTitle,
                    category: draftCategory,
                    description: draftDescription,
                    solution: draftSolution,
                  });
                  setDraftTitle('');
                  setDraftCategory('');
                  setDraftDescription('');
                  setDraftSolution('');
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-slate-800 text-white rounded px-3 py-2 text-xs"
            >
              新增问题
            </button>
          </div>
        )}
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
              {isAdmin && (
                <button onClick={() => onDeleteError(err.id)} className="mt-3 text-xs text-red-500 hover:underline self-start">
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
        {displayedErrors.length === 0 && <div className="text-center py-20 text-slate-400">未找到相关预警</div>}
      </div>
    </div>
  );
};

export default ErrorsView;
