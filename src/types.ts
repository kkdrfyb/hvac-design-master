export type DesignStage = string;

export type ProjectType = '核岛厂房' | '附属工业厂房' | '其他';

export type TaskGroup = 'INTERNAL' | 'INTERFACE' | 'RISK' | 'DELIVERABLE' | 'EQUIPMENT_REVIEW';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

export interface SubmissionFile {
  id?: string;
  name: string;
  type: string;
  size?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  source?: string;
  downloadPath?: string;
}

export interface AppUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword?: boolean;
  editableProjectIds?: string[];
  editableSubprojectPermissions?: EditableSubprojectPermission[];
}

export interface AccountUser extends AppUser {}

export interface EditableSubprojectPermission {
  projectId: string;
  subProjectId: string;
}

export interface SubmissionVersion {
  version: string; // A, B, C...
  date: string;
  files: SubmissionFile[];
}

export interface TaskComment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
  targetType: 'stage' | 'task' | 'file' | 'comment' | 'process' | 'review';
  targetId: string;
  detail?: string;
}

export type ReviewKind = '自校' | '互校' | '专业校审';
export type ReviewStatus = '待整改' | '待复核' | '已关闭' | '已退回';

export interface ReviewHistoryEntry {
  action: string;
  actor: string;
  createdAt: string;
  detail?: string;
}

/** 人工校审记录：意见、整改、复核与关闭形成可追溯闭环。正式审批仍以公司系统为准。 */
export interface ReviewRecord {
  id: string;
  stage: DesignStage;
  kind: ReviewKind;
  target: string;
  reviewer: string;
  issue: string;
  standardRef: string;
  assignee: string;
  correction: string;
  reviewComment: string;
  status: ReviewStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  history: ReviewHistoryEntry[];
}

export type DesignProcessKind =
  | 'INPUT'
  | 'RECEIVED_INTERFACE'
  | 'CALCULATION'
  | 'INTERFACE'
  | 'DELIVERABLE'
  | 'POST_ISSUE'
  | 'NOTE';

export interface DesignProcessRecord {
  id: string;
  stage: DesignStage;
  kind: DesignProcessKind;
  subtype?: string;
  title: string;
  detail?: string;
  changeSummary?: string;
  createdAt: string;
  createdBy: string;
  relatedTaskId?: string;
  versions?: SubmissionVersion[];
}

export interface DesignSpecTemplate {
  id: string;
  name: string;
  projectType: ProjectType;
  stage: DesignStage;
  description?: string;
  mappingJson?: string;
  docxFile?: SubmissionFile;
  createdBy: string;
  createdAt: string;
}

export interface DesignSpecOutput {
  docx?: SubmissionFile;
  pdf?: SubmissionFile;
  dwgFiles?: SubmissionFile[];
}

export interface DesignSpecInstance {
  id: string;
  templateId: string;
  stage: DesignStage;
  payload: Record<string, any>;
  createdBy: string;
  createdAt: string;
  outputs: DesignSpecOutput;
}

export interface StageConfirmation {
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface FocusItem {
  id: string;
  stage: DesignStage;
  kind: string;
  content: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  content: string;
  group: TaskGroup;
  categoryId: string;
  category: string;
  minimal?: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  group: TaskGroup;
  items: TemplateItem[];
}

export interface TaskItem {
  id: string;
  categoryId: string;
  category: string; // Changed from enum to string to support dynamic categories
  group: TaskGroup;
  stage: DesignStage;
  content: string;
  status: TaskStatus;
  blockedReason?: string;
  versions: SubmissionVersion[]; // Support multiple versions with multiple files
  comments: TaskComment[];
}

export interface MandatoryClause {
  id: string;
  code: string;
  clauseNumber: string;
  content: string;
}

export interface CommonError {
  id: string;
  title: string;
  description: string;
  solution: string;
  category: string;
}

export interface SubProject {
  id: string;
  name: string;
  code: string;
  canEdit?: boolean;
  type: ProjectType;
  stage: DesignStage;
  stageHistory: DesignStage[];
  enabledCategoryIds: string[];
  tasks: TaskItem[];
  operationLogs: OperationLog[];
  processStages?: DesignStage[];
  processRecords?: DesignProcessRecord[];
  stageConfirmations?: Record<DesignStage, StageConfirmation>;
  focusItems?: FocusItem[];
  designSpecs?: DesignSpecInstance[];
  reviewRecords?: ReviewRecord[];
}

export interface MainProject {
  id: string;
  name: string;
  code: string;
  subProjects: SubProject[];
  designSpecTemplates?: DesignSpecTemplate[];
  canEdit?: boolean;
}

export interface NewProjectDraft {
  mainName: string;
  mainCode: string;
  subName: string;
  subCode: string;
  type: ProjectType;
  stage: DesignStage;
  enabledCategoryIds: string[];
}

// ── 文件夹扫描类型 ──────────────────────────────────────────────

export interface ScannedFile {
  name: string;
  relativePath: string;
  fullPath: string;
  size: number;
  lastModified: string;
  /** 前端使用：是否选中上传 */
  selected?: boolean;
}

export interface ScannedVersion {
  label: string;
  files: ScannedFile[];
}

export interface ScannedSubtype {
  subtype: string;
  versions: ScannedVersion[];
  directFiles: ScannedFile[];
}

export interface ScannedKindGroup {
  kind: DesignProcessKind;
  label: string;
  subtypes: ScannedSubtype[];
  directFiles: ScannedFile[];
}

export interface ScanResult {
  rootPath: string;
  kinds: ScannedKindGroup[];
  unmatchedFolders: string[];
  warnings: string[];
  summary: {
    kindCount: number;
    fileCount: number;
    unmatchedCount: number;
  };
}

export interface ScanSelectionRecord {
  kind: string;
  subtype: string;
  version: string;
  stage: DesignStage;
  title: string;
  files: { fullPath: string; name: string }[];
}

export type ViewState =
  | 'capabilities'
  | 'process'
  | 'dashboard'
  | 'templates'
  | 'regulations'
  | 'errors'
  | 'accounts'
  | 'scan'
  | 'review';

export type ThemeColor = 'blue' | 'emerald' | 'rose' | 'violet';
