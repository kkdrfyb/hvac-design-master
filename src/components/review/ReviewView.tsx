import React, { useMemo, useState } from 'react';
import { ReviewKind, ReviewRecord, ReviewStatus } from '../../types';

interface ReviewViewProps {
  records: ReviewRecord[];
  stages: string[];
  currentStage: string;
  actorName: string;
  readOnly: boolean;
  onCreate: (record: ReviewRecord) => void;
  onUpdate: (id: string, patch: Partial<ReviewRecord>, action: string) => void;
}

const KINDS: ReviewKind[] = ['自校', '互校', '专业校审'];
const STATUSES: ReviewStatus[] = ['待整改', '待复核', '已关闭', '已退回'];

const STATUS_CLASS: Record<ReviewStatus, string> = {
  待整改: 'bg-amber-100 text-amber-700',
  待复核: 'bg-blue-100 text-blue-700',
  已关闭: 'bg-emerald-100 text-emerald-700',
  已退回: 'bg-rose-100 text-rose-700',
};

const formatTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
};

const ReviewView: React.FC<ReviewViewProps> = ({
  records,
  stages,
  currentStage,
  actorName,
  readOnly,
  onCreate,
  onUpdate,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [stage, setStage] = useState(currentStage || stages[0] || '方案设计');
  const [kind, setKind] = useState<ReviewKind>('自校');
  const [target, setTarget] = useState('');
  const [reviewer, setReviewer] = useState(actorName);
  const [issue, setIssue] = useState('');
  const [standardRef, setStandardRef] = useState('');
  const [assignee, setAssignee] = useState(actorName);
  const [filterStatus, setFilterStatus] = useState<'全部' | ReviewStatus>('全部');
  const [filterStage, setFilterStage] = useState('全部');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState<Record<string, string>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const stageOptions = useMemo(
    () => Array.from(new Set([currentStage, ...stages].filter(Boolean))),
    [currentStage, stages]
  );

  const counts = useMemo(() => {
    const base = { 全部: records.length, 待整改: 0, 待复核: 0, 已关闭: 0, 已退回: 0 } as Record<'全部' | ReviewStatus, number>;
    records.forEach(record => {
      base[record.status] = (base[record.status] || 0) + 1;
    });
    return base;
  }, [records]);

  const visibleRecords = useMemo(
    () =>
      records.filter(
        record =>
          (filterStatus === '全部' || record.status === filterStatus) &&
          (filterStage === '全部' || record.stage === filterStage)
      ),
    [records, filterStatus, filterStage]
  );

  const resetForm = () => {
    setTarget('');
    setIssue('');
    setStandardRef('');
    setReviewer(actorName);
    setAssignee(actorName);
    setKind('自校');
  };

  const handleCreate = () => {
    if (readOnly || !target.trim() || !issue.trim()) return;
    const now = new Date().toISOString();
    onCreate({
      id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      stage,
      kind,
      target: target.trim(),
      reviewer: reviewer.trim() || actorName,
      issue: issue.trim(),
      standardRef: standardRef.trim(),
      assignee: assignee.trim() || actorName,
      correction: '',
      reviewComment: '',
      status: '待整改',
      createdAt: now,
      createdBy: actorName,
      updatedAt: now,
      history: [{ action: '发起校审', actor: actorName, createdAt: now, detail: `${kind} · ${stage}` }],
    });
    resetForm();
    setShowForm(false);
  };

  const handleUpdate = (record: ReviewRecord, patch: Partial<ReviewRecord>, action: string) => {
    if (readOnly) return;
    const now = new Date().toISOString();
    onUpdate(
      record.id,
      {
        ...patch,
        updatedAt: now,
        history: [
          ...(record.history || []),
          { action, actor: actorName, createdAt: now, detail: patch.reviewComment || patch.correction },
        ],
      },
      action
    );
  };

  const handleCorrection = (record: ReviewRecord) => {
    const correction = (correctionDraft[record.id] || record.correction || '').trim();
    if (!correction) return;
    handleUpdate(record, { correction, status: '待复核' }, '提交整改');
    setCorrectionDraft(prev => ({ ...prev, [record.id]: '' }));
  };

  const handleReview = (record: ReviewRecord, status: ReviewStatus, action: string) => {
    const comment = (commentDraft[record.id] || '').trim();
    if (status === '已退回' && !comment) return;
    handleUpdate(
      record,
      { reviewComment: comment || (status === '已关闭' ? '复核通过' : ''), status },
      action
    );
    setCommentDraft(prev => ({ ...prev, [record.id]: '' }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-800">规范校审与问题闭环</h3>
          <p className="text-xs text-slate-500 mt-1">
            记录自校、互校、专业校审的意见、整改与复核。公司正式审批与出版结论仍以公司系统为准。
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setShowForm(value => !value)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            {showForm ? '收起表单' : '+ 发起校审'}
          </button>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">
            当前项目只读，不能新增或修改校审记录
          </span>
        )}
      </div>

      {showForm && !readOnly ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs font-bold text-slate-600">
            设计阶段
            <select
              value={stage}
              onChange={event => setStage(event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              {stageOptions.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            校审类型
            <select
              value={kind}
              onChange={event => setKind(event.target.value as ReviewKind)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              {KINDS.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">
            校审对象（文件 / 图号 / 资料版本）
            <input
              value={target}
              onChange={event => setTarget(event.target.value)}
              placeholder="例如：通风布置图 B版 / 设备规格书 V2"
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            校审人
            <input
              value={reviewer}
              onChange={event => setReviewer(event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            整改责任人
            <input
              value={assignee}
              onChange={event => setAssignee(event.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
          </label>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">
            校审意见 / 问题
            <textarea
              value={issue}
              onChange={event => setIssue(event.target.value)}
              rows={3}
              placeholder="填写需要整改的问题或建议"
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
          </label>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">
            规范引用（可选）：名称 / 编号 / 条款 / 链接
            <input
              value={standardRef}
              onChange={event => setStandardRef(event.target.value)}
              placeholder="只保存引用信息，不导入规范全文"
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!target.trim() || !issue.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              保存校审意见
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['全部', ...STATUSES] as const).map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`rounded-2xl border p-3 text-left transition-all ${
              filterStatus === status
                ? 'border-blue-300 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-bold text-slate-500">{status}</div>
            <div className="text-xl font-black text-slate-800 mt-1">{counts[status] || 0}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="font-bold text-slate-500">阶段筛选</span>
        <select
          value={filterStage}
          onChange={event => setFilterStage(event.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="全部">全部阶段</option>
          {stageOptions.map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {visibleRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          当前筛选条件下没有校审记录。
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRecords.map(record => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_CLASS[record.status]}`}>
                  {record.status}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {record.kind}
                </span>
                <span className="text-[11px] font-bold text-slate-500">{record.stage}</span>
                <span className="text-sm font-black text-slate-800">{record.target}</span>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                  className="ml-auto text-[11px] font-bold text-blue-600 hover:underline"
                >
                  {expanded === record.id ? '收起流转' : '查看流转'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                <div><span className="font-bold text-slate-500">校审人：</span>{record.reviewer || '—'}</div>
                <div><span className="font-bold text-slate-500">整改责任人：</span>{record.assignee || '—'}</div>
                <div className="md:col-span-2"><span className="font-bold text-slate-500">校审意见：</span>{record.issue}</div>
                {record.standardRef ? (
                  <div className="md:col-span-2"><span className="font-bold text-slate-500">规范引用：</span>{record.standardRef}</div>
                ) : null}
                {record.correction ? (
                  <div className="md:col-span-2"><span className="font-bold text-slate-500">整改回复：</span>{record.correction}</div>
                ) : null}
                {record.reviewComment ? (
                  <div className="md:col-span-2"><span className="font-bold text-slate-500">复核意见：</span>{record.reviewComment}</div>
                ) : null}
              </div>

              {!readOnly && (record.status === '待整改' || record.status === '已退回') ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={correctionDraft[record.id] || ''}
                    onChange={event => setCorrectionDraft(prev => ({ ...prev, [record.id]: event.target.value }))}
                    placeholder={record.status === '已退回' ? '补充整改说明后重新提交' : '填写整改回复'}
                    className="flex-1 min-w-[220px] border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleCorrection(record)}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                  >
                    提交整改
                  </button>
                </div>
              ) : null}

              {!readOnly && record.status === '待复核' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={commentDraft[record.id] || ''}
                    onChange={event => setCommentDraft(prev => ({ ...prev, [record.id]: event.target.value }))}
                    placeholder="复核意见（退回时必填）"
                    className="flex-1 min-w-[220px] border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleReview(record, '已关闭', '复核通过')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    复核通过
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(record, '已退回', '退回整改')}
                    className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                  >
                    退回整改
                  </button>
                </div>
              ) : null}

              {expanded === record.id ? (
                <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                  {(record.history || []).map((entry, index) => (
                    <div key={`${entry.createdAt}_${index}`} className="text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">{entry.action}</span>
                      <span className="mx-2">·</span>
                      <span>{entry.actor}</span>
                      <span className="mx-2">·</span>
                      <span>{formatTime(entry.createdAt)}</span>
                      {entry.detail ? <span> · {entry.detail}</span> : null}
                    </div>
                  ))}
                  <div className="text-[10px] text-slate-400">
                    发起：{record.createdBy} · {formatTime(record.createdAt)} ｜ 最近更新：{formatTime(record.updatedAt)}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewView;
