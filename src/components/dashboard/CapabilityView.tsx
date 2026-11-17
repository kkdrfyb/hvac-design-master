import React, { useMemo } from 'react';
import {
  DesignProcessRecord,
  FocusItem,
  OperationLog,
  ReviewRecord,
  ViewState,
} from '../../types';
import { isVisibleProcessLog } from '../../process';

interface CapabilityViewProps {
  mainName: string;
  subName: string;
  currentStage: string;
  reviewRecords: ReviewRecord[];
  processRecords: DesignProcessRecord[];
  logs: OperationLog[];
  focusItems: FocusItem[];
  onNavigate: (view: ViewState) => void;
}

type TimelineItem = {
  id: string;
  time: string;
  label: string;
  detail: string;
  actor: string;
};

const formatTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
};

const CAPABILITIES: Array<{
  title: string;
  summary: string;
  status: string;
  statusClass: string;
  target: ViewState;
  action: string;
  color: string;
}> = [
  {
    title: '规范校审流程',
    summary: '自校、互校、专业校审的意见、整改、复核与关闭记录，形成可追溯闭环。',
    status: '试用中',
    statusClass: 'bg-blue-100 text-blue-700',
    target: 'review',
    action: '进入校审记录',
    color: 'border-blue-200 bg-blue-50/40',
  },
  {
    title: '标准化设计',
    summary: '按项目类型与阶段维护模板、阶段清单和检查要点，帮助新成员按统一方法开展工作。',
    status: '已实现',
    statusClass: 'bg-emerald-100 text-emerald-700',
    target: 'templates',
    action: '查看模板管理',
    color: 'border-emerald-200 bg-emerald-50/40',
  },
  {
    title: '汇总设计文件',
    summary: '以项目为入口归集获准使用的文件副本或索引，按阶段、类别、系统、设备查找和下载。',
    status: '已实现',
    statusClass: 'bg-emerald-100 text-emerald-700',
    target: 'scan',
    action: '本机资料导入',
    color: 'border-violet-200 bg-violet-50/40',
  },
];

const PLANS = [
  {
    title: '设备台账共享与 Excel 导入',
    detail: '把现有设备 Excel 变成多人可维护的共享台账，保留修订历史与多对多资料关联。',
    status: '待实施',
  },
  {
    title: '项目资料跨项目检索与导出增强',
    detail: '按阶段、类别、设备、编号统一检索，导出时保留目录结构与资料来源。',
    status: '待实施',
  },
  {
    title: '公司正式系统编号/链接关联',
    detail: '在授权范围内登记正式资料编号或链接，不重复抄录正式系统已有信息。',
    status: '待确认',
  },
];

const CapabilityView: React.FC<CapabilityViewProps> = ({
  mainName,
  subName,
  currentStage,
  reviewRecords,
  processRecords,
  logs,
  focusItems,
  onNavigate,
}) => {
  const openReviews = useMemo(
    () => reviewRecords.filter(item => item.status !== '已关闭').length,
    [reviewRecords]
  );

  const timeline = useMemo<TimelineItem[]>(() => {
    const fromLogs: TimelineItem[] = logs
      .filter(isVisibleProcessLog)
      .slice(0, 12)
      .map(log => ({
        id: log.id,
        time: log.createdAt,
        label: log.action,
        detail: log.detail || log.targetId || '',
        actor: log.actor,
      }));
    const fromReviews: TimelineItem[] = reviewRecords.flatMap(record =>
      (record.history || []).map((entry, index) => ({
        id: `${record.id}_${index}`,
        time: entry.createdAt,
        label: `校审 · ${entry.action}`,
        detail: `${record.target}${entry.detail ? ` · ${entry.detail}` : ''}`,
        actor: entry.actor,
      }))
    );
    return [...fromLogs, ...fromReviews]
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
      .slice(0, 8);
  }, [logs, reviewRecords]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800">平台能力与信息化动态</h3>
        <p className="text-xs text-slate-500 mt-1">
          下方“状态”按已实现 / 试用中 / 待实施 / 待确认标注，只说明当前程序情况，不代表需求已全部落地。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CAPABILITIES.map(capability => (
          <div key={capability.title} className={`rounded-2xl border p-5 flex flex-col ${capability.color}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-800">{capability.title}</h4>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${capability.statusClass}`}>
                {capability.status}
              </span>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-600 flex-1">{capability.summary}</p>
            <button
              type="button"
              onClick={() => onNavigate(capability.target)}
              className="mt-4 self-start rounded-xl bg-white border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            >
              {capability.action} →
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-black text-slate-800">当前项目快照</h4>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold text-slate-400">主项目</div>
              <div className="mt-1 font-black text-slate-700 truncate">{mainName || '暂无项目'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold text-slate-400">当前子项</div>
              <div className="mt-1 font-black text-slate-700 truncate">{subName || '暂无子项'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold text-slate-400">当前阶段</div>
              <div className="mt-1 font-black text-slate-700">{currentStage || '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold text-slate-400">未关闭校审</div>
              <div className={`mt-1 font-black ${openReviews > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {openReviews} 条
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="font-bold text-slate-500">执行重点：</span>
            {focusItems.filter(item => !item.completed).length} 项待跟进 ·{' '}
            {processRecords.length} 条设计过程记录
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700"
            >
              打开项目总览
            </button>
            <button
              type="button"
              onClick={() => onNavigate('process')}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700"
            >
              查看设计过程
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="text-sm font-black text-slate-800">最近动态（自动留痕）</h4>
          {timeline.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">暂无动态。文件上传、状态变化和校审流转会自动记录在这里。</p>
          ) : (
            <div className="mt-4 space-y-3">
              {timeline.map(item => (
                <div key={item.id} className="border-l-2 border-blue-100 pl-3">
                  <div className="text-xs font-bold text-slate-700">
                    {item.label}
                    <span className="ml-2 font-normal text-slate-400">{formatTime(item.time)}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                    {item.actor || 'system'}{item.detail ? ` · ${item.detail}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-black text-slate-800">后续实施计划</h4>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLANS.map(plan => (
            <div key={plan.title} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-700">{plan.title}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {plan.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{plan.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CapabilityView;
