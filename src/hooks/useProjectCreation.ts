import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../api';
import { buildTasksFromTemplate, TEMPLATE_CATEGORIES } from '../constants';
import { getDefaultProcessStages } from '../process';
import { DesignStage, MainProject, NewProjectDraft, ProjectType, SubProject } from '../types';

interface UseProjectCreationOptions {
  projects: MainProject[];
  setProjects: Dispatch<SetStateAction<MainProject[]>>;
  setCurrentMainId: (id: string) => void;
  setCurrentSubId: (id: string) => void;
}

interface ImportedProjectRow {
  mainName: string;
  mainCode: string;
  subName: string;
  subCode: string;
  type: ProjectType;
  stage: DesignStage;
  enabledCategoryIds?: string[];
}

const DEFAULT_PROJECT_TYPE: ProjectType = '附属工业厂房';
const DEFAULT_STAGE: DesignStage = '初步设计';

const createDefaultNewProjectDraft = (): NewProjectDraft => ({
  mainName: '',
  mainCode: '',
  subName: '',
  subCode: '',
  type: DEFAULT_PROJECT_TYPE,
  stage: DEFAULT_STAGE,
  enabledCategoryIds: TEMPLATE_CATEGORIES[DEFAULT_PROJECT_TYPE][DEFAULT_STAGE].map(category => category.id),
});

const resolveEnabledCategoryIds = (
  type: ProjectType,
  stage: DesignStage,
  enabledCategoryIds?: string[]
) => {
  const categories = TEMPLATE_CATEGORIES[type][stage];
  const availableCategoryIds = categories.map(category => category.id);
  const nextIds = (enabledCategoryIds || [])
    .map(categoryToken => {
      const normalizedToken = String(categoryToken || '').trim().toLowerCase();
      const matchedCategory = categories.find(category => {
        const normalizedId = category.id.trim().toLowerCase();
        const normalizedName = category.name.trim().toLowerCase();
        return normalizedToken === normalizedId || normalizedToken === normalizedName;
      });
      return matchedCategory?.id || '';
    })
    .filter(categoryId => availableCategoryIds.includes(categoryId));
  return nextIds.length ? nextIds : availableCategoryIds;
};

const buildSubProject = (draft: ImportedProjectRow): SubProject => {
  const enabledCategoryIds = resolveEnabledCategoryIds(
    draft.type,
    draft.stage,
    draft.enabledCategoryIds
  );

  return {
    id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: draft.subName,
    code: draft.subCode,
    type: draft.type,
    stage: draft.stage,
    stageHistory: [],
    enabledCategoryIds,
    tasks: buildTasksFromTemplate(draft.type, draft.stage, enabledCategoryIds),
    operationLogs: [],
    processStages: getDefaultProcessStages(draft.stage),
    processRecords: [],
    focusItems: [],
    designSpecs: [],
  };
};

const findMainProject = (projects: MainProject[], draft: ImportedProjectRow) =>
  projects.find(project => {
    const sameCode =
      draft.mainCode.trim() &&
      project.code.trim() &&
      project.code.trim().toLowerCase() === draft.mainCode.trim().toLowerCase();
    const sameName = project.name.trim().toLowerCase() === draft.mainName.trim().toLowerCase();
    return sameCode || sameName;
  });

const findSubProject = (subProjects: SubProject[], draft: ImportedProjectRow) =>
  subProjects.find(subProject => {
    const sameCode =
      draft.subCode.trim() &&
      subProject.code.trim() &&
      subProject.code.trim().toLowerCase() === draft.subCode.trim().toLowerCase();
    const sameName = subProject.name.trim().toLowerCase() === draft.subName.trim().toLowerCase();
    return sameCode || sameName;
  });

