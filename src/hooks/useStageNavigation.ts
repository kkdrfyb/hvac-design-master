import { useEffect, useMemo, useState } from 'react';
import { buildTasksFromTemplate, DESIGN_STAGES, TEMPLATE_CATEGORIES } from '../constants';
import { DesignStage, SubProject, TemplateCategory } from '../types';

interface UseStageNavigationOptions {
  currentSub: SubProject;
  actorName: string;
  updateCurrentSubProject: (updater: (sp: SubProject) => SubProject) => void;
}

export const useStageNavigation = ({ currentSub, actorName, updateCurrentSubProject }: UseStageNavigationOptions) => {
  const [activeStage, setActiveStage] = useState<DesignStage>(currentSub.stage);
  const [selectedCategoryId, setSelectedCategoryId] = useState('overview');
  const [showEmptyCategories, setShowEmptyCategories] = useState(false);

  useEffect(() => {
    setActiveStage(currentSub.stage);
    setSelectedCategoryId('overview');
    setShowEmptyCategories(false);
  }, [currentSub.id, currentSub.stage]);

  useEffect(() => {
    setSelectedCategoryId('overview');
  }, [activeStage]);

  const currentStageCategories = useMemo<TemplateCategory[]>(
    () => TEMPLATE_CATEGORIES[currentSub.type][activeStage],
    [currentSub.type, activeStage]
  );

  const enabledCategories = useMemo(() => {
    const enabledSet = new Set(currentSub.enabledCategoryIds);
    return currentStageCategories.filter(category => enabledSet.has(category.id));
  }, [currentStageCategories, currentSub.enabledCategoryIds]);

  const activeStageTasks = useMemo(() => {
    const enabledSet = new Set(currentSub.enabledCategoryIds);
    return currentSub.tasks.filter(task => task.stage === activeStage && enabledSet.has(task.categoryId));
  }, [currentSub.tasks, activeStage, currentSub.enabledCategoryIds]);

  const stageOptions = useMemo<DesignStage[]>(
    () =>
      Array.from(new Set([currentSub.stage, ...currentSub.stageHistory])).sort(
        (a, b) => DESIGN_STAGES.indexOf(a) - DESIGN_STAGES.indexOf(b)
      ),
    [currentSub.stage, currentSub.stageHistory]
  );

  const minimalTasks = useMemo(() => {
    const minimalTemplates = currentStageCategories.flatMap(category => category.items.filter(item => item.minimal));
    return minimalTemplates.map(template => {
      const task = activeStageTasks.find(
        currentTask => currentTask.content === template.content && currentTask.categoryId === template.categoryId
      );
      return { ...template, task };
    });
  }, [currentStageCategories, activeStageTasks]);

  const isViewingHistory = activeStage !== currentSub.stage;
  const nextStage = DESIGN_STAGES[DESIGN_STAGES.indexOf(currentSub.stage) + 1];

  const onChangeStage = (stage: DesignStage) => {
    setActiveStage(stage);
  };

  const onSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const onToggleShowEmptyCategories = () => {
    setShowEmptyCategories(prev => !prev);
  };

  const handleStageAdvance = () => {
    if (!nextStage) return;
    if (!confirm(`确认切换到 ${nextStage} 阶段？切换后新增文件将归入新阶段。`)) return;

    updateCurrentSubProject(sp => {
      const stageHistory = Array.from(new Set([...(sp.stageHistory || []), sp.stage]));
      const stageCategoryIds = TEMPLATE_CATEGORIES[sp.type][nextStage].map(category => category.id);
      const retainedEnabled = (sp.enabledCategoryIds || []).filter(id => stageCategoryIds.includes(id));
      const enabledCategoryIds = retainedEnabled.length ? retainedEnabled : stageCategoryIds;
      const hasStageTasks = sp.tasks.some(task => task.stage === nextStage);
      const tasks = hasStageTasks
        ? sp.tasks
        : [...sp.tasks, ...buildTasksFromTemplate(sp.type, nextStage, enabledCategoryIds)];
      const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        action: '阶段切换',
        actor: actorName,
        createdAt: new Date().toISOString(),
        targetType: 'stage' as const,
        targetId: nextStage,
        detail: `从 ${sp.stage} 切换到 ${nextStage}`,
      };
      return {
        ...sp,
        stage: nextStage,
        stageHistory,
        enabledCategoryIds,
        tasks,
        operationLogs: [logEntry, ...(sp.operationLogs || [])].slice(0, 300),
      };
    });
  };

  return {
    activeStage,
    selectedCategoryId,
    showEmptyCategories,
    enabledCategories,
    activeStageTasks,
    stageOptions,
    minimalTasks,
    isViewingHistory,
    nextStage,
    onChangeStage,
    onSelectCategory,
    onToggleShowEmptyCategories,
    handleStageAdvance,
  };
};
