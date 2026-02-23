import React from 'react';
import { MainProject, SubProject, TaskGroup, TaskItem, ThemeColor, DesignStage, TemplateCategory, SubmissionFile } from '../../types';
import TaskRow from './TaskRow';

const GROUP_LABELS: Record<TaskGroup, string> = {
  INTERFACE: '多专业接口',
  RISK: '安全与风险控制',
  DELIVERABLE: '阶段成果',
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
  onSelectCategory: (categoryId: string) => void;
  onToggleShowEmptyCategories: () => void;
  onOpenRegulations: () => void;
  onOpenErrors: () => void;
  onToggleTask: (taskId: string) => void;
  onUploadTaskFile: (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onSelectCategory,
  onToggleShowEmptyCategories,
  onOpenRegulations,
  onOpenErrors,
  onToggleTask,
  onUploadTaskFile,
  onDownloadFile,
  onDeleteVersion,
  onDeleteTask,
  onOpenAddTaskModal,
}) => {
  const hasCategoryRecords = (categoryId: string) =>
    activeStageTasks.some(task => task.categoryId === categoryId && task.versions.length > 0);

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 bg-slate-50 z-10 pb-4 pr-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                项目：{currentMain.name}（{currentMain.code}）
              </p>
              <p className="text-sm font-bold text-slate-700">
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {enabledCategories.map(category => {
              const tasks = activeStageTasks.filter(t => t.categoryId === category.id);
              const progress = tasks.length ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0;
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
                return (
                  <div key={group} className="space-y-2">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{GROUP_LABELS[group]}</div>
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
                            checked={item.task?.isCompleted || false}
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
                      <li>二级条目由设计人员手动勾选完成状态。</li>
                      <li>历史阶段仅供查看，不计入当前阶段完成度。</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{enabledCategories.find(category => category.id === selectedCategoryId)?.name}</h3>
                      {isViewingHistory && <p className="text-xs text-amber-600 mt-1">历史阶段仅供查看，不可编辑</p>}
                    </div>
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
                  <div className="space-y-2">
                    {activeStageTasks
                      .filter(task => task.categoryId === selectedCategoryId)
                      .map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onToggle={() => onToggleTask(task.id)}
                          onUpload={e => onUploadTaskFile(task.id, e)}
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
