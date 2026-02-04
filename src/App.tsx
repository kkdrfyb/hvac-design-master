import './index.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import { ViewState, TaskItem, CommonError, TaskGroup, MandatoryClause, MainProject, SubProject, SubmissionVersion, ThemeColor, DesignStage, ProjectType, TemplateCategory } from './types';
import { INITIAL_PROJECTS, MANDATORY_CLAUSES, COMMON_ERRORS, DESIGN_STAGES, PROJECT_TYPES, TEMPLATE_CATEGORIES, buildTasksFromTemplate } from './constants';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { api } from './api';

// Group mappings
const GROUP_LABELS: Record<TaskGroup, string> = {
    INTERFACE: '多专业接口',
    RISK: '安全与风险控制',
    DELIVERABLE: '阶段成果'
};

// Keyword highlighter component
const HighlightedText: React.FC<{ text: string; theme: ThemeColor }> = ({ text, theme }) => {
    // Basic HVAC keywords
    const keywords = ['温度', '压力', '阀', '排烟', '通风', '供暖', '设计', '计算', '规范', '防火'];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'g'));

    return (
        <span>
            {parts.map((part, i) =>
                keywords.includes(part) ?
                    <span key={i} className={`font-bold text-${theme}-600`}>{part}</span> :
                    part
            )}
        </span>
    );
};

