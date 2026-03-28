import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../api';
import { buildTasksFromTemplate, TEMPLATE_CATEGORIES } from '../constants';
import { DesignStage, MainProject, NewProjectDraft, ProjectType, SubProject } from '../types';

interface UseProjectCreationOptions {
  projects: MainProject[];
  setProjects: Dispatch<SetStateAction<MainProject[]>>;
  setCurrentMainId: (id: string) => void;
  setCurrentSubId: (id: string) => void;
}

const createDefaultNewProjectDraft = (): NewProjectDraft => ({
  mainName: '',
  mainCode: '',
  subName: '',
  subCode: '',
  type: '附属工业厂房',
  stage: '初步设计',
  enabledCategoryIds: TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id),
});

export const useProjectCreation = ({
  projects,
  setProjects,
  setCurrentMainId,
  setCurrentSubId,
}: UseProjectCreationOptions) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState<NewProjectDraft>(createDefaultNewProjectDraft());

  const openNewProjectModal = useCallback(() => {
    setShowNewProjectModal(true);
  }, []);

  const closeNewProjectModal = useCallback(() => {
    setShowNewProjectModal(false);
  }, []);

  const resetNewProjectData = useCallback(() => {
    setNewProjectData(createDefaultNewProjectDraft());
  }, []);

  const handleCreateProject = useCallback(() => {
    if (!(newProjectData.mainName && newProjectData.subName)) return;

    const enabledCategoryIds = newProjectData.enabledCategoryIds.length
      ? newProjectData.enabledCategoryIds
      : TEMPLATE_CATEGORIES[newProjectData.type][newProjectData.stage].map(category => category.id);

    const newSub: SubProject = {
      id: `sp_${Date.now()}`,
      name: newProjectData.subName,
      code: newProjectData.subCode,
      type: newProjectData.type,
      stage: newProjectData.stage,
      stageHistory: [],
      enabledCategoryIds,
      tasks: buildTasksFromTemplate(newProjectData.type, newProjectData.stage, enabledCategoryIds),
      operationLogs: [],
      designSpecs: [],
    };

    const existingMain = projects.find(project => project.name === newProjectData.mainName);
    if (existingMain) {
      const updatedProjects = projects.map(project =>
        project.id === existingMain.id ? { ...project, subProjects: [...project.subProjects, newSub] } : project
      );
      setProjects(updatedProjects);
      setCurrentMainId(existingMain.id);
      setCurrentSubId(newSub.id);
      const updatedMain = updatedProjects.find(project => project.id === existingMain.id);
      if (updatedMain) {
        api.post('/projects', updatedMain).catch(error => console.error(error));
      }
    } else {
      const newMain: MainProject = {
        id: `mp_${Date.now()}`,
        name: newProjectData.mainName,
        code: newProjectData.mainCode,
        designSpecTemplates: [],
        subProjects: [newSub],
      };
      setProjects([...projects, newMain]);
      setCurrentMainId(newMain.id);
      setCurrentSubId(newSub.id);
      api.post('/projects', newMain).catch(error => console.error(error));
    }

    setShowNewProjectModal(false);
    resetNewProjectData();
  }, [newProjectData, projects, resetNewProjectData, setCurrentMainId, setCurrentSubId, setProjects]);

  const handleTemplateSelectionChange = useCallback((nextType: ProjectType, nextStage: DesignStage) => {
    const categoryIds = TEMPLATE_CATEGORIES[nextType][nextStage].map(category => category.id);
    setNewProjectData(prev => ({
      ...prev,
      type: nextType,
      stage: nextStage,
      enabledCategoryIds: categoryIds,
    }));
  }, []);

  const toggleNewCategory = useCallback((categoryId: string) => {
    setNewProjectData(prev => {
      const next = new Set(prev.enabledCategoryIds);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return { ...prev, enabledCategoryIds: Array.from(next) };
    });
  }, []);

  return {
    showNewProjectModal,
    newProjectData,
    setNewProjectData,
    openNewProjectModal,
    closeNewProjectModal,
    handleCreateProject,
    handleTemplateSelectionChange,
    toggleNewCategory,
  };
};
