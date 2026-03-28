import './index.css';
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import { ViewState, SubProject, ThemeColor, DesignStage, ProjectType, MainProject } from './types';
import { INITIAL_PROJECTS, TEMPLATE_CATEGORIES, buildTasksFromTemplate } from './constants';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import DashboardView from './components/dashboard/DashboardView';
import RegulationsView from './components/RegulationsView';
import ErrorsView from './components/ErrorsView';
import DesignProcessView from './components/process/DesignProcessView';
import TemplatesView from './components/templates/TemplatesView';
import NewProjectModal from './components/NewProjectModal';
import AddTaskModal from './components/AddTaskModal';
import { useProjectCreation } from './hooks/useProjectCreation';
import { useKnowledgePanels } from './hooks/useKnowledgePanels';
import { useTaskOperations } from './hooks/useTaskOperations';
import { useStageNavigation } from './hooks/useStageNavigation';
import { useProjectSync } from './hooks/useProjectSync';
import { useProjectBootstrap } from './hooks/useProjectBootstrap';
import { api } from './api';
const ensureValidSubProject = (sp: Partial<SubProject> | any): SubProject => {
    const type: ProjectType = sp?.type || '其他';
    const stage: DesignStage = sp?.stage || '方案设计';
    const enabledCategoryIds = Array.isArray(sp?.enabledCategoryIds)
        ? sp.enabledCategoryIds
        : TEMPLATE_CATEGORIES[type][stage].map(category => category.id);
    return {
        id: sp?.id || `sp_gen_${Date.now()}`,
        name: sp?.name || '未命名子项',
        code: sp?.code || '0000',
        type,
        stage,
        stageHistory: Array.isArray(sp?.stageHistory) ? sp.stageHistory : [],
        enabledCategoryIds,
        tasks: Array.isArray(sp?.tasks) ? sp.tasks.map((t: any) => ({
            ...t,
            stage: t?.stage || stage,
            status: t?.status || (t?.isCompleted ? 'COMPLETED' : 'TODO'),
            comments: Array.isArray(t?.comments) ? t.comments : [],
            versions: Array.isArray(t?.versions) ? t.versions : []
        })) : buildTasksFromTemplate(type, stage, enabledCategoryIds),
        operationLogs: Array.isArray(sp?.operationLogs) ? sp.operationLogs : [],
        designSpecs: Array.isArray(sp?.designSpecs) ? sp.designSpecs : [],
    };
};

const VIEW_TITLES: Record<ViewState, string> = {
    process: '设计过程',
    dashboard: '子项主页',
    templates: '模板管理',
    regulations: '规范条文',
    errors: '设计常见问题'
};

