import React, { useEffect, useMemo, useState } from 'react';
import {
  DESIGN_PROCESS_KIND_LABELS,
  DESIGN_PROCESS_KINDS,
  getProcessSubtypeOptions,
  isVisibleProcessLog,
} from '../../process';
import { DesignProcessKind, DesignProcessRecord, DesignStage, OperationLog, SubmissionFile } from '../../types';
import ProcessStageBoard from './ProcessStageBoard';

interface DesignProcessViewProps {
  currentStage: DesignStage;
  processStages: DesignStage[];
  processRecords: DesignProcessRecord[];
  logs: OperationLog[];
  actorName: string;
  onUpdateRecordSummary: (recordId: string, changeSummary: string) => void;
  onAddStage: (stageName: DesignStage) => void;
  onDeleteStage: (stageName: DesignStage) => void;
  onAddRecord: (record: {
    stage: DesignStage;
    kind: DesignProcessKind;
    subtype: string;
    title: string;
    detail: string;
  }) => void;
  onUploadFiles: (params: {
    recordId: string;
    stage: DesignStage;
    kind: DesignProcessKind;
    subtype: string;
    title: string;
    files: File[];
  }) => Promise<void>;
  onDownloadFile: (file: SubmissionFile) => void;
}

const DesignProcessView: React.FC<DesignProcessViewProps> = ({
  currentStage,
  processStages,
  processRecords,
  logs,
  actorName,
  onUpdateRecordSummary,
  onAddStage,
  onDeleteStage,
  onAddRecord,
  onUploadFiles,
  onDownloadFile,
}) => {
  const [stage, setStage] = useState<DesignStage>(currentStage);
  const [kind, setKind] = useState<DesignProcessKind>('NOTE');
  const [subtype, setSubtype] = useState('设计备注');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({ [currentStage]: true });

  const orderedLogs = useMemo(() => {
    return [...logs]
      .filter(isVisibleProcessLog)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [logs]);

  const subtypeOptions = useMemo(() => {
    return getProcessSubtypeOptions(
      kind,
      processRecords
        .filter(record => record.kind === kind)
        .map(record => record.subtype || record.title || '')
    );
  }, [kind, processRecords]);

  useEffect(() => {
    setExpandedStages(prev => {
      const next: Record<string, boolean> = {};
      processStages.forEach(item => {
        next[item] = prev[item] ?? item === currentStage;
      });
      if (!next[currentStage]) {
        next[currentStage] = true;
      }
      return next;
    });
  }, [currentStage, processStages]);

  useEffect(() => {
    const nextDefaultSubtype = getProcessSubtypeOptions(kind)[0] || '';
    setSubtype(prev => (prev ? prev : nextDefaultSubtype));
  }, [kind]);

  const recordsByStage = useMemo(() => {
    return processStages.map(recordStage => ({
      stage: recordStage,
      records: processRecords
        .filter(record => record.stage === recordStage)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    }));
  }, [processRecords, processStages]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800">新增设计过程记录</h3>
            <p className="text-xs text-slate-500 mt-1">
              记录真实业务内容，按阶段、分类和细项沉淀设计输入、计算结果、提资和成果。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="新增设计阶段，例如：提资返提阶段"
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white min-w-[240px]"
            />
            <button
              type="button"
              onClick={() => {
                const normalized = newStageName.trim();
                if (!normalized) return;
                onAddStage(normalized);
                setExpandedStages(prev => ({ ...prev, [normalized]: true }));
                setStage(normalized);
                setNewStageName('');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              新增阶段
            </button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              记录人: {actorName}
            </span>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <select
            value={stage}
            onChange={e => setStage(e.target.value as DesignStage)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
          >
            {processStages.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={kind}
            onChange={e => setKind(e.target.value as DesignProcessKind)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
          >
            {DESIGN_PROCESS_KINDS.map(item => (
              <option key={item} value={item}>
                {DESIGN_PROCESS_KIND_LABELS[item]}
              </option>
            ))}
          </select>
          <div>
            <input
              list="process-subtype-options"
              value={subtype}
              onChange={e => setSubtype(e.target.value)}
              placeholder="细项，例如：建筑条件、FCR、系统流程图"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
            <datalist id="process-subtype-options">
              {subtypeOptions.map(item => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="记录标题，例如：收到建筑防火分区图、完成初设冷热负荷计算"
          className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
        />
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          rows={4}
          placeholder="补充说明、关键参数、版本信息、提资对象等"
          className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs resize-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              const nextSubtype = subtype.trim();
              const nextTitle = title.trim() || nextSubtype;
              const nextDetail = detail.trim();
              if (!nextSubtype) {
                setError('请输入细项名称');
                return;
              }
              if (!nextTitle) {
                setError('请输入记录标题');
                return;
              }
              setError('');
              onAddRecord({
                stage,
                kind,
                subtype: nextSubtype,
                title: nextTitle,
                detail: nextDetail,
              });
              setTitle('');
              setDetail('');
              setKind('NOTE');
              setSubtype('设计备注');
              setStage(currentStage);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            保存记录
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">阶段化设计过程</h3>
            <p className="text-xs text-slate-500 mt-1">默认只展开当前阶段；阶段内按分类和细项收起展示，避免内容混在一起。</p>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            共 {processRecords.length} 条记录 / {processStages.length} 个阶段
          </span>
        </div>

        <div className="mt-5 space-y-5">
          {recordsByStage.map(({ stage: recordStage, records }) => (
            <ProcessStageBoard
              key={recordStage}
              stage={recordStage}
              records={records}
              highlight={recordStage === currentStage}
              expanded={!!expandedStages[recordStage]}
              onToggle={() =>
                setExpandedStages(prev => ({ ...prev, [recordStage]: !prev[recordStage] }))
              }
              onUpdateRecordSummary={onUpdateRecordSummary}
              onUploadFiles={onUploadFiles}
              onDownloadFile={onDownloadFile}
              allowDelete={records.length === 0 && recordStage !== currentStage}
              onDeleteStage={onDeleteStage}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">业务时间线</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            共 {orderedLogs.length} 条
          </span>
        </div>

        {orderedLogs.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
            暂无业务时间线记录。
          </div>
        ) : (
          <div className="space-y-3">
            {orderedLogs.map(log => (
              <div key={log.id} className="border border-slate-200 rounded-2xl p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">{log.action}</div>
                  <div className="text-[10px] text-slate-400">{log.createdAt}</div>
                </div>
                <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{log.detail || '无补充说明'}</p>
                <div className="text-[10px] text-slate-400 mt-2">{log.actor}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignProcessView;