const applyDraftToProjects = (
  projects: MainProject[],
  draft: ImportedProjectRow
): { projects: MainProject[]; persistedProject: MainProject; mainId: string; subId: string } => {
  const nextSubProject = buildSubProject(draft);
  const existingMain = findMainProject(projects, draft);

  if (existingMain) {
    const existingSub = findSubProject(existingMain.subProjects || [], draft);
    const nextMain: MainProject = {
      ...existingMain,
      code: draft.mainCode || existingMain.code,
      subProjects: existingSub
        ? existingMain.subProjects.map(subProject =>
            subProject.id === existingSub.id ? { ...nextSubProject, id: existingSub.id } : subProject
          )
        : [...existingMain.subProjects, nextSubProject],
    };
    const nextProjects = projects.map(project => (project.id === existingMain.id ? nextMain : project));
    return {
      projects: nextProjects,
      persistedProject: nextMain,
      mainId: nextMain.id,
      subId: existingSub?.id || nextSubProject.id,
    };
  }

  const nextMain: MainProject = {
    id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: draft.mainName,
    code: draft.mainCode,
    designSpecTemplates: [],
    subProjects: [nextSubProject],
  };

  return {
    projects: [...projects, nextMain],
    persistedProject: nextMain,
    mainId: nextMain.id,
    subId: nextSubProject.id,
  };
};

const sanitizeImportedDraft = (row: Partial<ImportedProjectRow>): ImportedProjectRow => {
  const type =
    row.type && row.type in TEMPLATE_CATEGORIES ? row.type : DEFAULT_PROJECT_TYPE;
  const stage =
    row.stage && row.stage in TEMPLATE_CATEGORIES[type]
      ? row.stage
      : DEFAULT_STAGE;

  return {
    mainName: String(row.mainName || '').trim(),
    mainCode: String(row.mainCode || '').trim(),
    subName: String(row.subName || '').trim(),
    subCode: String(row.subCode || '').trim(),
    type,
    stage,
    enabledCategoryIds: Array.isArray(row.enabledCategoryIds) ? row.enabledCategoryIds : undefined,
  };
};

export const useProjectCreation = ({
  projects,
  setProjects,
  setCurrentMainId,
  setCurrentSubId,
}: UseProjectCreationOptions) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState<NewProjectDraft>(createDefaultNewProjectDraft());
  const [importingProjects, setImportingProjects] = useState(false);

  const openNewProjectModal = useCallback(() => {
    setShowNewProjectModal(true);
  }, []);

  const closeNewProjectModal = useCallback(() => {
    setShowNewProjectModal(false);
  }, []);

  const resetNewProjectData = useCallback(() => {
    setNewProjectData(createDefaultNewProjectDraft());
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!(newProjectData.mainName && newProjectData.subName)) return;

    const draft = sanitizeImportedDraft(newProjectData);
    const result = applyDraftToProjects(projects, draft);

    setProjects(result.projects);
    setCurrentMainId(result.mainId);
    setCurrentSubId(result.subId);
    await api.post('/projects', result.persistedProject);

    setShowNewProjectModal(false);
    resetNewProjectData();
  }, [
    newProjectData,
    projects,
    resetNewProjectData,
    setCurrentMainId,
    setCurrentSubId,
    setProjects,
  ]);

  const handleImportProjects = useCallback(
    async (file: File) => {
      setImportingProjects(true);
      try {
        const response = await api.uploadFiles('/projects/import', [file]);
        const importedRows = Array.isArray(response?.rows) ? response.rows : [];
        if (!importedRows.length) {
          throw new Error('导入文件中没有可用的项目数据');
        }

        let nextProjects = [...projects];
        let lastSelection: { mainId: string; subId: string } | null = null;

        for (const row of importedRows) {
          const draft = sanitizeImportedDraft(row);
          if (!(draft.mainName && draft.subName)) {
            continue;
          }
          const result = applyDraftToProjects(nextProjects, draft);
          nextProjects = result.projects;
          lastSelection = { mainId: result.mainId, subId: result.subId };
          await api.post('/projects', result.persistedProject);
        }

        setProjects(nextProjects);
        if (lastSelection) {
          setCurrentMainId(lastSelection.mainId);
          setCurrentSubId(lastSelection.subId);
        }
        setShowNewProjectModal(false);
        resetNewProjectData();
      } finally {
        setImportingProjects(false);
      }
    },
    [projects, resetNewProjectData, setCurrentMainId, setCurrentSubId, setProjects]
  );

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
    handleImportProjects,
    importingProjects,
    handleTemplateSelectionChange,
    toggleNewCategory,
  };
};
