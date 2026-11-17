import React from 'react';
import { DESIGN_STAGES } from '../../constants';
import { buildStructureTree } from './structureTree';
import { isVisibleProcessLog } from '../../process';
import {
  DesignProcessKind,
  DesignProcessRecord,
  DesignStage,
  FocusItem,
  MainProject,
  StageConfirmation,
  SubmissionFile,
  SubProject,
  TaskGroup,
  TaskItem,
  TaskStatus,
  TemplateCategory,
  ThemeColor,
} from '../../types';
import TaskRow from './TaskRow';
import SubprojectStructureView from './SubprojectStructureView';

interface DashboardViewProps {
  actorName: string;
  currentMain: MainProject;
  currentSub: SubProject;
  activeStage: DesignStage;
  processStages: DesignStage[];
  processRecords: DesignProcessRecord[];
  stageOptions: DesignStage[];
  selectedCategoryId: string;
  showEmptyCategories: boolean;
  enabledCategories: TemplateCategory[];
  activeStageTasks: TaskItem[];
  theme: ThemeColor;
  isViewingHistory: boolean;
  readOnlyProject: boolean;
  nextStage?: DesignStage;
  onChangeStage: (stage: DesignStage) => void;
  onAdvanceStage: () => void;
  onExportCurrentStage: () => void;
  onExportProject: () => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleShowEmptyCategories: () => void;
  onUploadProcessFiles: (params: {
    recordId: string;
    stage: DesignStage;
    kind: DesignProcessKind;
    subtype: string;
    title: string;
    files: File[];
  }) => Promise<void>;
  onDownloadProcessFile: (file: SubmissionFile) => void;
  onOpenErrors: () => void;
  onToggleTask: (taskId: string) => void;
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
  onChangeTaskBlockedReason: (taskId: string, blockedReason: string) => void;
  onAddTaskComment: (taskId: string, content: string) => void;
  onUploadTaskFile: (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetryTaskUpload: (taskId: string) => void;
  uploadErrors: Record<string, string>;
  onToggleStageConfirmation: (stage: DesignStage, nextConfirmation: StageConfirmation) => void;
  onDownloadFile: (file: SubmissionFile) => void;
  onDeleteVersion: (taskId: string, version: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTaskModal: (group: TaskGroup, category: string, categoryId: string) => void;
  focusItems: FocusItem[];
  onCreateFocusItem: (stage: DesignStage, kind: string) => FocusItem | null;
  onUpdateFocusItem: (
    focusItemId: string,
    patch: Partial<Pick<FocusItem, 'content' | 'completed'>>
  ) => void;
  onDeleteFocusItem: (focusItemId: string) => void;
}

const STRINGS = {
  projectLabel: '项目',
  subprojectLabel: '子项',
  exportStage: '导出当前阶段',
  exportProject: '导出整项目',
  backOverview: '返回总览',
  addTask: '新增条目',
  readonlyHint: '历史阶段仅供查看，不可编辑',
  emptyCategory: '该分类暂时无条目。',
  historyCompare: '历史阶段对比',
  recentLogs: '最近业务记录',
  noHistoryCompare: '暂无可对比的历史阶段数据。',
  noLogs: '暂无最近业务记录。',
  completedSubtypes: '完成细项',
  recordCount: '记录数',
};

const calculateStageStats = (stageTree?: ReturnType<typeof buildStructureTree>[number]) => {
  if (!stageTree) {
    return {
      completedSubtypeCount: 0,
      totalSubtypeCount: 0,
      recordCount: 0,
    };
  }

  return {
    completedSubtypeCount: stageTree.completedSubtypeCount,
    totalSubtypeCount: stageTree.totalSubtypeCount,
    recordCount: stageTree.kinds.reduce(
      (count, kind) => count + kind.subtypes.reduce((sum, subtype) => sum + subtype.records.length, 0),
      0
    ),
  };
};

const DashboardView: React.FC<DashboardViewProps> = ({
  actorName,
  currentMain,
  currentSub,
  activeStage,
  processStages,
  processRecords,
  stageOptions,
  selectedCategoryId,
  showEmptyCategories,
  enabledCategories,
  activeStageTasks,
  theme,
  isViewingHistory,
  readOnlyProject,
  nextStage,
  onChangeStage,
  onAdvanceStage,
  onExportCurrentStage,
  onExportProject,
  onSelectCategory,
  onToggleShowEmptyCategories,
  onUploadProcessFiles,
  onDownloadProcessFile,
  onOpenErrors,
  onToggleTask,
  onChangeTaskStatus,
  onChangeTaskBlockedReason,
  onAddTaskComment,
  onUploadTaskFile,
  onRetryTaskUpload,
  uploadErrors,
  onToggleStageConfirmation,
  onDownloadFile,
  onDeleteVersion,
  onDeleteTask,
  onOpenAddTaskModal,
  focusItems,
  onCreateFocusItem,
  onUpdateFocusItem,
  onDeleteFocusItem,
}) => {
  void stageOptions;
  void showEmptyCategories;
  void nextStage;
  void onAdvanceStage;
  void onToggleShowEmptyCategories;
  void onUploadProcessFiles;
  void onOpenErrors;

  const compactStages = React.useMemo(
    () => Array.from(new Set([...DESIGN_STAGES, ...(processStages || [])])),
    [processStages]
  );
  const selectedCategory = enabledCategories.find(category => category.id === selectedCategoryId);
  const selectedCategoryTasks = activeStageTasks.filter(task => task.categoryId === selectedCategoryId);

  const overviewStageTrees = React.useMemo(
    () => buildStructureTree(currentSub.stage, compactStages, processRecords),
    [compactStages, currentSub.stage, processRecords]
  );

  const activeStageTree = React.useMemo(
    () => overviewStageTrees.find(stageTree => stageTree.stage === activeStage),
    [activeStage, overviewStageTrees]
  );

  const comparisonStage = React.useMemo(() => {
    const candidateStages = compactStages.filter(stage => stage !== activeStage);
    if (candidateStages.length === 0) return null;

    const activeIndex = DESIGN_STAGES.indexOf(activeStage);
    const ordered = [...candidateStages].sort((a, b) => DESIGN_STAGES.indexOf(b) - DESIGN_STAGES.indexOf(a));
    const previous = ordered.find(stage => DESIGN_STAGES.indexOf(stage) < activeIndex);
    return previous || ordered[0];
  }, [activeStage, compactStages]);

  const comparisonStageTree = React.useMemo(
    () => overviewStageTrees.find(stageTree => stageTree.stage === comparisonStage),
    [comparisonStage, overviewStageTrees]
  );

  const activeStats = calculateStageStats(activeStageTree);
  const comparisonStats = calculateStageStats(comparisonStageTree);
  const visibleLogs = React.useMemo(
    () => (currentSub.operationLogs || []).filter(isVisibleProcessLog).slice(0, 8),
    [currentSub.operationLogs]
  );

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-shrink-0 bg-slate-50 pb-2 pr-1">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0 flex-1 pl-5">
              <p className="truncate whitespace-nowrap text-sm font-black leading-5 text-slate-800">
                <span>
                  {STRINGS.projectLabel}: {currentMain.name} ({currentMain.code})
                </span>
                <span className="ml-5">
                  {STRINGS.subprojectLabel}: {currentSub.name} ({currentSub.code})
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {DESIGN_STAGES.map(stage => {
                const selected = activeStage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => onChangeStage(stage)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      selected
                        ? `bg-${theme}-600 text-white shadow-sm`
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {stage}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportCurrentStage}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                {STRINGS.exportStage}
              </button>
              <button
                type="button"
                onClick={onExportProject}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900"
              >
                {STRINGS.exportProject}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8 pr-1 scrollbar-hide">
          {selectedCategoryId === 'overview' ? (
            <div className="space-y-4">
              <SubprojectStructureView
                actorName={actorName}
                currentMain={currentMain}
                currentSub={currentSub}
                currentStage={currentSub.stage}
                activeStage={activeStage}
                processStages={compactStages}
                processRecords={processRecords}
                stageConfirmations={currentSub.stageConfirmations}
                focusItems={focusItems}
                theme={theme}
                readOnly={readOnlyProject}
                onSelectStage={onChangeStage}
                onToggleStageConfirmation={onToggleStageConfirmation}
                onDownloadFile={onDownloadProcessFile}
                onCreateFocusItem={onCreateFocusItem}
                onUpdateFocusItem={onUpdateFocusItem}
                onDeleteFocusItem={onDeleteFocusItem}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-black text-slate-800">
                    {STRINGS.historyCompare}
                  </div>
                  {comparisonStage && comparisonStageTree ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-bold text-slate-700">{activeStage}</div>
                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                          <div>
                            {STRINGS.completedSubtypes}: {activeStats.completedSubtypeCount}/
                            {activeStats.totalSubtypeCount}
                          </div>
                          <div>
                            {STRINGS.recordCount}: {activeStats.recordCount}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-bold text-slate-700">{comparisonStage}</div>
                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                          <div>
                            {STRINGS.completedSubtypes}: {comparisonStats.completedSubtypeCount}/
                            {comparisonStats.totalSubtypeCount}
                          </div>
                          <div>
                            {STRINGS.recordCount}: {comparisonStats.recordCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      {STRINGS.noHistoryCompare}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-black text-slate-800">
                    {STRINGS.recentLogs}
                  </div>
                  {visibleLogs.length > 0 ? (
                    <div className="space-y-2">
                      {visibleLogs.map(log => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {log.actor}
                            {log.detail ? ` · ${log.detail}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                      {STRINGS.noLogs}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedCategory?.name}</h3>
                  {isViewingHistory ? (
                    <p className="mt-1 text-xs text-amber-600">{STRINGS.readonlyHint}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onSelectCategory('overview')}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    {STRINGS.backOverview}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCategory) {
                        onOpenAddTaskModal(
                          selectedCategory.group,
                          selectedCategory.name,
                          selectedCategory.id
                        );
                      }
                    }}
                    disabled={isViewingHistory || readOnlyProject || !selectedCategory}
                    className={`text-xs font-bold ${
                      isViewingHistory || readOnlyProject || !selectedCategory
                        ? 'cursor-not-allowed text-slate-300'
                        : `text-${theme}-600 hover:underline`
                    }`}
                  >
                    {STRINGS.addTask}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {selectedCategoryTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => onToggleTask(task.id)}
                    onChangeStatus={status => onChangeTaskStatus(task.id, status)}
                    onChangeBlockedReason={blockedReason =>
                      onChangeTaskBlockedReason(task.id, blockedReason)
                    }
                    onAddComment={content => onAddTaskComment(task.id, content)}
                    onUpload={event => onUploadTaskFile(task.id, event)}
                    onRetryUpload={() => onRetryTaskUpload(task.id)}
                    uploadError={uploadErrors[task.id]}
                    onDownloadFile={onDownloadFile}
                    onDeleteVersion={onDeleteVersion}
                    onDeleteTask={() => onDeleteTask(task.id)}
                    theme={theme}
                    readOnly={isViewingHistory || readOnlyProject}
                  />
                ))}
                {selectedCategoryTasks.length === 0 ? (
                  <div className="text-xs text-slate-400">{STRINGS.emptyCategory}</div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