const App: React.FC = () => {
    const { user, logout, isLoading: authLoading } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Global View State
    const [currentView, setCurrentView] = useState<ViewState>('process');
    const theme: ThemeColor = 'blue';

    const {
        projects,
        setProjects,
        currentMainId,
        setCurrentMainId,
        currentSubId,
        setCurrentSubId,
        projectsLoading
    } = useProjectBootstrap({
        userId: user?.id ?? null,
        ensureValidSubProject
    });

    // Computed Current Project Data
    const currentMain = useMemo(() => {
        return projects.find(p => p.id === currentMainId) || projects[0] || INITIAL_PROJECTS[0];
    }, [projects, currentMainId]);

    const currentSub = useMemo(() => {
        if (!currentMain) return ensureValidSubProject({});
        const sub = currentMain.subProjects?.find(s => s.id === currentSubId) || currentMain.subProjects?.[0];
        return ensureValidSubProject(sub);
    }, [currentMain, currentSubId]);

    const { updateCurrentSubProject } = useProjectSync({
        currentMainId,
        currentSubId,
        setProjects,
        ensureValidSubProject
    });

    const updateCurrentMainProject = (updater: (main: MainProject) => MainProject) => {
        setProjects(prevProjects => {
            const nextProjects = prevProjects.map(mainProject => {
                if (mainProject.id === currentMainId) {
                    return updater(mainProject);
                }
                return mainProject;
            });

            const updatedMain = nextProjects.find(project => project.id === currentMainId);
            if (updatedMain) {
                api.post('/projects', updatedMain).catch(error => console.error('Auto-save failed', error));
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
        minimalTasks,
        isViewingHistory,
        nextStage,
        onChangeStage,
        onSelectCategory,
        onToggleShowEmptyCategories,
        handleStageAdvance
    } = useStageNavigation({
        currentSub,
        actorName: user?.username || 'system',
        updateCurrentSubProject
    });

    const {
        clauseSearch,
        setClauseSearch,
        displayCount,
        setDisplayCount,
        displayedClauses,
        refreshRandomClauses,
        errorSearch,
        setErrorSearch,
        errorDisplayCount,
        setErrorDisplayCount,
        displayedErrors,
        refreshRandomErrors,
        knowledgeError,
        createClause,
        deleteClause,
        createError,
        deleteError,
        isAdmin
    } = useKnowledgePanels({ isAdmin: user?.role === 'admin' });

    const {
        showNewProjectModal,
        newProjectData,
        setNewProjectData,
        openNewProjectModal,
        closeNewProjectModal,
        handleCreateProject,
        handleTemplateSelectionChange,
        toggleNewCategory
    } = useProjectCreation({
        projects,
        setProjects,
        setCurrentMainId,
        setCurrentSubId
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
        handleDeleteVersion
    } = useTaskOperations({
        activeStage,
        currentSub,
        currentMainId,
        currentSubId,
        actorName: user?.username || 'system',
        updateCurrentSubProject
    });

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
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Export failed', err);
            alert(err instanceof Error ? err.message : '导出失败，请稍后重试。');
        }
    };

    const handleExportCurrentStage = () => {
        triggerDownload(
            `/projects/${currentMainId}/export?stage=${encodeURIComponent(activeStage)}`,
            `${currentMain.name}_${currentMain.code}_${activeStage}.zip`
        );
    };

    const handleExportProject = () => {
        triggerDownload(
            `/projects/${currentMainId}/export`,
            `${currentMain.name}_${currentMain.code}_all.zip`
        );
    };

    const currentViewContent = {
        process: (
            <DesignProcessView
                logs={currentSub.operationLogs}
                actorName={user?.username || 'system'}
                onAddNote={(content) => {
                    updateCurrentSubProject(sub => {
                        const now = new Date().toISOString();
                        const nextLog = {
                            id: `log_${Date.now()}`,
                            action: '设计备注',
                            actor: user?.username || 'system',
                            createdAt: now,
                            targetType: 'comment',
                            targetId: 'note',
                            detail: content,
                        };
                        return {
                            ...sub,
                            operationLogs: [nextLog, ...(sub.operationLogs || [])],
                        };
                    });
                }}
            />
        ),
        dashboard: (
            <DashboardView
                currentMain={currentMain}
                currentSub={currentSub}
                activeStage={activeStage}
                stageOptions={stageOptions}
                selectedCategoryId={selectedCategoryId}
                showEmptyCategories={showEmptyCategories}
                enabledCategories={enabledCategories}
                activeStageTasks={activeStageTasks}
                minimalTasks={minimalTasks}
                theme={theme}
                isViewingHistory={isViewingHistory}
                nextStage={nextStage}
                onChangeStage={onChangeStage}
                onAdvanceStage={handleStageAdvance}
                onExportCurrentStage={handleExportCurrentStage}
                onExportProject={handleExportProject}
                onSelectCategory={onSelectCategory}
                onToggleShowEmptyCategories={onToggleShowEmptyCategories}
                onOpenRegulations={() => setCurrentView('regulations')}
                onOpenErrors={() => setCurrentView('errors')}
                onToggleTask={toggleTask}
                onChangeTaskStatus={setTaskStatus}
                onChangeTaskBlockedReason={setTaskBlockedReason}
                onAddTaskComment={addTaskComment}
                onUploadTaskFile={handleTaskFileUpload}
                onRetryTaskUpload={retryTaskUpload}
                uploadErrors={uploadErrors}
                onDownloadFile={handleDownloadFile}
                onDeleteVersion={handleDeleteVersion}
                onDeleteTask={handleDeleteTask}
                onOpenAddTaskModal={openAddTaskModal}
            />
        ),
        regulations: (
            <RegulationsView
                clauseSearch={clauseSearch}
                displayCount={displayCount}
                displayedClauses={displayedClauses}
                onClauseSearchChange={(value) => setClauseSearch(value)}
                onDisplayCountChange={(value) => setDisplayCount(value)}
                onRefresh={refreshRandomClauses}
                knowledgeError={knowledgeError}
                isAdmin={isAdmin}
                onCreateClause={createClause}
                onDeleteClause={deleteClause}
            />
        ),
        errors: (
            <ErrorsView
                errorSearch={errorSearch}
                errorDisplayCount={errorDisplayCount}
                displayedErrors={displayedErrors}
                onErrorSearchChange={(value) => setErrorSearch(value)}
                onErrorDisplayCountChange={(value) => setErrorDisplayCount(value)}
                onRefresh={refreshRandomErrors}
                knowledgeError={knowledgeError}
                isAdmin={isAdmin}
                onCreateError={createError}
                onDeleteError={deleteError}
            />
        ),
        templates: (
            <TemplatesView
                theme={theme}
                currentMain={currentMain}
                currentSub={currentSub}
                onUpdateMain={updateCurrentMainProject}
                onUpdateSub={updateCurrentSubProject}
            />
        )
    }[currentView];

    if (authLoading || (user && projectsLoading)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600 font-medium font-sans">加载中...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    if (user.mustChangePassword) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
                    <h2 className="text-2xl font-black text-slate-800 mb-2">首次登录请修改密码</h2>
                    <p className="text-xs text-slate-500 mb-6">为保证账号安全，请先修改默认密码后继续使用。</p>
                    {passwordError && <p className="text-xs text-red-600 mb-3">{passwordError}</p>}
                    <div className="space-y-3">
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            placeholder="旧密码（默认 123456）"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="新密码（至少6位）"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                        />
                    </div>
                    <button
                        disabled={passwordSaving}
                        onClick={async () => {
                            setPasswordError('');
                            setPasswordSaving(true);
                            try {
                                await api.post('/auth/change-password', { oldPassword, newPassword });
                                alert('密码修改成功，请重新登录。');
                                logout();
                            } catch (err) {
                                setPasswordError(err instanceof Error ? err.message : '密码修改失败');
                            } finally {
                                setPasswordSaving(false);
                            }
                        }}
                        className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
                    >
                        {passwordSaving ? '保存中...' : '保存新密码'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen max-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden`}>
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm flex-shrink-0 h-full">
                <div className="p-6 border-b border-slate-100 flex-shrink-0">
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className={`w-8 h-8 bg-${theme}-600 text-white rounded-lg flex items-center justify-center text-sm shadow-lg shadow-${theme}-100`}>H</span>
                        暖通设计管家
                    </h1>
                    <div className="mt-4 flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                        <div className={`w-10 h-10 bg-${theme}-100 text-${theme}-600 rounded-full flex items-center justify-center font-black shadow-sm`}>
                            {user.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{user.username}</p>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user.role === 'admin' ? '管理员账号' : '设计账号'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
                    <section>
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2 mb-4 block">项目导航</label>
                        <Sidebar
                            projects={projects}
                            currentMainId={currentMainId}
                            currentSubId={currentSubId}
                            onSelectProject={(mainId, subId) => {
                                setCurrentMainId(mainId);
                                setCurrentSubId(subId);
                                setCurrentView('process');
                            }}
                            onCreateProject={openNewProjectModal}
                            canCreateProject={user.role === 'admin'}
                            theme={theme}
                        />
                    </section>

                    <section>
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2 mb-4 block">功能菜单</label>
                        <div className="space-y-1">
                            {[
                                { id: 'process', label: '设计过程', icon: '📝' },
                                { id: 'dashboard', label: '子项主页', icon: '📋' },
                                { id: 'templates', label: '模板管理', icon: '📑' },
                                { id: 'regulations', label: '规范条文', icon: '📜' },
                                { id: 'errors', label: '设计常见问题', icon: '❗' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id as ViewState)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${currentView === item.id
                                        ? `bg-${theme}-50 text-${theme}-700 shadow-sm border border-${theme}-100 scale-[1.02]`
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

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-2xl text-xs font-black shadow-sm border border-slate-200 transition-all active:scale-95 group"
                    >
                        <span className="group-hover:rotate-12 transition-transform">🔒</span>
                        退出登录
                    </button>
                    <div className="mt-2 text-[8px] text-slate-300 text-center font-bold tracking-widest uppercase">
                        HVAC Master v8.0
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10 flex-shrink-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            <span className="truncate max-w-[150px]">{currentMain.name}</span>
                            <span className="text-slate-200">/</span>
                            <span className={`text-${theme}-600`}>{currentSub.name}</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                            {VIEW_TITLES[currentView]}
                        </h2>
                    </div>

                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        V3.1 设计说明模板
                    </div>
                </header>

                <div className="flex-1 min-h-0 bg-slate-50 p-6 overflow-hidden">
                    <div className="h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-200/60 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {currentViewContent}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showNewProjectModal && (
                <NewProjectModal
                    theme={theme}
                    data={newProjectData}
                    onChange={setNewProjectData}
                    onTemplateSelectionChange={handleTemplateSelectionChange}
                    onToggleCategory={toggleNewCategory}
                    onCancel={closeNewProjectModal}
                    onConfirm={handleCreateProject}
                />
            )}

            {/* Add Task Modal */}
            {addTaskModalOpen && (
                <AddTaskModal
                    theme={theme}
                    category={addTaskCategory}
                    content={newTaskContent}
                    onContentChange={setNewTaskContent}
                    onCancel={closeAddTaskModal}
                    onConfirm={handleConfirmAddTask}
                />
            )}

        </div>
    );
};

export default App;
