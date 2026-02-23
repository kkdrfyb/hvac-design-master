import './index.css';
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import { ViewState, SubProject, ThemeColor, DesignStage, ProjectType } from './types';
import { INITIAL_PROJECTS, TEMPLATE_CATEGORIES, buildTasksFromTemplate } from './constants';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import DashboardView from './components/dashboard/DashboardView';
import RegulationsView from './components/RegulationsView';
import ErrorsView from './components/ErrorsView';
import NewProjectModal from './components/NewProjectModal';
import AddTaskModal from './components/AddTaskModal';
import { useProjectCreation } from './hooks/useProjectCreation';
import { useKnowledgePanels } from './hooks/useKnowledgePanels';
import { useTaskOperations } from './hooks/useTaskOperations';
import { useStageNavigation } from './hooks/useStageNavigation';
import { useProjectSync } from './hooks/useProjectSync';
import { useProjectBootstrap } from './hooks/useProjectBootstrap';
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
            versions: Array.isArray(t?.versions) ? t.versions : []
        })) : buildTasksFromTemplate(type, stage, enabledCategoryIds)
    };
};

const VIEW_TITLES: Record<ViewState, string> = {
    dashboard: '子项主页',
    regulations: '规范条文',
    errors: '设计常见问题'
};

const App: React.FC = () => {
    const { user, logout, isLoading: authLoading } = useAuth();

    // Global View State
    const [currentView, setCurrentView] = useState<ViewState>('dashboard');
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
        refreshRandomErrors
    } = useKnowledgePanels();

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
        handleDownloadFile,
        handleDeleteTask,
        handleTaskFileUpload,
        handleDeleteVersion
    } = useTaskOperations({
        activeStage,
        currentSub,
        currentMainId,
        currentSubId,
        updateCurrentSubProject
    });

    const currentViewContent = {
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
                onSelectCategory={onSelectCategory}
                onToggleShowEmptyCategories={onToggleShowEmptyCategories}
                onOpenRegulations={() => setCurrentView('regulations')}
                onOpenErrors={() => setCurrentView('errors')}
                onToggleTask={toggleTask}
                onUploadTaskFile={handleTaskFileUpload}
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
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">设计账号</span>
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
                                setCurrentView('dashboard');
                            }}
                            onCreateProject={openNewProjectModal}
                            theme={theme}
                        />
                    </section>

                    <section>
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2 mb-4 block">功能菜单</label>
                        <div className="space-y-1">
                            {[
                                { id: 'dashboard', label: '子项主页', icon: '📋' },
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
                        V1 结构化记录模式
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
