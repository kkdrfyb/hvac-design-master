import React from 'react';
import { MandatoryClause } from '../types';

interface RegulationsViewProps {
  clauseSearch: string;
  displayCount: number;
  displayedClauses: MandatoryClause[];
  knowledgeError?: string;
  isAdmin: boolean;
  onClauseSearchChange: (value: string) => void;
  onDisplayCountChange: (value: number) => void;
  onRefresh: () => void;
  onCreateClause: (payload: Omit<MandatoryClause, 'id'>) => Promise<void>;
  onDeleteClause: (id: string) => Promise<void>;
}

const RegulationsView: React.FC<RegulationsViewProps> = ({
  clauseSearch,
  displayCount,
  displayedClauses,
  knowledgeError,
  isAdmin,
  onClauseSearchChange,
  onDisplayCountChange,
  onRefresh,
  onCreateClause,
  onDeleteClause,
}) => {
  const [draftCode, setDraftCode] = React.useState('');
  const [draftClauseNumber, setDraftClauseNumber] = React.useState('');
  const [draftContent, setDraftContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">规范条文</h2>
        </div>
        {knowledgeError && <div className="text-xs text-red-600">{knowledgeError}</div>}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索条文..."
              className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={clauseSearch}
              onChange={e => onClauseSearchChange(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 whitespace-nowrap">显示:</span>
            <select
              className="border rounded px-3 py-2 text-sm bg-white cursor-pointer hover:border-blue-400 focus:outline-none"
              value={displayCount}
              onChange={e => onDisplayCountChange(Number(e.target.value))}
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2">
            <input
              value={draftCode}
              onChange={e => setDraftCode(e.target.value)}
              placeholder="规范编号"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white"
            />
            <input
              value={draftClauseNumber}
              onChange={e => setDraftClauseNumber(e.target.value)}
              placeholder="条文号"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white"
            />
            <input
              value={draftContent}
              onChange={e => setDraftContent(e.target.value)}
              placeholder="条文内容"
              className="border border-slate-200 rounded px-3 py-2 text-xs bg-white md:col-span-2"
            />
            <button
              disabled={saving}
              onClick={async () => {
                if (!(draftCode && draftClauseNumber && draftContent)) return;
                setSaving(true);
                try {
                  await onCreateClause({ code: draftCode, clauseNumber: draftClauseNumber, content: draftContent });
                  setDraftCode('');
                  setDraftClauseNumber('');
                  setDraftContent('');
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-slate-800 text-white rounded px-3 py-2 text-xs"
            >
              新增条文
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedClauses.map(clause => (
            <div key={clause.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500 hover:shadow-lg transition transform hover:-translate-y-1">
              <div className="flex justify-between items-baseline mb-3">
                <span className="font-bold text-red-700 text-lg">{clause.code}</span>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-mono">条文 {clause.clauseNumber}</span>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">{clause.content}</p>
              {isAdmin && (
                <button
                  onClick={() => onDeleteClause(clause.id)}
                  className="mt-3 text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
        {displayedClauses.length === 0 && <div className="text-center py-20 text-slate-400">未找到相关条文</div>}
      </div>
    </div>
  );
};

export default RegulationsView;
