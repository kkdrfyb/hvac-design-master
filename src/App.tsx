import './index.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import {
  AccountUser,
  DesignProcessKind,
  DesignStage,
  FocusItem,
  MainProject,
  ProjectType,
  ReviewRecord,
  StageConfirmation,
  SubmissionFile,
  SubProject,
  ThemeColor,
  ViewState,
} from './types';
import { TEMPLATE_CATEGORIES, buildTasksFromTemplate } from './constants';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import AccountManagementView from './components/AccountManagementView';
import DashboardView from './components/dashboard/DashboardView';
import CapabilityView from './components/dashboard/CapabilityView';
import ReviewView from './components/review/ReviewView';
import ErrorsView from './components/ErrorsView';
import DesignProcessView from './components/process/DesignProcessView';
import TemplatesView from './components/templates/TemplatesView';
import LocalFolderImport from './components/scan/LocalFolderImport';
import NewProjectModal from './components/NewProjectModal';
import AddTaskModal from './components/AddTaskModal';
import { useProjectCreation } from './hooks/useProjectCreation';
import { useKnowledgePanels } from './hooks/useKnowledgePanels';
import { useTaskOperations } from './hooks/useTaskOperations';
import { useStageNavigation } from './hooks/useStageNavigation';
import { useProjectSync } from './hooks/useProjectSync';
import { useProjectBootstrap } from './hooks/useProjectBootstrap';
import { api } from './api';
import { debounce } from './utils/debounce';
import { DESIGN_PROCESS_KIND_LABELS, getDefaultProcessStages, normalizeProcessKind } from './process';

