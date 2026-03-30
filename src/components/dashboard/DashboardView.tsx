import React, { useState } from 'react';
import { isVisibleProcessLog } from '../../process';
import { MainProject, SubProject, TaskGroup, TaskItem, ThemeColor, DesignStage, TemplateCategory, SubmissionFile, TaskStatus, DesignProcessKind, DesignProcessRecord, StageConfirmation } from '../../types';
import TaskRow from './TaskRow';
import SubprojectStructureView from './SubprojectStructureView';

interface MinimalTaskView {
  id: string;
  content: string;
  categoryId: string;
  task?: TaskItem;
}

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
  minimalTasks: MinimalTaskView[];
  theme: ThemeColor;
  isViewingHistory: boolean;
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
  onOpenRegulations: () => void;
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
}

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
  minimalTasks,
  theme,
  isViewingHistory,
  nextStage,
  onChangeStage,
  onAdvanceStage,
  onExportCurrentStage,
  onExportProject,
  onSelectCategory,
  onToggleShowEmptyCategories,
  onUploadProcessFiles,
  onDownloadProcessFile,
  onOpenRegulations,
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
}) => {
  const [compareStage, setCompareStage] = useState<DesignStage | ''>('');
  const [overviewMode, setOverviewMode] = useState<'progress' | 'structure'>('progress');

  const historyStages = stageOptions.filter(stage => stage !== currentSub.stage);
  const currentStageStats = currentSub.tasks.filter(t => t.stage === currentSub.stage);
  const compareStageStats = compareStage ? currentSub.tasks.filter(t => t.stage === compareStage) : [];
  const pct = (list: TaskItem[]) => (list.length ? Math.round((list.filter(t => t.status === 'COMPLETED').length / list.length) * 100) : 0);
  const operationLogs = (currentSub.operationLogs || []).filter(isVisibleProcessLog).slice(0, 12);
  const totalProcessFiles = processRecords.reduce(
    (count, record) =>
      count +
      (record.versions || []).reduce((versionCount, version) => versionCount + version.files.length, 0),
    0
  );

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 bg-slate-50 z-10 pb-4 pr-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs leading-5 text-slate-500">
                项目：{currentMain.name}（{currentMain.code}）
              </p>
              <p className="text-sm leading-5 font-bold text-slate-700">
                子项：{currentSub.name}（{currentSub.code}）
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-xs text-slate-500">
                <span>当前阶段：{currentSub.stage}</span>
                {isViewingHistory && <span className="text-amber-600">历史阶段浏览中</span>}
              </div>
              <select
                value={activeStage}
                onChange={e => onChangeStage(e.target.value as DesignStage)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
              >
                {stageOptions.map(stage => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <button
                onClick={onAdvanceStage}
                disabled={!nextStage}
                className={`px-3 py-2 text-xs rounded-lg font-bold ${nextStage ? `bg-${theme}-600 text-white hover:bg-${theme}-700` : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                阶段切换
              </button>
              <button
                onClick={onExportCurrentStage}
                className="px-3 py-2 text-xs rounded-lg font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                导出当前阶段
              </button>
              <button
                onClick={onExportProject}
                className="px-3 py-2 text-xs rounded-lg font-bold bg-slate-800 text-white hover:bg-slate-900"
              >
                导出整项目
              </button>
            </div>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
          <section className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('overview');
                    setOverviewMode('progress');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold ${
                    selectedCategoryId === 'overview' && overviewMode === 'progress'
                      ? `bg-${theme}-600 text-white`
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  进度视图
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('overview');
                    setOverviewMode('structure');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold ${
                    selectedCategoryId === 'overview' && overviewMode === 'structure'
                      ? `bg-${theme}-600 text-white`
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  结构视图
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedCategoryId === 'overview' && (
                  <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-500 mr-2">
                    <span>业务记录 {processRecords.length}</span>
                    <span>文件数 {totalProcessFiles}</span>
                  </div>
                )}
                <button
                  onClick={onOpenRegulations}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  规范条文
                </button>
                <button
                  onClick={onOpenErrors}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  设计常见问题
                </button>
              </div>
            </div>

            {selectedCategoryId === 'overview' ? (
              <div className="space-y-6">
                {overviewMode === 'progress' ? (
                  <>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-700">当前阶段执行重点</h3>
                          <p className="text-xs text-slate-400 mt-1">任务流保留为执行辅助，不再承担设计过程主入口。</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full bg-${theme}-100 text-${theme}-700`}>{activeStage}</span>
                      </div>
                      <div className="space-y-3">
                        {minimalTasks.map(item => (
                          <div key={item.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                            <input
                              type="checkbox"
                              checked={item.task?.status === 'COMPLETED'}
                              onChange={() => item.task && onToggleTask(item.task.id)}
                              disabled={!item.task || isViewingHistory}
                              className={`w-4 h-4 text-${theme}-600 rounded`}
                            />
                            <span className="text-sm text-slate-700">{item.content}</span>
                            {item.task && (
                              <button onClick={() => onSelectCategory(item.categoryId)} className={`ml-auto text-xs text-${theme}-600 hover:underline`}>
                                进入执行项
                              </button>
                            )}
                          </div>
                        ))}
                        {minimalTasks.length === 0 && <div className="text-xs text-slate-400">暂无当前阶段执行重点。</div>}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-700">历史阶段对比</h3>
                        <select
                          value={compareStage}
                          onChange={e => setCompareStage(e.target.value as DesignStage | '')}
                          className="border border-slate-200 rounded-lg px-3 py-1 text-xs bg-white"
                        >
                          <option value="">选择历史阶段</option>
                          {historyStages.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                      {compareStage ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <div className="text-slate-500 mb-1">当前阶段（{currentSub.stage}）</div>
                            <div className="text-slate-800 font-bold">任务数：{currentStageStats.length}</div>
                            <div className="text-slate-800 font-bold">完成度：{pct(currentStageStats)}%</div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <div className="text-slate-500 mb-1">历史阶段（{compareStage}）</div>
                            <div className="text-slate-800 font-bold">任务数：{compareStageStats.length}</div>
                            <div className="text-slate-800 font-bold">完成度：{pct(compareStageStats)}%</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">暂无历史阶段对比数据。</div>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h3 className="font-bold text-slate-700 mb-3">最近业务记录</h3>
                      {operationLogs.length === 0 ? (
                        <div className="text-xs text-slate-400">暂无业务记录。</div>
                      ) : (
                        <div className="space-y-2">
                          {operationLogs.map(log => (
                            <div key={log.id} className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2">
                              <span className="font-bold text-slate-800">{log.actor}</span>
                              <span className="mx-1">在</span>
                              <span>{new Date(log.createdAt).toLocaleString()}</span>
                              <span className="mx-1">记录了</span>
                              <span className="font-bold">{log.action}</span>
                              {log.detail ? <span className="mx-1">（{log.detail}）</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <SubprojectStructureView
                    actorName={actorName}
                    currentStage={currentSub.stage}
                    activeStage={activeStage}
                    processStages={processStages}
                    processRecords={processRecords}
                    stageConfirmations={currentSub.stageConfirmations}
                    onSelectStage={onChangeStage}
                    onToggleStageConfirmation={onToggleStageConfirmation}
                    onDownloadFile={onDownloadProcessFile}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{enabledCategories.find(category => category.id === selectedCategoryId)?.name}</h3>
                    {isViewingHistory && <p className="text-xs text-amber-600 mt-1">历史阶段仅供查看，不可编辑</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onSelectCategory('overview')}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      返回总览
                    </button>
                    <button
                      onClick={() => {
                        const category = enabledCategories.find(c => c.id === selectedCategoryId);
                        if (category) onOpenAddTaskModal(category.group, category.name, category.id);
                      }}
                      disabled={isViewingHistory}
                      className={`text-xs font-medium ${isViewingHistory ? 'text-slate-300 cursor-not-allowed' : `text-${theme}-600 hover:underline`}`}
                    >
                      + 添加条目
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeStageTasks
                    .filter(task => task.categoryId === selectedCategoryId)
                    .map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={() => onToggleTask(task.id)}
                        onChangeStatus={status => onChangeTaskStatus(task.id, status)}
                        onChangeBlockedReason={blockedReason => onChangeTaskBlockedReason(task.id, blockedReason)}
                        onAddComment={content => onAddTaskComment(task.id, content)}
                        onUpload={e => onUploadTaskFile(task.id, e)}
                        onRetryUpload={() => onRetryTaskUpload(task.id)}
                        uploadError={uploadErrors[task.id]}
                        onDownloadFile={onDownloadFile}
                        onDeleteVersion={onDeleteVersion}
                        onDeleteTask={() => onDeleteTask(task.id)}
                        theme={theme}
                        readOnly={isViewingHistory}
                      />
                    ))}
                  {activeStageTasks.filter(task => task.categoryId === selectedCategoryId).length === 0 && (
                    <div className="text-xs text-slate-400">该分类暂无条目。</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
