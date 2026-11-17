import { DesignProcessKind, DesignProcessRecord, DesignStage, OperationLog, SubmissionVersion, TaskItem } from './types';
import { DESIGN_STAGES } from './constants';

export const DESIGN_PROCESS_KIND_LABELS: Record<DesignProcessKind, string> = {
  INPUT: '设计输入',
  RECEIVED_INTERFACE: '收到提资',
  CALCULATION: '计算结果',
  INTERFACE: '对外提资',
  DELIVERABLE: '输出成果',
  POST_ISSUE: '出图后闭环',
  NOTE: '设计备注',
};

export const DESIGN_PROCESS_KINDS: DesignProcessKind[] = [
  'INPUT',
  'RECEIVED_INTERFACE',
  'CALCULATION',
  'INTERFACE',
  'DELIVERABLE',
  'POST_ISSUE',
  'NOTE',
];

export const PROCESS_SUBTYPE_LIBRARY: Record<DesignProcessKind, string[]> = {
  INPUT: [
    '设计输入',
    '设计进度计划',
    '设计任务书',
    '方案或可研报告',
    '设计原则',
  ],
  RECEIVED_INTERFACE: [
    '建筑条件',
    '结构条件',
    '工艺条件',
    '辐射防护条件',
    '其他专业提资',
  ],
  CALCULATION: [
    '房间冷热负荷计算书',
    '各房间风量表',
    '水力计算书',
    '防排烟计算',
    '其他计算结果',
  ],
  INTERFACE: [
    '给建筑条件',
    '给结构条件',
    '给电气条件',
    '给仪控条件',
    '给通信条件',
    '给总体条件',
    '给其他专业条件',
  ],
  DELIVERABLE: [
    '通风系统手册',
    '系统流程图',
    '通风布置图',
    '通风设备定位图',
    '通风设备材料清单',
    '设备规格书和数据表',
    '其他成果文件',
  ],
  POST_ISSUE: [
    '设备资料审查',
    'FCR',
    'CR',
    'DEN',
    '其他闭环事项',
  ],
  NOTE: ['设计备注'],
};

const RECEIVED_INTERFACE_SUBTYPES = new Set(PROCESS_SUBTYPE_LIBRARY.RECEIVED_INTERFACE);

export const getProcessSubtypeOptions = (
  kind: DesignProcessKind,
  existingSubtypes: string[] = []
) => {
  const presets = PROCESS_SUBTYPE_LIBRARY[kind] || [];
  return Array.from(
    new Set(
      [...presets, ...existingSubtypes.map(item => item.trim()).filter(Boolean)]
    )
  );
};

export const getDefaultProcessStages = (
  currentStage: DesignStage,
  stageHistory: DesignStage[] = [],
  processStages: DesignStage[] = [],
  recordStages: DesignStage[] = []
) => {
  const merged = [
    currentStage,
    ...stageHistory,
    ...DESIGN_STAGES,
    ...processStages,
    ...recordStages,
  ]
    .map(item => (item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(merged));
};

export const normalizeProcessKind = (
  kind: DesignProcessKind,
  subtype?: string
): DesignProcessKind => {
  const normalizedSubtype = (subtype || '').trim();
  if (kind === 'INPUT' && RECEIVED_INTERFACE_SUBTYPES.has(normalizedSubtype)) {
    return 'RECEIVED_INTERFACE';
  }
  return kind;
};

const HIDDEN_LEGACY_ACTIONS = new Set([
  'toggle_task_completed',
  'set_task_status',
  'delete_task',
  'add_task',
  'delete_task_version',
  'add_task_comment',
  'upload_task_file',
  'advance_stage',
]);

export const isVisibleProcessLog = (log: OperationLog) => {
  return !HIDDEN_LEGACY_ACTIONS.has(log.action);
};

export const getTaskLabel = (task?: TaskItem) => {
  if (!task) return '未命名事项';
  return `${task.category} / ${task.content}`;
};

const RISK_KEYWORDS = ['待补', '缺', '风险', '阻塞', '未收到', '需确认', '问题'];

export const getRecordSubtypeLabel = (record: Pick<DesignProcessRecord, 'subtype' | 'title'>) => {
  return (record.subtype || record.title || '未分类').trim() || '未分类';
};

export const getLatestVersion = (record?: Pick<DesignProcessRecord, 'versions'>): SubmissionVersion | undefined => {
  return record?.versions?.[0];
};

export type StructureStatus = 'done' | 'in_progress' | 'not_started' | 'risk' | 'locked';

export const getRecordStatus = (
  record: Pick<DesignProcessRecord, 'detail' | 'changeSummary' | 'versions'> | undefined,
  isHistoricalStage: boolean
): StructureStatus => {
  if (!record) return 'not_started';
  const text = `${record.detail || ''}\n${record.changeSummary || ''}`;
  if (RISK_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'risk';
  }
  if (record.versions && record.versions.length > 0) {
    return isHistoricalStage ? 'locked' : 'done';
  }
  return 'in_progress';
};

export const getAggregateStatus = (statuses: StructureStatus[]): StructureStatus => {
  if (statuses.length === 0) return 'not_started';
  if (statuses.every(status => status === 'not_started')) return 'not_started';
  if (statuses.some(status => status === 'risk')) return 'risk';
  if (statuses.every(status => status === 'locked')) return 'locked';
  if (statuses.some(status => status === 'in_progress')) return 'in_progress';

  const finishedStatuses = statuses.filter(
    status => status === 'done' || status === 'locked'
  );
  if (finishedStatuses.length === statuses.length) {
    return statuses.every(status => status === 'locked') ? 'locked' : 'done';
  }
  if (finishedStatuses.length > 0) {
    return 'in_progress';
  }
  return 'not_started';
};

export const STRUCTURE_STATUS_META: Record<
  StructureStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  done: {
    label: '已完成',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  in_progress: {
    label: '进行中',
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  not_started: {
    label: '未开始',
    badgeClass: 'bg-slate-100 text-slate-500',
    dotClass: 'bg-slate-300',
  },
  risk: {
    label: '待补资料/有风险',
    badgeClass: 'bg-rose-100 text-rose-700',
    dotClass: 'bg-rose-500',
  },
  locked: {
    label: '已归档/最终版锁定',
    badgeClass: 'bg-blue-100 text-blue-700',
    dotClass: 'bg-blue-500',
  },
};