const DEFAULT_TYPE: ProjectType = '其他';
const DEFAULT_STAGE: DesignStage = '方案设计';
const createFocusItemId = () => `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createFocusItem = (stage: DesignStage, kind: string, content = ''): FocusItem => {
  const timestamp = new Date().toISOString();
  return {
    id: createFocusItemId(),
    stage,
    kind,
    content,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const ensureValidSubProject = (sp: Partial<SubProject> | any): SubProject => {
  const type: ProjectType = sp?.type || DEFAULT_TYPE;
  const stage: DesignStage = sp?.stage || DEFAULT_STAGE;
  const templateCategories = TEMPLATE_CATEGORIES[type]?.[stage] || [];
  const enabledCategoryIds =
    Array.isArray(sp?.enabledCategoryIds) && sp.enabledCategoryIds.length > 0
      ? sp.enabledCategoryIds
      : templateCategories.map(category => category.id);

  return {
    id: sp?.id || `sp_gen_${Date.now()}`,
    name: sp?.name || '未命名子项',
    code: sp?.code || '0000',
    canEdit: !!sp?.canEdit,
    type,
    stage,
    stageHistory: Array.isArray(sp?.stageHistory) ? sp.stageHistory : [],
    enabledCategoryIds,
    tasks: Array.isArray(sp?.tasks)
      ? sp.tasks.map((task: any) => ({
          ...task,
          stage: task?.stage || stage,
          status: task?.status || (task?.isCompleted ? 'COMPLETED' : 'TODO'),
          comments: Array.isArray(task?.comments) ? task.comments : [],
          versions: Array.isArray(task?.versions) ? task.versions : [],
        }))
      : buildTasksFromTemplate(type, stage, enabledCategoryIds),
    operationLogs: Array.isArray(sp?.operationLogs) ? sp.operationLogs : [],
    processStages: getDefaultProcessStages(
      stage,
      Array.isArray(sp?.stageHistory) ? sp.stageHistory : [],
      Array.isArray(sp?.processStages) ? sp.processStages : [],
      Array.isArray(sp?.processRecords)
        ? sp.processRecords.map((record: any) => record?.stage || '').filter(Boolean)
        : []
    ),
    processRecords: Array.isArray(sp?.processRecords)
      ? sp.processRecords.map((record: any) => ({
          ...record,
          kind: normalizeProcessKind(record?.kind || 'NOTE', record?.subtype || record?.title || ''),
          subtype: record?.subtype || '',
          changeSummary: record?.changeSummary || '',
          versions: Array.isArray(record?.versions) ? record.versions : [],
        }))
      : [],
    stageConfirmations:
      sp?.stageConfirmations && typeof sp.stageConfirmations === 'object'
        ? sp.stageConfirmations
        : {},
    focusItems: Array.isArray(sp?.focusItems)
      ? sp.focusItems.map((item: any) => ({
          id: item?.id || createFocusItemId(),
          stage: item?.stage || stage,
          kind: String(item?.kind || ''),
          content: String(item?.content || '').trim(),
          completed: !!item?.completed,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString(),
        }))
      : [],
    designSpecs: Array.isArray(sp?.designSpecs) ? sp.designSpecs : [],
    reviewRecords: Array.isArray(sp?.reviewRecords)
      ? sp.reviewRecords.map((record: any) => ({
          ...record,
          history: Array.isArray(record?.history) ? record.history : [],
          status: record?.status || '待整改',
        }))
      : [],
  };
};

const EMPTY_MAIN: MainProject = {
  id: '',
  name: '暂无项目',
  code: '',
  subProjects: [],
  designSpecTemplates: [],
  canEdit: false,
};

const EMPTY_SUB = ensureValidSubProject({
  id: '',
  name: '暂无子项',
  code: '',
  type: DEFAULT_TYPE,
  stage: DEFAULT_STAGE,
  enabledCategoryIds: [],
  tasks: [],
  stageHistory: [],
  operationLogs: [],
  processStages: getDefaultProcessStages(DEFAULT_STAGE),
  processRecords: [],
  stageConfirmations: {},
  focusItems: [],
  designSpecs: [],
});

const VIEW_TITLES: Record<ViewState, string> = {
  capabilities: '平台能力',
  dashboard: '项目总览',
  process: '设计过程',
  templates: '模板管理',
  regulations: '规范条文',
  errors: '常见问题',
  scan: '本机资料导入',
  review: '规范校审',
  accounts: '账户管理',
};

const PROJECT_VIEWS: ViewState[] = ['dashboard', 'process', 'templates', 'review'];

const App: React.FC = () => {
  const { user, setUser, logout, isLoading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const theme: ThemeColor = 'blue';

  const {
    projects,
    setProjects,
    currentMainId,
    setCurrentMainId,
    currentSubId,
    setCurrentSubId,
    projectsLoading,
  } = useProjectBootstrap({
    userId: user?.id ?? null,
    ensureValidSubProject,
  });

  const currentMain = useMemo(
    () => projects.find(project => project.id === currentMainId) || null,
    [projects, currentMainId]
  );
  const currentSub = useMemo(() => {
    if (!currentMain) return null;
    const matched =
      currentMain.subProjects.find(project => project.id === currentSubId) ||
      currentMain.subProjects[0] ||
      null;
    return matched ? ensureValidSubProject(matched) : null;
  }, [currentMain, currentSubId]);

  const displayMain = currentMain || EMPTY_MAIN;
  const displaySub = currentSub || EMPTY_SUB;
  const hasProjectSelection = !!currentMain && !!currentSub;
  const canEditCurrentProject =
    !!user && !!currentMain && !!currentSub && (user.role === 'admin' || !!currentSub.canEdit);

  const { updateCurrentSubProject } = useProjectSync({
    currentMainId,
    currentSubId,
    canEditCurrentProject,
    setProjects,
    ensureValidSubProject,
  });

  // 防抖自动保存：800ms 内多次变更只发一次请求
  const debouncedSave = useRef(
    debounce((project: MainProject) => {
      api.post('/projects', project).catch(error => console.error('Auto-save failed', error));
    }, 800)
  ).current;

  const updateCurrentMainProject = (updater: (main: MainProject) => MainProject) => {
    if (!currentMainId || !canEditCurrentProject) return;
    setProjects(prevProjects => {
      const nextProjects = prevProjects.map(mainProject =>
        mainProject.id === currentMainId ? updater(mainProject) : mainProject
      );
      const updatedMain = nextProjects.find(project => project.id === currentMainId);
      if (updatedMain) {
        debouncedSave(updatedMain);
      }
      return nextProjects;
    });
  };

  const {
    activeStage,
    selectedCategoryId,
    showEmptyCategories,
    enabledCategories,
    activeStageTasks,
    stageOptions,
    isViewingHistory,
    nextStage,
    onChangeStage,
    onSelectCategory,
    onToggleShowEmptyCategories,
    handleStageAdvance,
  } = useStageNavigation({
    currentSub: displaySub,
    actorName: user?.username || 'system',
    canEditCurrentProject,
    updateCurrentSubProject,
  });

  const {
    errorSearch,
    setErrorSearch,
    errorDisplayCount,
    setErrorDisplayCount,
    displayedErrors,
    refreshRandomErrors,
    knowledgeError,
    createError,
    deleteError,
    isAdmin,
  } = useKnowledgePanels({ isAdmin: user?.role === 'admin' });

  const {
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
  } = useProjectCreation({
    projects,
    setProjects,
    setCurrentMainId,
    setCurrentSubId,
  });

  const {
    addTaskModalOpen,
    addTaskCategory,
    newTaskContent,
    setNewTaskContent,
    openAddTaskModal,
    closeAddTaskModal,
    handleConfirmAddTask,
    toggleTask,
    setTaskStatus,
    setTaskBlockedReason,
    addTaskComment,
    handleDownloadFile,
    handleDeleteTask,
    handleTaskFileUpload,
    retryTaskUpload,
    uploadErrors,
    handleDeleteVersion,
  } = useTaskOperations({
    activeStage,
    currentSub: displaySub,
    currentMainId,
    currentSubId,
    actorName: user?.username || 'system',
    canEditCurrentProject,
    updateCurrentSubProject,
  });

  const refreshAccounts = async () => {
    if (user?.role !== 'admin') {
      setAccounts([]);
      return;
    }
    setAccountsLoading(true);
    try {
      const data = await api.get('/auth/users');
      setAccounts(Array.isArray(data) ? data : Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error('Failed to fetch users', error);
      throw error;
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'accounts' && user?.role !== 'admin') {
      setCurrentView('dashboard');
    }
  }, [currentView, user?.role]);

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshAccounts().catch(error => console.error('Failed to refresh users', error));
    } else {
      setAccounts([]);
      setAccountsLoading(false);
    }
  }, [user?.id, user?.role]);

  const openPasswordModal = () => {
    setOldPassword('123456');
    setNewPassword('');
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setOldPassword('123456');
    setNewPassword('');
    setPasswordError('');
    setPasswordModalOpen(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword.trim()) {
      setPasswordError('请输入新密码');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setUser(prev => (prev ? { ...prev, mustChangePassword: false } : prev));
      closePasswordModal();
      alert('密码修改成功');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '密码修改失败');
    } finally {
      setPasswordSaving(false);
    }
  };

  const triggerDownload = async (path: string, fallbackName: string) => {
    try {
      const { blob, fileName } = await api.downloadFile(path);
      const downloadName = fileName || fallbackName;
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Export failed', error);
      alert(error instanceof Error ? error.message : '导出失败，请稍后重试。');
    }
  };

  const handleExportCurrentStage = () => {
    if (!currentMain) return;
    triggerDownload(
      `/projects/${currentMainId}/export?stage=${encodeURIComponent(activeStage)}`,
      `${currentMain.name}_${currentMain.code}_${activeStage}.zip`
    );
  };

  const handleExportProject = () => {
    if (!currentMain) return;
    triggerDownload(
      `/projects/${currentMainId}/export`,
      `${currentMain.name}_${currentMain.code}_all.zip`
    );
  };

  const handleDownloadSubmissionFile = async (file: SubmissionFile) => {
    const targetPath = file.downloadPath || (file.id ? `/files/${file.id}` : '');
    if (!targetPath) return;
    try {
      const { blob, fileName } = await api.downloadFile(targetPath);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName || file.name || 'download.bin';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('File download failed', error);
      alert('文件下载失败，请稍后重试。');
    }
  };

  const handleProcessFileUpload = async (params: {
    recordId: string;
    stage: DesignStage;
    kind: DesignProcessKind;
    subtype: string;
    title: string;
    files: File[];
  }) => {
    if (!canEditCurrentProject || !currentMain || !currentSub) return;
    const response = await api.uploadFiles(
      `/projects/${currentMainId}/subprojects/${currentSubId}/process-record-files`,
      params.files,
      {
        recordId: params.recordId,
        stage: params.stage,
        kind: params.kind,
        subtype: params.subtype,
        title: params.title,
      }
    );
    updateCurrentSubProject(sub => ({
      ...sub,
      processStages: Array.from(new Set([...(sub.processStages || []), params.stage])),
      processRecords: (sub.processRecords || [])
        .map(record =>
          record.id === response.record.id ? { ...record, ...response.record } : record
        )
        .concat(
          (sub.processRecords || []).some(record => record.id === response.record.id)
            ? []
            : [response.record]
        ),
      operationLogs:
        response.logs && Array.isArray(response.logs)
          ? [...response.logs, ...(sub.operationLogs || [])].slice(0, 300)
          : sub.operationLogs,
    }));
  };

  const handleToggleStageConfirmation = (
    stage: DesignStage,
    nextConfirmation: StageConfirmation
  ) => {
    if (!canEditCurrentProject) return;
    updateCurrentSubProject(sub => ({
      ...sub,
      stageConfirmations: {
        ...(sub.stageConfirmations || {}),
        [stage]: nextConfirmation,
      },
      operationLogs: [
        {
          id: `log_${Date.now()}`,
          action: nextConfirmation.confirmed ? '确认阶段完成' : '取消阶段完成确认',
          actor: user?.username || 'system',
          createdAt: new Date().toISOString(),
          targetType: 'stage',
          targetId: stage,
          detail: nextConfirmation.confirmed ? `${stage} 已确认完成` : `${stage} 已取消确认`,
        },
        ...(sub.operationLogs || []),
      ].slice(0, 300),
    }));
  };

  const handleCreateFocusItem = (stage: DesignStage, kind: string) => {
    if (!canEditCurrentProject) return null;
    const focusItem = createFocusItem(stage, kind);
    updateCurrentSubProject(sub => ({
      ...sub,
      focusItems: [...(sub.focusItems || []), focusItem],
    }));
    return focusItem;
  };

  const handleUpdateFocusItem = (
    focusItemId: string,
    patch: Partial<Pick<FocusItem, 'content' | 'completed'>>
  ) => {
    if (!canEditCurrentProject) return;
    updateCurrentSubProject(sub => ({
      ...sub,
      focusItems: (sub.focusItems || []).map(item =>
        item.id === focusItemId
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  };

  const handleDeleteFocusItem = (focusItemId: string) => {
    if (!canEditCurrentProject) return;
    updateCurrentSubProject(sub => ({
      ...sub,
      focusItems: (sub.focusItems || []).filter(item => item.id !== focusItemId),
    }));
  };

  const handleCreateReview = (record: ReviewRecord) => {
    if (!canEditCurrentProject) return;
    updateCurrentSubProject(sub => ({
      ...sub,
      reviewRecords: [record, ...(sub.reviewRecords || [])],
      operationLogs: [
        {
          id: `log_${Date.now()}`,
          action: '发起校审记录',
          actor: user?.username || 'system',
          createdAt: new Date().toISOString(),
          targetType: 'review',
          targetId: record.id,
          detail: `${record.kind} · ${record.stage} · ${record.target}`,
        },
        ...(sub.operationLogs || []),
      ].slice(0, 300),
    }));
  };

  const handleUpdateReview = (
    reviewId: string,
    patch: Partial<ReviewRecord>,
    action: string
  ) => {
    if (!canEditCurrentProject) return;
    updateCurrentSubProject(sub => ({
      ...sub,
      reviewRecords: (sub.reviewRecords || []).map(record =>
        record.id === reviewId ? { ...record, ...patch } : record
      ),
      operationLogs: [
        {
          id: `log_${Date.now()}`,
          action: `校审${action}`,
          actor: user?.username || 'system',
          createdAt: new Date().toISOString(),
          targetType: 'review',
          targetId: reviewId,
          detail: patch.reviewComment || patch.correction || '',
        },
        ...(sub.operationLogs || []),
      ].slice(0, 300),
    }));
  };

  const emptyProjectView = (
    <div className="h-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm text-center">
        <h3 className="text-xl font-black text-slate-800">当前还没有可展示的项目</h3>
        <p className="text-sm text-slate-500 mt-3">
          {user?.role === 'admin'
            ? '你可以先创建项目，再给不同账户分配可编辑权限。'
            : '管理员暂未分配项目。等项目创建后，你会默认看到自己有权限的项目。'}
        </p>
        {user?.role === 'admin' ? (
          <button
            type="button"
            onClick={openNewProjectModal}
            className="mt-6 px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            创建第一个项目?          </button>
        ) : null}
      </div>
    </div>
  );

  const currentViewContent = (() => {
    if (!hasProjectSelection && PROJECT_VIEWS.includes(currentView)) {
      return emptyProjectView;
    }

    if (currentView === 'capabilities') {
      return (
        <CapabilityView
          mainName={displayMain.name}
          subName={displaySub.name}
          currentStage={displaySub.stage}
          reviewRecords={displaySub.reviewRecords || []}
          processRecords={displaySub.processRecords || []}
          logs={displaySub.operationLogs || []}
          focusItems={displaySub.focusItems || []}
          onNavigate={view => setCurrentView(view)}
        />
      );
    }

    if (currentView === 'process') {
      return (
        <DesignProcessView
          currentStage={displaySub.stage}
          processStages={displaySub.processStages || []}
          processRecords={displaySub.processRecords || []}
          logs={displaySub.operationLogs}
          actorName={user?.username || 'system'}
          readOnly={!canEditCurrentProject}
          onUpdateRecordSummary={(recordId, changeSummary) => {
            updateCurrentSubProject(sub => ({
              ...sub,
              processRecords: (sub.processRecords || []).map(record =>
                record.id === recordId ? { ...record, changeSummary } : record
              ),
            }));
          }}
          onAddStage={stageName => {
            if (!canEditCurrentProject) return;
            updateCurrentSubProject(sub => {
              const normalized = stageName.trim();
              if (!normalized) return sub;
              return {
                ...sub,
                processStages: Array.from(new Set([...(sub.processStages || []), normalized])),
                operationLogs: [
                  {
                    id: `log_${Date.now()}`,
                    action: '新增设计阶段',
                    actor: user?.username || 'system',
                    createdAt: new Date().toISOString(),
                    targetType: 'process',
                    targetId: normalized,
                    detail: normalized,
                  },
                  ...(sub.operationLogs || []),
                ].slice(0, 300),
              };
            });
          }}
          onDeleteStage={stageName => {
            if (!canEditCurrentProject) return;
            updateCurrentSubProject(sub => {
              if ((sub.processRecords || []).some(record => record.stage === stageName)) {
                return sub;
              }
              return {
                ...sub,
                processStages: (sub.processStages || []).filter(item => item !== stageName),
                operationLogs: [
                  {
                    id: `log_${Date.now()}`,
                    action: '删除设计阶段',
                    actor: user?.username || 'system',
                    createdAt: new Date().toISOString(),
                    targetType: 'process',
                    targetId: stageName,
                    detail: stageName,
                  },
                  ...(sub.operationLogs || []),
                ].slice(0, 300),
              };
            });
          }}
          onAddRecord={({ stage, kind, subtype, title, detail }) => {
            if (!canEditCurrentProject) return;
            updateCurrentSubProject(sub => {
              const recordId = `process_${Date.now()}`;
              return {
                ...sub,
                processStages: Array.from(new Set([...(sub.processStages || []), stage])),
                processRecords: [
                  {
                    id: recordId,
                    stage,
                    kind,
                    subtype,
                    title,
                    detail,
                    changeSummary: '',
                    createdAt: new Date().toISOString(),
                    createdBy: user?.username || 'system',
                  },
                  ...(sub.processRecords || []),
                ],
                operationLogs: [
                  {
                    id: `log_${Date.now()}`,
                    action: '新增设计过程记录',
                    actor: user?.username || 'system',
                    createdAt: new Date().toISOString(),
                    targetType: 'process',
                    targetId: recordId,
                    detail: `${stage} 路 ${subtype || DESIGN_PROCESS_KIND_LABELS[kind]} 路 ${title}${detail ? `（${detail}）` : ''}`,
                  },
                  ...(sub.operationLogs || []),
                ].slice(0, 300),
              };
            });
          }}
          onUploadFiles={handleProcessFileUpload}
          onDownloadFile={handleDownloadSubmissionFile}
        />
      );
    }

    if (currentView === 'review') {
      return (
        <ReviewView
          records={displaySub.reviewRecords || []}
          stages={displaySub.processStages || []}
          currentStage={displaySub.stage}
          actorName={user?.username || 'system'}
          readOnly={!canEditCurrentProject}
          onCreate={handleCreateReview}
          onUpdate={handleUpdateReview}
        />
      );
    }

    if (currentView === 'dashboard') {
      return (
        <DashboardView
          actorName={user?.username || 'system'}
          currentMain={displayMain}
          currentSub={displaySub}
          activeStage={activeStage}
          processStages={displaySub.processStages || []}
          processRecords={displaySub.processRecords || []}
          stageOptions={stageOptions}
          selectedCategoryId={selectedCategoryId}
          showEmptyCategories={showEmptyCategories}
          enabledCategories={enabledCategories}
          activeStageTasks={activeStageTasks}
          theme={theme}
          isViewingHistory={isViewingHistory}
          readOnlyProject={!canEditCurrentProject}
          nextStage={nextStage}
          onChangeStage={onChangeStage}
          onAdvanceStage={handleStageAdvance}
          onExportCurrentStage={handleExportCurrentStage}
          onExportProject={handleExportProject}
          onSelectCategory={onSelectCategory}
          onToggleShowEmptyCategories={onToggleShowEmptyCategories}
          onUploadProcessFiles={handleProcessFileUpload}
          onDownloadProcessFile={handleDownloadSubmissionFile}
          onOpenErrors={() => setCurrentView('errors')}
          onToggleTask={toggleTask}
          onChangeTaskStatus={setTaskStatus}
          onChangeTaskBlockedReason={setTaskBlockedReason}
          onAddTaskComment={addTaskComment}
          onUploadTaskFile={handleTaskFileUpload}
          onRetryTaskUpload={retryTaskUpload}
          uploadErrors={uploadErrors}
          onToggleStageConfirmation={handleToggleStageConfirmation}
          onDownloadFile={handleDownloadFile}
          onDeleteVersion={handleDeleteVersion}
          onDeleteTask={handleDeleteTask}
          onOpenAddTaskModal={openAddTaskModal}
          focusItems={displaySub.focusItems || []}
          onCreateFocusItem={handleCreateFocusItem}
          onUpdateFocusItem={handleUpdateFocusItem}
          onDeleteFocusItem={handleDeleteFocusItem}
        />
      );
    }

    if (currentView === 'templates') {
      return (
        <TemplatesView
          theme={theme}
          currentMain={displayMain}
          currentSub={displaySub}
          readOnly={!canEditCurrentProject}
          onUpdateMain={updateCurrentMainProject}
          onUpdateSub={updateCurrentSubProject}
        />
      );
    }

    if (currentView === 'scan') {
      if (!hasProjectSelection) return emptyProjectView;
      return (
        <LocalFolderImport
          currentMainId={currentMainId}
          currentSubId={currentSubId}
          currentStage={displaySub.stage}
          actorName={user?.username || 'system'}
          readOnly={!canEditCurrentProject}
          onViewProcess={() => setCurrentView('process')}
        />
      );
    }

    if (currentView === 'errors') {
      return (
        <ErrorsView
          errorSearch={errorSearch}
          errorDisplayCount={errorDisplayCount}
          displayedErrors={displayedErrors}
          onErrorSearchChange={value => setErrorSearch(value)}
          onErrorDisplayCountChange={value => setErrorDisplayCount(value)}
          onRefresh={refreshRandomErrors}
          knowledgeError={knowledgeError}
          isAdmin={isAdmin}
          onCreateError={createError}
          onDeleteError={deleteError}
        />
      );
    }

    if (user?.role !== 'admin') {
      return (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          当前账户无权访问账户管理。        </div>
      );
    }

    if (accountsLoading) {
      return (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          正在加载账户信息...
        </div>
      );
    }

    return (
      <AccountManagementView
        users={accounts}
        projects={projects}
        currentUserId={user?.id ?? 0}
        onRefreshUsers={refreshAccounts}
      />
    );
  })();

  const menuItems: Array<{ id: ViewState; label: string; icon: string }> = [
    { id: 'capabilities', label: '平台能力', icon: '台' },
    { id: 'dashboard', label: '项目总览', icon: '总' },
    { id: 'process', label: '设计过程', icon: '流' },
    { id: 'review', label: '规范校审', icon: '审' },
    { id: 'templates', label: '标准化设计', icon: '模' },
    { id: 'scan' as ViewState, label: '本机资料导入', icon: '导' },
    { id: 'errors', label: '常见问题', icon: '问' },
    ...(user?.role === 'admin'
      ? [{ id: 'accounts' as ViewState, label: '账户管理', icon: '账' }]
      : []),
  ];

  if (authLoading || (user && projectsLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen max-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0 h-full">
        <div className="p-6 border-b border-slate-100 flex-shrink-0">
          <h1 className="text-base font-black text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
            <span className={`w-8 h-8 bg-${theme}-600 text-white rounded-lg flex items-center justify-center text-sm shadow-lg shadow-${theme}-100 flex-shrink-0`}>
              H
            </span>
            暖通室信息化管理平台          </h1>
          <div className="mt-4 flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
            <div className={`w-10 h-10 bg-${theme}-100 text-${theme}-600 rounded-full flex items-center justify-center font-black shadow-sm`}>
              {user.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 truncate">{user.username}</p>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {user.role === 'admin' ? '管理员账户' : '普通账户'}
              </span>
            </div>
          </div>
          {user.mustChangePassword ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              当前仍在使用默认密码，建议尽快修改。            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-4 pt-3">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-hide">
              <section className="flex min-h-0 flex-col">
            <label className="mb-3 block px-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
              项目导航
            </label>
            <Sidebar
              projects={projects}
              currentMainId={currentMainId}
              currentSubId={currentSubId}
              onSelectProject={(mainId, subId) => {
                setCurrentMainId(mainId);
                setCurrentSubId(subId);
                setCurrentView('dashboard');
              }}
              onCreateProject={openNewProjectModal}
              canCreateProject={user.role === 'admin'}
              theme={theme}
            />
          </section>

          <section className="mt-5">
            <label className="mb-3 block px-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
              功能菜单
            </label>
            <div className="space-y-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === item.id
                      ? `bg-${theme}-50 text-${theme}-700 shadow-sm border border-${theme}-100`
                      : 'text-slate-500 hover:bg-slate-50 border border-transparent hover:translate-x-1'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          </div>
        </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 space-y-2">
          <button
            type="button"
            onClick={openPasswordModal}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black shadow-sm border border-slate-200 transition-all"
          >
            修改密码
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl text-xs font-black shadow-sm border border-slate-200 transition-all"
          >
            退出登录?          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <span className="truncate max-w-[150px]">{displayMain.name || '暂无项目'}</span>
              {hasProjectSelection ? <span className="text-slate-200">/</span> : null}
              {hasProjectSelection ? <span className={`text-${theme}-600`}>{displaySub.name}</span> : null}
              {hasProjectSelection && !canEditCurrentProject ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-700">
                  只读
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
              {VIEW_TITLES[currentView]}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {hasProjectSelection
                ? canEditCurrentProject
                  ? '当前项目可编辑'
                  : '当前项目只读'
                : '等待项目数据'}
            </div>
            {user.role !== 'admin' ? (
              <div className="text-[11px] text-slate-400 mt-1">
                已分配可编辑子项 {(user.editableSubprojectPermissions || []).length} 涓?              </div>
            ) : null}
          </div>
        </header>

        <div className="flex-1 min-h-0 bg-slate-50 p-6 overflow-hidden">
          <div className="h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-200/60 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto custom-scrollbar">{currentViewContent}</div>
          </div>
        </div>
      </main>

      {showNewProjectModal ? (
        <NewProjectModal
          theme={theme}
          data={newProjectData}
          importing={importingProjects}
          onChange={setNewProjectData}
          onTemplateSelectionChange={handleTemplateSelectionChange}
          onToggleCategory={toggleNewCategory}
          onCancel={closeNewProjectModal}
          onConfirm={handleCreateProject}
          onImportProjects={handleImportProjects}
        />
      ) : null}

      {addTaskModalOpen ? (
        <AddTaskModal
          theme={theme}
          category={addTaskCategory}
          content={newTaskContent}
          onContentChange={setNewTaskContent}
          onCancel={closeAddTaskModal}
          onConfirm={handleConfirmAddTask}
        />
      ) : null}

      {passwordModalOpen ? (
        <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white border border-slate-200 shadow-2xl p-8">
            <h3 className="text-2xl font-black text-slate-800">修改密码</h3>
            <p className="text-sm text-slate-500 mt-2">默认密码是 123456，你可以随时在这里修改。</p>
            {passwordError ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {passwordError}
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="旧密码"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="新密码（至少 6 位）"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={passwordSaving}
                onClick={handleChangePassword}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {passwordSaving ? '保存中...' : '保存新密码'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;