// TaskRow Component
const TaskRow: React.FC<{
    task: TaskItem;
    onToggle: () => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteVersion: (taskId: string, version: string) => void;
    onDeleteTask: () => void;
    theme: ThemeColor;
    readOnly?: boolean;
}> = ({ task, onToggle, onUpload, onDeleteVersion, onDeleteTask, theme, readOnly }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={`p-3 border-l-4 ${task.isCompleted ? `border-${theme}-400 bg-slate-50` : 'border-slate-300 bg-white'} shadow-sm mb-2 rounded-r transition-all hover:shadow group ${readOnly ? 'opacity-70' : ''}`}>
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={onToggle}
                    disabled={readOnly}
                    className={`mt-1 w-4 h-4 text-${theme}-600 rounded focus:ring-${theme}-500 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <div className="flex-1">
                    <div className={`${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'} text-sm`}>
                        <HighlightedText text={task.content} theme={theme} />
                    </div>

                    {/* Versions display */}
                    {task.versions.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {task.versions.map(v => (
                                <div key={v.version} className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-100 p-1 rounded w-fit">
                                    <span className={`font-bold bg-${theme}-100 text-${theme}-700 px-1 rounded`}>Ver {v.version}</span>
                                    <span>{v.date}</span>
                                    <span className="text-slate-400">|</span>
                                    {v.files.map((f, i) => (
                                        <span key={i} className="underline decoration-slate-300">{f.name}</span>
                                    ))}
                                    {!readOnly && (
                                        <button onClick={() => onDeleteVersion(task.id, v.version)} className="text-red-400 hover:text-red-600 ml-2 font-bold">×</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`text-slate-400 hover:text-${theme}-600 p-1`}
                        title="上传文件"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={onUpload} multiple />

                    <button
                        onClick={onDeleteTask}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="删除任务"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                )}
            </div>
        </div>
    );
};
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

const App: React.FC = () => {
    const { user, logout, isLoading: authLoading } = useAuth();

    // Global View State
    const [currentView, setCurrentView] = useState<ViewState>('dashboard');
    const [theme, setTheme] = useState<ThemeColor>('blue');

    // Project State
    const [projects, setProjects] = useState<MainProject[]>([]);
    const [currentMainId, setCurrentMainId] = useState<string>('');
    const [currentSubId, setCurrentSubId] = useState<string>('');
    const [projectsLoading, setProjectsLoading] = useState(false);

    // Cleanup projects on logout to prevent state leakage between users
    useEffect(() => {
        if (!user) {
            setProjects([]);
            setCurrentMainId('');
            setCurrentSubId('');
        }
    }, [user]);

    // Fetch projects from DB
    useEffect(() => {
        if (user) {
            setProjectsLoading(true);
            api.get('/projects').then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const validatedData = data.map(mp => ({
                        ...mp,
                        subProjects: (Array.isArray(mp.subProjects) && mp.subProjects.length > 0)
                            ? mp.subProjects.map(ensureValidSubProject)
                            : (mp.id === 'mp1' ? INITIAL_PROJECTS[0].subProjects.map(ensureValidSubProject) : [])
                    }));
                    setProjects(validatedData);
                    const firstMain = validatedData[0];
                    setCurrentMainId(firstMain.id);
                    if (firstMain.subProjects && firstMain.subProjects.length > 0) {
                        setCurrentSubId(firstMain.subProjects[0].id);
                    } else {
                        setCurrentSubId('');
                    }
                } else {
                    // Seed initial data if no projects exist
                    setProjects(INITIAL_PROJECTS);
                    setCurrentMainId(INITIAL_PROJECTS[0].id);
                    setCurrentSubId(INITIAL_PROJECTS[0].subProjects[0].id);
                }
            }).catch(e => {
                console.error('Failed to fetch projects', e);
            }).finally(() => {
                setProjectsLoading(false);
            });
        }
    }, [user]);

    // Computed Current Project Data
    const currentMain = useMemo(() => {
        return projects.find(p => p.id === currentMainId) || projects[0] || INITIAL_PROJECTS[0];
    }, [projects, currentMainId]);

    const currentSub = useMemo(() => {
        if (!currentMain) return ensureValidSubProject({});
        const sub = currentMain.subProjects?.find(s => s.id === currentSubId) || currentMain.subProjects?.[0];
        return ensureValidSubProject(sub);
    }, [currentMain, currentSubId]);

    const [activeStage, setActiveStage] = useState<DesignStage>(currentSub.stage);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('overview');
    const [showEmptyCategories, setShowEmptyCategories] = useState(false);

    useEffect(() => {
        setActiveStage(currentSub.stage);
        setSelectedCategoryId('overview');
        setShowEmptyCategories(false);
    }, [currentSub.id, currentSub.stage]);

    useEffect(() => {
        setSelectedCategoryId('overview');
    }, [activeStage]);

    const currentStageCategories = useMemo<TemplateCategory[]>(() => {
        return TEMPLATE_CATEGORIES[currentSub.type][activeStage];
    }, [currentSub.type, activeStage]);

    const enabledCategories = useMemo(() => {
        const enabledSet = new Set(currentSub.enabledCategoryIds);
        return currentStageCategories.filter(category => enabledSet.has(category.id));
    }, [currentStageCategories, currentSub.enabledCategoryIds]);

    const activeStageTasks = useMemo(() => {
        const enabledSet = new Set(currentSub.enabledCategoryIds);
        return currentSub.tasks.filter(task => task.stage === activeStage && enabledSet.has(task.categoryId));
    }, [currentSub.tasks, activeStage, currentSub.enabledCategoryIds]);

    // Helpers to update current subproject state and persist to DB
    const updateCurrentSubProject = (updater: (sp: SubProject) => SubProject) => {
        setProjects(prevProjects => {
            const nextProjects = prevProjects.map(mp => {
                if (mp.id === currentMainId) {
                    return {
                        ...mp,
                        subProjects: mp.subProjects.map(sp => sp.id === currentSubId ? ensureValidSubProject(updater(ensureValidSubProject(sp))) : sp)
                    };
                }
                return mp;
            });

            // Persist the updated main project to DB
            const updatedMain = nextProjects.find(p => p.id === currentMainId);
            if (updatedMain) {
                api.post('/projects', updatedMain).catch(e => console.error('Auto-save failed', e));
            }

            return nextProjects;
        });
    };

    // Mandatory Clauses State
    const [mandatoryClauses] = useState<MandatoryClause[]>(MANDATORY_CLAUSES);
    const [shuffledClauses, setShuffledClauses] = useState<MandatoryClause[]>([]); // All clauses, shuffled
    const [clauseSearch, setClauseSearch] = useState('');
    const [displayCount, setDisplayCount] = useState(4);

    // Common Errors State
    const [errors] = useState<CommonError[]>(COMMON_ERRORS);
    const [shuffledErrors, setShuffledErrors] = useState<CommonError[]>([]); // All errors, shuffled
    const [errorSearch, setErrorSearch] = useState('');
    const [errorDisplayCount, setErrorDisplayCount] = useState(4);

    // Modals State
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectData, setNewProjectData] = useState({
        mainName: '',
        mainCode: '',
        subName: '',
        subCode: '',
        type: '附属工业厂房' as ProjectType,
        stage: '初步设计' as DesignStage,
        enabledCategoryIds: TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id)
    });

    // Add Task Modal State (Replaces Prompt)
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [addTaskParams, setAddTaskParams] = useState<{ group: TaskGroup, category: string, categoryId: string } | null>(null);
    const [newTaskContent, setNewTaskContent] = useState('');

    // --- Effects ---

    // Initialize Shuffled Lists
    useEffect(() => {
        refreshRandomClauses();
        refreshRandomErrors();
    }, []); // Run once on mount

    // --- Handlers ---

    const refreshRandomClauses = () => {
        const shuffled = [...mandatoryClauses].sort(() => 0.5 - Math.random());
        setShuffledClauses(shuffled);
    };

    const refreshRandomErrors = () => {
        const shuffled = [...errors].sort(() => 0.5 - Math.random());
        setShuffledErrors(shuffled);
    }

    // Derived state for Clauses display
    const displayedClauses = useMemo(() => {
        if (clauseSearch.trim()) {
            return mandatoryClauses.filter(c => c.content.includes(clauseSearch) || c.code.includes(clauseSearch));
        }
        return shuffledClauses.slice(0, displayCount);
    }, [clauseSearch, shuffledClauses, displayCount, mandatoryClauses]);

    // Derived state for Errors display
    const displayedErrors = useMemo(() => {
        if (errorSearch.trim()) {
            return errors.filter(e => e.title.includes(errorSearch) || e.description.includes(errorSearch));
        }
        return shuffledErrors.slice(0, errorDisplayCount);
    }, [errorSearch, shuffledErrors, errorDisplayCount, errors]);

    const handleCreateProject = () => {
        if (newProjectData.mainName && newProjectData.subName) {
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
                tasks: buildTasksFromTemplate(newProjectData.type, newProjectData.stage, enabledCategoryIds)
            };
            const existingMain = projects.find(p => p.name === newProjectData.mainName);
            if (existingMain) {
                const updatedProjects = projects.map(p => p.id === existingMain.id ? { ...p, subProjects: [...p.subProjects, newSub] } : p);
                setProjects(updatedProjects);
                setCurrentMainId(existingMain.id);
                setCurrentSubId(newSub.id);
                // Persist
                api.post('/projects', updatedProjects.find(p => p.id === existingMain.id)).catch(e => console.error(e));
            } else {
                const newMain: MainProject = {
                    id: `mp_${Date.now()}`,
                    name: newProjectData.mainName,
                    code: newProjectData.mainCode,
                    subProjects: [newSub]
                };
                setProjects([...projects, newMain]);
                setCurrentMainId(newMain.id);
                setCurrentSubId(newSub.id);
                // Persist
                api.post('/projects', newMain).catch(e => console.error(e));
            }
            setShowNewProjectModal(false);
            setNewProjectData({
                mainName: '',
                mainCode: '',
                subName: '',
                subCode: '',
                type: '附属工业厂房',
                stage: '初步设计',
                enabledCategoryIds: TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id)
            });
        }
    };

    const handleTemplateSelectionChange = (nextType: ProjectType, nextStage: DesignStage) => {
        const categoryIds = TEMPLATE_CATEGORIES[nextType][nextStage].map(category => category.id);
        setNewProjectData(prev => ({
            ...prev,
            type: nextType,
            stage: nextStage,
            enabledCategoryIds: categoryIds
        }));
    };

    const toggleNewCategory = (categoryId: string) => {
        setNewProjectData(prev => {
            const next = new Set(prev.enabledCategoryIds);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return { ...prev, enabledCategoryIds: Array.from(next) };
        });
    };

    const toggleTask = (id: string) => {
        if (activeStage !== currentSub.stage) return;
        updateCurrentSubProject(sp => ({
            ...sp,
            tasks: sp.tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)
        }));
    };

    const handleDeleteTask = (taskId: string) => {
        if (activeStage !== currentSub.stage) return;
        if (confirm("确定删除此任务项吗？")) {
            updateCurrentSubProject(sp => ({
                ...sp,
                tasks: sp.tasks.filter(t => t.id !== taskId)
            }));
        }
    };

    const handleTaskFileUpload = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeStage !== currentSub.stage) return;
        const files = e.target.files;
        if (!files || files.length === 0) return;

        updateCurrentSubProject(sp => {
            const taskIndex = sp.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return sp;

            const task = sp.tasks[taskIndex];
            const nextVerChar = String.fromCharCode(65 + task.versions.length);

            const newVersion: SubmissionVersion = {
                version: nextVerChar,
                date: new Date().toLocaleDateString(),
                files: Array.from(files as FileList).map(f => ({
                    name: (f as File).name,
                    type: (f as File).name.split('.').pop() || 'file'
                }))
            };

            const newTasks = [...sp.tasks];
            newTasks[taskIndex] = { ...task, versions: [newVersion, ...task.versions] };

            return { ...sp, tasks: newTasks };
        });
    };

    const handleDeleteVersion = (taskId: string, version: string) => {
        if (activeStage !== currentSub.stage) return;
        updateCurrentSubProject(sp => {
            const taskIndex = sp.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return sp;
            const task = sp.tasks[taskIndex];
            const newTasks = [...sp.tasks];
            newTasks[taskIndex] = { ...task, versions: task.versions.filter(v => v.version !== version) };
            return { ...sp, tasks: newTasks };
        });
    }

    // Open the Modal instead of using prompt
    const openAddTaskModal = (group: TaskGroup, category: string, categoryId: string) => {
        setAddTaskParams({ group, category, categoryId });
        setNewTaskContent('');
        setAddTaskModalOpen(true);
    };

    const handleConfirmAddTask = () => {
        if (!newTaskContent.trim() || !addTaskParams) return;

        const { group, category, categoryId } = addTaskParams;

        updateCurrentSubProject(sp => {
            const newTask: TaskItem = {
                id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                categoryId,
                category,
                group,
                stage: currentSub.stage,
                content: newTaskContent,
                isCompleted: false,
                versions: []
            };
            return {
                ...sp,
                tasks: [...sp.tasks, newTask]
            };
        });

        setAddTaskModalOpen(false);
        setAddTaskParams(null);
    };

    const renderDashboard = () => {
        const isViewingHistory = activeStage !== currentSub.stage;
        const stageOptions = Array.from(new Set([currentSub.stage, ...currentSub.stageHistory]))
            .sort((a, b) => DESIGN_STAGES.indexOf(a) - DESIGN_STAGES.indexOf(b));
        const minimalTemplates = currentStageCategories.flatMap(category => category.items.filter(item => item.minimal));
        const minimalTasks = minimalTemplates.map(template => {
            const task = activeStageTasks.find(t => t.content === template.content && t.categoryId === template.categoryId);
            return { ...template, task };
        });
        const nextStage = DESIGN_STAGES[DESIGN_STAGES.indexOf(currentSub.stage) + 1];
        const hasCategoryRecords = (categoryId: string) => activeStageTasks.some(task => task.categoryId === categoryId && task.versions.length > 0);

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
                return {
                    ...sp,
                    stage: nextStage,
                    stageHistory,
                    enabledCategoryIds,
                    tasks
                };
            });
        };

        return (
            <div className="flex gap-6 h-full overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-shrink-0 bg-slate-50 z-10 pb-4 pr-2 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-slate-500">项目：{currentMain.name}（{currentMain.code}）</p>
                                <p className="text-sm font-bold text-slate-700">子项：{currentSub.name}（{currentSub.code}）</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col text-xs text-slate-500">
                                    <span>当前阶段：{currentSub.stage}</span>
                                    {isViewingHistory && <span className="text-amber-600">历史阶段浏览中</span>}
                                </div>
                                <select
                                    value={activeStage}
                                    onChange={(e) => setActiveStage(e.target.value as DesignStage)}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white"
                                >
                                    {stageOptions.map(stage => (
                                        <option key={stage} value={stage}>{stage}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleStageAdvance}
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
                                        onClick={() => setSelectedCategoryId('overview')}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategoryId === 'overview'
                                            ? `bg-${theme}-50 text-${theme}-700 border border-${theme}-100`
                                            : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        项目设计情况
                                    </button>
                                </div>
                                {(Object.keys(GROUP_LABELS) as TaskGroup[]).map(group => {
                                    const groupCategories = enabledCategories.filter(category => category.group === group);
                                    if (groupCategories.length === 0) return null;
                                    const visibleCategories = showEmptyCategories
                                        ? groupCategories
                                        : groupCategories.filter(category => hasCategoryRecords(category.id));
                                    return (
                                        <div key={group} className="space-y-2">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{GROUP_LABELS[group]}</div>
                                            <div className="space-y-1">
                                                {visibleCategories.map(category => {
                                                    const taskCount = activeStageTasks.filter(task => task.categoryId === category.id).length;
                                                    return (
                                                        <button
                                                            key={category.id}
                                                            onClick={() => setSelectedCategoryId(category.id)}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategoryId === category.id
                                                                ? `bg-${theme}-50 text-${theme}-700 border border-${theme}-100`
                                                                : 'text-slate-500 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <span className="truncate">{category.name}</span>
                                                            <span className="ml-2 text-[10px] text-slate-400">({taskCount})</span>
                                                        </button>
                                                    );
                                                })}
                                                {visibleCategories.length === 0 && (
                                                    <div className="px-3 py-2 text-[10px] text-slate-400">暂无文件记录</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={() => setShowEmptyCategories(prev => !prev)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-50"
                                >
                                    {showEmptyCategories ? '收起未记录分类' : '显示未记录分类'}
                                </button>
                                <div className="pt-4 border-t border-slate-100 space-y-2">
                                    <button
                                        onClick={() => setCurrentView('regulations')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                                    >
                                        规范条文
                                    </button>
                                    <button
                                        onClick={() => setCurrentView('errors')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                                    >
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
                                                            onChange={() => item.task && toggleTask(item.task.id)}
                                                            disabled={!item.task || isViewingHistory}
                                                            className={`w-4 h-4 text-${theme}-600 rounded`}
                                                        />
                                                        <span className="text-sm text-slate-700">{item.content}</span>
                                                        {item.task && (
                                                            <button
                                                                onClick={() => setSelectedCategoryId(item.categoryId)}
                                                                className={`ml-auto text-xs text-${theme}-600 hover:underline`}
                                                            >
                                                                进入分类
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {minimalTasks.length === 0 && (
                                                    <div className="text-xs text-slate-400">暂无极简执行项。</div>
                                                )}
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
                                                <h3 className="text-lg font-bold text-slate-800">
                                                    {enabledCategories.find(category => category.id === selectedCategoryId)?.name}
                                                </h3>
                                                {isViewingHistory && <p className="text-xs text-amber-600 mt-1">历史阶段仅供查看，不可编辑</p>}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const category = enabledCategories.find(c => c.id === selectedCategoryId);
                                                    if (category) openAddTaskModal(category.group, category.name, category.id);
                                                }}
                                                disabled={isViewingHistory}
                                                className={`text-xs font-medium ${isViewingHistory ? 'text-slate-300 cursor-not-allowed' : `text-${theme}-600 hover:underline`}`}
                                            >
                                                + 添加条目
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {activeStageTasks.filter(task => task.categoryId === selectedCategoryId).map(task => (
                                                <TaskRow
                                                    key={task.id}
                                                    task={task}
                                                    onToggle={() => toggleTask(task.id)}
                                                    onUpload={(e) => handleTaskFileUpload(task.id, e)}
                                                    onDeleteVersion={handleDeleteVersion}
                                                    onDeleteTask={() => handleDeleteTask(task.id)}
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

    const renderRegulations = () => (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">规范条文</h2>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="搜索条文..."
                            className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            value={clauseSearch}
                            onChange={(e) => setClauseSearch(e.target.value)}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 whitespace-nowrap">显示:</span>
                        <select
                            className="border rounded px-3 py-2 text-sm bg-white cursor-pointer hover:border-blue-400 focus:outline-none"
                            value={displayCount}
                            onChange={(e) => setDisplayCount(Number(e.target.value))}
                        >
                            <option value={4}>4 条/页</option>
                            <option value={8}>8 条/页</option>
                            <option value={12}>12 条/页</option>
                            <option value={100}>全部</option>
                        </select>
                    </div>
                    <button onClick={refreshRandomClauses} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        随机刷新
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedClauses.map(clause => (
                        <div key={clause.id} className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500 hover:shadow-lg transition transform hover:-translate-y-1">
                            <div className="flex justify-between items-baseline mb-3">
                                <span className="font-bold text-red-700 text-lg">{clause.code}</span>
                                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-mono">条文 {clause.clauseNumber}</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">{clause.content}</p>
                        </div>
                    ))}
                </div>
                {displayedClauses.length === 0 && (
                    <div className="text-center py-20 text-slate-400">未找到相关条文</div>
                )}
            </div>
        </div>
    );

    const renderErrors = () => (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">设计常见问题</h2>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="搜索错误案例..."
                            className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            value={errorSearch}
                            onChange={(e) => setErrorSearch(e.target.value)}
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 whitespace-nowrap">显示:</span>
                        <select
                            className="border rounded px-3 py-2 text-sm bg-white cursor-pointer hover:border-blue-400 focus:outline-none"
                            value={errorDisplayCount}
                            onChange={(e) => setErrorDisplayCount(Number(e.target.value))}
                        >
                            <option value={4}>4 条/页</option>
                            <option value={8}>8 条/页</option>
                            <option value={12}>12 条/页</option>
                            <option value={100}>全部</option>
                        </select>
                    </div>
                    <button onClick={refreshRandomErrors} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-100 transition whitespace-nowrap flex items-center gap-1 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        随机刷新
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayedErrors.map(err => (
                        <div key={err.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:border-orange-300 hover:shadow-lg transition duration-300 flex flex-col">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">⚠️</span>
                                <h3 className="font-bold text-lg text-slate-800">{err.title}</h3>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{err.category}</span>
                            </div>
                            <p className="text-slate-600 mb-4 text-sm flex-1 leading-relaxed">{err.description}</p>
                            <div className="bg-emerald-50 p-4 rounded text-sm text-emerald-800 border border-emerald-100">
                                <span className="font-bold block mb-1">✅ 解决方案:</span> {err.solution}
                            </div>
                        </div>
                    ))}
                </div>
                {displayedErrors.length === 0 && (
                    <div className="text-center py-20 text-slate-400">未找到相关预警</div>
                )}
            </div>
        </div>
    );

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
                            <span className={`text-[9px] font-black text-${theme}-500 uppercase tracking-widest`}>{user.role}</span>
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
                            onCreateProject={() => setShowNewProjectModal(true)}
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
                            {currentView === 'dashboard' ? '子项主页' :
                                currentView === 'regulations' ? '规范条文' : '设计常见问题'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {user.role === 'admin' && (
                            <div className="px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-600 text-[10px] font-black shadow-sm flex items-center gap-2 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                管理员视图（全库管理）
                            </div>
                        )}
                        <div className="flex gap-2.5 p-1 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                            {(['blue', 'emerald', 'rose', 'violet'] as ThemeColor[]).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setTheme(c)}
                                    className={`w-6 h-6 rounded-full bg-${c}-500 transition-all hover:scale-110 active:scale-90 shadow-sm ${theme === c ? 'ring-2 ring-white scale-110 ring-offset-2 ring-offset-slate-100' : 'opacity-60 hover:opacity-100'}`}
                                />
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 min-h-0 bg-slate-50 p-6 overflow-hidden">
                    <div className="h-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-200/60 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {currentView === 'dashboard' && renderDashboard()}
                            {currentView === 'regulations' && renderRegulations()}
                            {currentView === 'errors' && renderErrors()}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="mb-8">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">启动新工程</h3>
                            <p className="text-slate-400 text-sm font-bold mt-2">按步骤完成项目创建：项目 → 子项 → 阶段 → 模板</p>
                        </div>
                        <div className="space-y-6">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">步骤 1：项目基本信息</div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">项目名称</label>
                                    <input type="text" className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200" placeholder="e.g. 某商业综合体" value={newProjectData.mainName} onChange={e => setNewProjectData({ ...newProjectData, mainName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">项目编号</label>
                                    <input type="text" className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200" placeholder="2024-HV-01" value={newProjectData.mainCode} onChange={e => setNewProjectData({ ...newProjectData, mainCode: e.target.value })} />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-50 space-y-6">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">步骤 2：子项基本信息</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">首个子项/单体</label>
                                        <input type="text" className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200" placeholder="A1地库/办公楼" value={newProjectData.subName} onChange={e => setNewProjectData({ ...newProjectData, subName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">子项编号</label>
                                        <input type="text" className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200" placeholder="Sub-01" value={newProjectData.subCode} onChange={e => setNewProjectData({ ...newProjectData, subCode: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">步骤 3：子项类型</label>
                                        <select
                                            className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none bg-slate-50 font-bold text-sm text-slate-700 appearance-none"
                                            value={newProjectData.type}
                                            onChange={(e) => handleTemplateSelectionChange(e.target.value as ProjectType, newProjectData.stage)}
                                        >
                                            {PROJECT_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">当前设计阶段</label>
                                        <select
                                            className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none bg-slate-50 font-bold text-sm text-slate-700 appearance-none"
                                            value={newProjectData.stage}
                                            onChange={(e) => handleTemplateSelectionChange(newProjectData.type, e.target.value as DesignStage)}
                                        >
                                            {DESIGN_STAGES.map(stage => (
                                                <option key={stage} value={stage}>{stage}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">步骤 4：启用文件分类</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TEMPLATE_CATEGORIES[newProjectData.type][newProjectData.stage].map(category => (
                                            <label key={category.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={newProjectData.enabledCategoryIds.includes(category.id)}
                                                    onChange={() => toggleNewCategory(category.id)}
                                                />
                                                {category.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-between">
                            <button onClick={() => setShowNewProjectModal(false)} className="px-6 py-4 text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-xs">放弃</button>
                            <button onClick={handleCreateProject} className={`px-10 py-4 bg-${theme}-600 text-white font-black rounded-3xl shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 hover:-translate-y-1 transition active:translate-y-0 text-sm`}>开启设计</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Task Modal */}
            {addTaskModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-bounce-in border border-white/20">
                        <div className="flex items-center gap-2 mb-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-${theme}-100 text-${theme}-700 shadow-sm shadow-${theme}-50`}>
                                {addTaskParams?.category}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">添加管控任务</h3>
                        <textarea
                            autoFocus
                            className="w-full border border-slate-50 rounded-[2rem] p-6 text-sm font-bold text-slate-600 focus:ring-8 focus:ring-blue-50 focus:border-blue-200 outline-none resize-none h-48 mb-10 bg-slate-50 transition-all placeholder:text-slate-300"
                            placeholder="请描述具体的设计要点或提资要求..."
                            value={newTaskContent}
                            onChange={(e) => setNewTaskContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    handleConfirmAddTask();
                                }
                            }}
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">CTRL + ENTER 快速入库</span>
                            <div className="flex gap-4">
                                <button onClick={() => setAddTaskModalOpen(false)} className="text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-[10px]">取消</button>
                                <button onClick={handleConfirmAddTask} className={`bg-${theme}-600 text-white px-8 py-4 rounded-3xl font-black shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 transition active:scale-95`}>确认添加</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;
