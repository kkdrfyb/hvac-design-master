import React, { useMemo, useState } from 'react';
import { OperationLog } from '../../types';

interface DesignProcessViewProps {
  logs: OperationLog[];
  actorName: string;
  onAddNote: (content: string) => void;
}

const DesignProcessView: React.FC<DesignProcessViewProps> = ({ logs, actorName, onAddNote }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const orderedLogs = useMemo(() => {
    return [...logs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">设计过程备注</h3>
            <p className="text-xs text-slate-500 mt-1">记录关键设计过程与说明，作为阶段追溯依据。</p>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">记录人: {actorName}</span>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="输入设计说明或关键过程记录（不超过 500 字）"
          className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              const trimmed = note.trim();
              if (!trimmed) {
                setError('请输入备注内容');
                return;
              }
              if (trimmed.length > 500) {
                setError('备注内容不能超过 500 字');
                return;
              }
              setError('');
              onAddNote(trimmed);
              setNote('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            添加备注
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">设计过程时间线</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            共 {orderedLogs.length} 条
          </span>
        </div>

        {orderedLogs.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
            暂无设计过程记录，添加备注后将显示在此处。
          </div>
        ) : (
          <div className="space-y-3">
            {orderedLogs.map(log => (
              <div key={log.id} className="border border-slate-200 rounded-2xl p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">{log.action}</div>
                  <div className="text-[10px] text-slate-400">{log.createdAt}</div>
                </div>
                <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                  {log.detail || '无补充说明'}
                </p>
                <div className="text-[10px] text-slate-400 mt-2">
                  {log.actor} · {log.targetType}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignProcessView;
