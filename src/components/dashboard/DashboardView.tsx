import React, { useState } from 'react';
import { MainProject, SubProject, TaskGroup, TaskItem, ThemeColor, DesignStage, TemplateCategory, SubmissionFile, TaskStatus } from '../../types';
import TaskRow from './TaskRow';

const GROUP_LABELS: Record<TaskGroup, string> = {
  INTERNAL: '专业内部设计',
  INTERFACE: '多专业接口',
  RISK: '安全与风险控制',
  DELIVERABLE: '阶段成果',
  EQUIPMENT_REVIEW: '设备审查',
};

interface MinimalTaskView {
  id: string;
  content: string;
  categoryId: string;
  task?: TaskItem;
}

interface DashboardViewProps {
  currentMain: MainProject;
  currentSub: SubProject;
  activeStage: DesignStage;
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
  onOpenRegulations: () => void;
  onOpenErrors: () => void;
  onToggleTask: (taskId: string) => void;
  onChangeTaskStatus: (taskId: string, status: TaskStatus) => void;
  onChangeTaskBlockedReason: (taskId: string, blockedReason: string) => void;
  onAddTaskComment: (taskId: string, content: string) => void;
  onUploadTaskFile: (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetryTaskUpload: (taskId: string) => void;
  uploadErrors: Record<string, string>;
  onDownloadFile: (file: SubmissionFile) => void;
  onDeleteVersion: (taskId: string, version: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTaskModal: (group: TaskGroup, category: string, categoryId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  currentMain,
  currentSub,
  activeStage,
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
  onOpenRegulations,
  onOpenErrors,
  onToggleTask,
  onChangeTaskStatus,
  onChangeTaskBlockedReason,
  onAddTaskComment,
  onUploadTaskFile,
  onRetryTaskUpload,
  uploadErrors,
  onDownloadFile,
  onDeleteVersion,
  onDeleteTask,
  onOpenAddTaskModal,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<TaskGroup, boolean>>({
    INTERNAL: true,
    INTERFACE: true,
    RISK: true,
    DELIVERABLE: true,
    EQUIPMENT_REVIEW: true,
  });
  const [compareStage, setCompareStage] = useState<DesignStage | ''>('');

  const hasCategoryRecords = (categoryId: string) =>
    activeStageTasks.some(task => task.categoryId === categoryId && task.versions.length > 0);

  const historyStages = stageOptions.filter(stage => stage !== currentSub.stage);
  const currentStageStats = currentSub.tasks.filter(t => t.stage === currentSub.stage);
  const compareStageStats = compareStage ? currentSub.tasks.filter(t => t.stage === compareStage) : [];
  const pct = (list: TaskItem[]) => (list.length ? Math.round((list.filter(t => t.status === 'COMPLETED').length / list.length) * 100) : 0);
  const operationLogs = (currentSub.operationLogs || []).slice(0, 12);

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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {enabledCategories.map(category => {
              const tasks = activeStageTasks.filter(t => t.categoryId === category.id);
              const progress = tasks.length ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100) : 0;
              return (
                <div
                  key={category.id}
                  className={`bg-white p-3 rounded-lg shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-md hover:border-${theme}-300`}
                >
                  <div className="text-xs font-medium text-slate-500 mb-1 truncate">{category.name}</div>
                  <div className={`text-2xl font-bold text-${theme}-700`}>{progress}%</div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div className={`bg-${theme}-500 h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
          <div className="flex gap-6 min-h-0">
            <aside className="w-64 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div>
                <button
                  onClick={() => onSelectCategory('overview')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategoryId === 'overview' ? `bg-${theme}-50 text-${theme}-700 border border-${theme}-100` : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  项目设计情况
                </button>
              </div>
              {(Object.keys(GROUP_LABELS) as TaskGroup[]).map(group => {
                const groupCategories = enabledCategories.filter(category => category.group === group);
                if (groupCategories.length === 0) return null;
                const visibleCategories = showEmptyCategories ? groupCategories : groupCategories.filter(category => hasCategoryRecords(category.id));
                const expanded = expandedGroups[group];
                return (
                  <div key={group} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                      className="w-full flex items-center justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500"
                    >
                      <span>{GROUP_LABELS[group]}</span>
                      <span>{expanded ? '▾' : '▸'}</span>
                    </button>
                    {expanded && (
                      <div className="space-y-1">
                        {visibleCategories.map(category => {
                          const taskCount = activeStageTasks.filter(task => task.categoryId === category.id).length;
                          return (
                            <button
                              key={category.id}
                              onClick={() => onSelectCategory(category.id)}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategoryId === category.id ? `bg-${theme}-50 text-${theme}-700 border border-${theme}-100` : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                              <span className="truncate">{category.name}</span>
                              <span className="ml-2 text-[10px] text-slate-400">({taskCount})</span>
                            </button>
                          );
                        })}
                        {visibleCategories.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">暂无文件记录</div>}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={onToggleShowEmptyCategories} className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50">
                {showEmptyCategories ? '收起未记录分类' : '显示未记录分类'}
              </button>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button onClick={onOpenRegulations} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
                  规范条文
                </button>
                <button onClick={onOpenErrors} className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
                  设计常见问题
                </button>
              </div>
            </aside>

            <section className="flex-1 min-w-0 space-y-6">
              {selectedCategoryId === 'overview' ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">前台极简执行视图</h3>
                        <p className="text-xs text-slate-400">聚焦当前阶段最关键的 3-5 项</p>
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
                              进入分类
                            </button>
                          )}
                        </div>
                      ))}
                      {minimalTasks.length === 0 && <div className="text-xs text-slate-400">暂无极简执行项。</div>}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-3">完成度说明</h3>
                    <ul className="text-xs text-slate-500 space-y-2">
                      <li>完成度仅统计当前阶段已启用的一级分类。</li>
                      <li>二级条目由设计人员手动维护状态，状态为 COMPLETED 计入完成度。</li>
                      <li>历史阶段仅供查看，不计入当前阶段完成度。</li>
                    </ul>
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
                    <h3 className="font-bold text-slate-700 mb-3">最近操作日志</h3>
                    {operationLogs.length === 0 ? (
                      <div className="text-xs text-slate-400">暂无操作日志。</div>
                    ) : (
                      <div className="space-y-2">
                        {operationLogs.map(log => (
                          <div key={log.id} className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2">
                            <span className="font-bold text-slate-800">{log.actor}</span>
                            <span className="mx-1">在</span>
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="mx-1">执行</span>
                            <span className="font-mono">{log.action}</span>
                            {log.detail ? <span className="mx-1">（{log.detail}）</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
    </div>
  );
};

export default DashboardView;
