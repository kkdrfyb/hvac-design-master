import './index.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import Gallery from './components/Gallery';
import MandatoryClauseModal from './components/MandatoryClauseModal';
import { ViewState, TaskItem, TaskCategory, CommonError, TaskGroup, DesignPlan, MandatoryClause, MainProject, SubProject, SubmissionVersion, ThemeColor } from './types';
import { INITIAL_PROJECTS, MANDATORY_CLAUSES, COMMON_ERRORS, createInitialTasks } from './constants';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { api } from './api';
import { generateWorkflowQuestion, verifyDesignInput } from './services/geminiService';
import { GoogleGenAI, Chat } from "@google/genai";

// Group mappings
const GROUP_LABELS: Record<TaskGroup, string> = {
    CALCULATION: '计算校核 (Calculation & Review)',
    OUTGOING: '对外提资 (Outgoing Data)',
    RECEIVED: '接收提资 (Received Data)',
    DESIGN_PROCESS: '设计流程 (Design Process)'
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

// Section Component
const Section: React.FC<{
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    theme: ThemeColor;
}> = ({ title, isOpen, onToggle, children, theme }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4 transition-all duration-300 hover:shadow-md">
            <div
                className="p-3 bg-slate-50 flex justify-between items-center cursor-pointer select-none"
                onClick={onToggle}
            >
                <h3 className={`font-bold text-slate-700 flex items-center`}>
                    <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                    <span className="ml-2">{title}</span>
                </h3>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-slate-100 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
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
}> = ({ task, onToggle, onUpload, onDeleteVersion, onDeleteTask, theme }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={`p-3 border-l-4 ${task.isCompleted ? `border-${theme}-400 bg-slate-50` : 'border-slate-300 bg-white'} shadow-sm mb-2 rounded-r transition-all hover:shadow group`}>
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={onToggle}
                    className={`mt-1 w-4 h-4 text-${theme}-600 rounded focus:ring-${theme}-500 cursor-pointer`}
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
                                    <button onClick={() => onDeleteVersion(task.id, v.version)} className="text-red-400 hover:text-red-600 ml-2 font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
            </div>
        </div>
    );
};
const ensureValidSubProject = (sp: Partial<SubProject> | any): SubProject => {
    return {
        id: sp?.id || `sp_gen_${Date.now()}`,
        name: sp?.name || '未命名子项',
        code: sp?.code || '0000',
        tasks: Array.isArray(sp?.tasks) ? sp.tasks.map((t: any) => ({
            ...t,
            versions: Array.isArray(t?.versions) ? t.versions : []
        })) : [],
        plans: Array.isArray(sp?.plans) ? sp.plans : [],
        designInputContent: sp?.designInputContent || '',
        gallery: Array.isArray(sp?.gallery) ? sp.gallery : [],
        submissionCategories: Array.isArray(sp?.submissionCategories) ? sp.submissionCategories : [],
        receivedCategories: Array.isArray(sp?.receivedCategories) ? sp.receivedCategories : []
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

    // Refs for Scrolling
    const calcRef = useRef<HTMLDivElement>(null);
    const outgoingRef = useRef<HTMLDivElement>(null);
    const receivedRef = useRef<HTMLDivElement>(null);
    const processRef = useRef<HTMLDivElement>(null);
    const sectionRefs: Record<TaskGroup, React.RefObject<HTMLDivElement>> = {
        CALCULATION: calcRef,
        OUTGOING: outgoingRef,
        RECEIVED: receivedRef,
        DESIGN_PROCESS: processRef
    };

    // Mandatory Clauses State
    const [mandatoryClauses, setMandatoryClauses] = useState<MandatoryClause[]>(MANDATORY_CLAUSES);
    const [shuffledClauses, setShuffledClauses] = useState<MandatoryClause[]>([]); // All clauses, shuffled
    const [showModal, setShowModal] = useState<boolean>(true);
    const [clauseSearch, setClauseSearch] = useState('');
    const [displayCount, setDisplayCount] = useState(4);

    // Common Errors State
    const [errors, setErrors] = useState<CommonError[]>(COMMON_ERRORS);
    const [shuffledErrors, setShuffledErrors] = useState<CommonError[]>([]); // All errors, shuffled
    const [errorSearch, setErrorSearch] = useState('');
    const [errorDisplayCount, setErrorDisplayCount] = useState(4);

    // Filter State for Dashboard
    const [expandedGroups, setExpandedGroups] = useState<Record<TaskGroup, boolean>>({
        CALCULATION: true,
        OUTGOING: true,
        RECEIVED: true,
        DESIGN_PROCESS: true
    });

    // AI State
    const [aiQuestion, setAiQuestion] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [userInput, setUserInput] = useState('');
    const [customModelName, setCustomModelName] = useState('gemini-2.5-flash');

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatSessionRef = useRef<Chat | null>(null);

    // Modals State
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectData, setNewProjectData] = useState({ mainName: '', mainCode: '', subName: '', subCode: '' });

    const [showImportSettingsModal, setShowImportSettingsModal] = useState(false);
    const [importSelection, setImportSelection] = useState({ mainId: '', subId: '' });

    // Add Task Modal State (Replaces Prompt)
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
    const [addTaskParams, setAddTaskParams] = useState<{ group: TaskGroup, category: string } | null>(null);
    const [newTaskContent, setNewTaskContent] = useState('');

    // Manual Plan Entry State
    const [newPlanEntry, setNewPlanEntry] = useState({ date: '', name: '' });
    const [showPlanEntry, setShowPlanEntry] = useState(false);

    // --- Effects ---

    // Initialize Shuffled Lists
    useEffect(() => {
        refreshRandomClauses();
        refreshRandomErrors();
    }, []); // Run once on mount

    useEffect(() => {
        const interval = setInterval(() => {
            if (!aiQuestion && currentView === 'dashboard' && Math.random() > 0.8) {
                handleGenerateQuestion();
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [aiQuestion, currentView]);

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

    const downloadTemplate = (type: 'plan' | 'input') => {
        let content = "";
        let filename = "";
        let mimeType = "text/plain";

        if (type === 'plan') {
            content = "Date,Milestone\n2024-06-01,Preliminary Design\n2024-07-01,Construction Drawings";
            filename = "Plan_Template.csv"; // Using CSV for Excel compatibility
            mimeType = "text/csv";
        } else {
            content = "Design Input Template\n\n1. Outdoor Parameters:\n2. Indoor Parameters:\n3. Special Requirements:";
            filename = "Design_Input_Template.txt";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleBoxClick = (group: TaskGroup) => {
        setExpandedGroups(prev => ({ ...prev, [group]: true }));
        setTimeout(() => {
            sectionRefs[group].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleCreateProject = () => {
        if (newProjectData.mainName && newProjectData.subName) {
            const newSub: SubProject = {
                id: `sp_${Date.now()}`,
                name: newProjectData.subName,
                code: newProjectData.subCode,
                tasks: createInitialTasks(),
                plans: [],
                designInputContent: '请导入设计输入或在此编辑...',
                gallery: [],
                submissionCategories: ['结构专业', '电气专业'],
                receivedCategories: ['建筑专业', '结构专业']
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
            setNewProjectData({ mainName: '', mainCode: '', subName: '', subCode: '' });
        }
    };

    const handleImportSettings = () => {
        const { mainId, subId } = importSelection;
        const sourceMain = projects.find(p => p.id === mainId);
        const sourceSub = sourceMain?.subProjects?.find(s => s.id === subId);

        if (sourceSub) {
            updateCurrentSubProject(sp => ({
                ...sp,
                // Import categories
                submissionCategories: [...new Set([...(sp.submissionCategories || []), ...(sourceSub.submissionCategories || [])])],
                receivedCategories: [...new Set([...(sp.receivedCategories || []), ...(sourceSub.receivedCategories || [])])],
                // Import tasks
                tasks: [
                    ...(sp.tasks || []),
                    ...(sourceSub.tasks || [])
                        .filter(t => !sp.tasks?.some(ct => ct.content === t.content && ct.category === t.category))
                        .map(t => ({ ...t, id: `imported_${Date.now()}_${t.id}`, isCompleted: false, versions: [] }))
                ]
            }));
            setShowImportSettingsModal(false);
        }
    };

    const handleManualPlanAdd = () => {
        if (newPlanEntry.date && newPlanEntry.name) {
            updateCurrentSubProject(sp => ({
                ...sp,
                plans: [...sp.plans, { id: `mp_${Date.now()}`, date: newPlanEntry.date, name: newPlanEntry.name }]
            }));
            setNewPlanEntry({ date: '', name: '' });
            setShowPlanEntry(false);
        }
    };

    const handleGenerateQuestion = async () => {
        setLoadingAi(true);
        try {
            const categories = Object.values(TaskCategory);
            const randomCat = categories[Math.floor(Math.random() * categories.length)];
            const question = await generateWorkflowQuestion(randomCat, customModelName);
            setAiQuestion(question);
        } catch (e) {
            console.error('AI question generation failed', e);
            setAiQuestion("AI 助手暂时无法生成问题，请检查网络或稍后重试。");
        } finally {
            setLoadingAi(false);
        }
    };

    const handleAiAnalysis = async () => {
        if (!userInput.trim()) return;
        setLoadingAi(true);
        try {
            const result = await verifyDesignInput(userInput, customModelName);
            setAiAnalysis(result);
        } catch (e) {
            console.error('AI analysis failed', e);
            setAiAnalysis("AI 分析遇到了错误，请稍后再试。");
        } finally {
            setLoadingAi(false);
        }
    };

    const toggleTask = (id: string) => {
        updateCurrentSubProject(sp => ({
            ...sp,
            tasks: sp.tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)
        }));
    };

    const handleDeleteTask = (taskId: string) => {
        if (confirm("确定删除此任务项吗？")) {
            updateCurrentSubProject(sp => ({
                ...sp,
                tasks: sp.tasks.filter(t => t.id !== taskId)
            }));
        }
    };

    const planFileInputRef = useRef<HTMLInputElement>(null);
    const inputFileInputRef = useRef<HTMLInputElement>(null);

    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames?.[0];
            if (!wsname) return;
            const ws = wb.Sheets[wsname];
            if (!ws) return;
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            const newPlans: DesignPlan[] = [];
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row.length >= 2) {
                    let dateStr = row[0];
                    if (typeof dateStr === 'number') {
                        const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                        dateStr = dateObj.toISOString().split('T')[0];
                    }
                    const name = row[1];
                    if (dateStr && name) {
                        newPlans.push({
                            id: `p_${Date.now()}_${i}`,
                            date: String(dateStr).trim(),
                            name: String(name)
                        });
                    }
                }
            }
            updateCurrentSubProject(sp => ({ ...sp, plans: [...sp.plans, ...newPlans] }));
        };
        reader.readAsBinaryString(file);
        if (planFileInputRef.current) planFileInputRef.current.value = '';
    };

    const handleDesignInputImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            let content = "";
            if (file.name.endsWith('.txt')) {
                content = evt.target?.result as string;
            } else {
                content = `[系统提示] 已导入文件: ${file.name}。\n请在此处梳理关键设计输入信息...`;
            }
            updateCurrentSubProject(sp => ({ ...sp, designInputContent: sp.designInputContent + '\n\n' + content }));
        };
        reader.readAsText(file);
        if (inputFileInputRef.current) inputFileInputRef.current.value = '';
    };

    const handleTaskFileUpload = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        updateCurrentSubProject(sp => {
            const taskIndex = sp.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return sp;
            const task = sp.tasks[taskIndex];
            const newTasks = [...sp.tasks];
            newTasks[taskIndex] = { ...task, versions: task.versions.filter(v => v.version !== version) };
            return { ...sp, tasks: newTasks };
        });
    }

    const handleAddCategory = (group: TaskGroup, categoryName: string) => {
        if (!categoryName) return;
        updateCurrentSubProject(sp => {
            if (group === 'OUTGOING') {
                if (sp.submissionCategories.includes(categoryName)) return sp;
                return { ...sp, submissionCategories: [...sp.submissionCategories, categoryName] };
            } else if (group === 'RECEIVED') {
                if (sp.receivedCategories.includes(categoryName)) return sp;
                return { ...sp, receivedCategories: [...sp.receivedCategories, categoryName] };
            }
            return sp;
        });
    };

    const handleRemoveCategory = (group: TaskGroup, categoryName: string) => {
        updateCurrentSubProject(sp => {
            if (group === 'OUTGOING') {
                return { ...sp, submissionCategories: sp.submissionCategories.filter(c => c !== categoryName) };
            } else if (group === 'RECEIVED') {
                return { ...sp, receivedCategories: sp.receivedCategories.filter(c => c !== categoryName) };
            }
            return sp;
        });
    };

    // Open the Modal instead of using prompt
    const openAddTaskModal = (group: TaskGroup, category: string) => {
        setAddTaskParams({ group, category });
        setNewTaskContent('');
        setAddTaskModalOpen(true);
    };

    const handleConfirmAddTask = () => {
        if (!newTaskContent.trim() || !addTaskParams) return;

        const { group, category } = addTaskParams;

        updateCurrentSubProject(sp => {
            const newTask: TaskItem = {
                id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                category,
                group,
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

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoadingAi(true);

        try {
            if (!chatSessionRef.current) {
                const apiKey = process.env.API_KEY || '';
                if (!apiKey) throw new Error("API Key is missing");
                const ai = new GoogleGenAI({ apiKey });
                chatSessionRef.current = ai.chats.create({
                    model: customModelName,
                    config: {
                        systemInstruction: "You are a helpful and expert HVAC assistant."
                    }
                });
            }
            const result = await chatSessionRef.current.sendMessage({ message: userMsg });
            setChatMessages(prev => [...prev, { role: 'model', text: result.text || "No response." }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'model', text: "Error connecting to AI." }]);
            console.error(e);
        } finally {
            setLoadingAi(false);
        }
    };

    const renderDashboard = () => (
        <div className="flex gap-6 h-full overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0">

                {/* Top Fixed Area */}
                <div className="flex-shrink-0 bg-slate-50 z-10 pb-4 pr-2">
                    <div className="mb-4 flex justify-between items-center">
                        {/* Removed duplicate header */}
                        <button onClick={() => setShowImportSettingsModal(true)} className={`text-xs px-2 py-1 rounded bg-${theme}-100 text-${theme}-700 hover:bg-${theme}-200 transition shadow-sm`}>
                            ⚙️ 导入项目配置
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['CALCULATION', 'OUTGOING', 'RECEIVED', 'DESIGN_PROCESS'] as TaskGroup[]).map(group => {
                            const tasks = currentSub.tasks.filter(t => t.group === group);
                            const progress = tasks.length ? Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100) : 0;
                            return (
                                <div
                                    key={group}
                                    onClick={() => handleBoxClick(group)}
                                    className={`bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-${theme}-300`}
                                >
                                    <div className="text-xs font-medium text-slate-500 mb-1 truncate">{GROUP_LABELS[group]}</div>
                                    <div className={`text-2xl font-bold text-${theme}-700`}>{progress}%</div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                        <div className={`bg-${theme}-500 h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide space-y-6">

                    <div ref={calcRef}>
                        <Section
                            title={GROUP_LABELS['CALCULATION']}
                            isOpen={expandedGroups['CALCULATION']}
                            onToggle={() => setExpandedGroups({ ...expandedGroups, CALCULATION: !expandedGroups.CALCULATION })}
                            theme={theme}
                        >
                            {currentSub.tasks.filter(t => t.group === 'CALCULATION').map(task => (
                                <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onUpload={(e) => handleTaskFileUpload(task.id, e)} onDeleteVersion={handleDeleteVersion} onDeleteTask={() => handleDeleteTask(task.id)} theme={theme} />
                            ))}
                        </Section>
                    </div>

                    <div ref={outgoingRef}>
                        <Section
                            title={GROUP_LABELS['OUTGOING']}
                            isOpen={expandedGroups['OUTGOING']}
                            onToggle={() => setExpandedGroups({ ...expandedGroups, OUTGOING: !expandedGroups.OUTGOING })}
                            theme={theme}
                        >
                            <div className="flex flex-wrap gap-2 mb-4 px-4 animate-fade-in">
                                {currentSub.submissionCategories.map(cat => (
                                    <div key={cat} className="group relative">
                                        <button className={`px-3 py-1 bg-${theme}-50 text-${theme}-700 rounded text-sm hover:bg-${theme}-100 transition`}>{cat}</button>
                                        <button onClick={() => handleRemoveCategory('OUTGOING', cat)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                                    </div>
                                ))}
                                <button onClick={() => { const c = prompt('新分类名称:'); if (c) handleAddCategory('OUTGOING', c); }} className="px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded text-sm hover:bg-slate-50 hover:text-blue-500 transition">+ 分类</button>
                            </div>

                            {currentSub.submissionCategories.map(cat => (
                                <div key={cat} className="mb-4 px-4 transition-all duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className={`font-bold text-slate-600 text-sm border-l-4 border-${theme}-400 pl-2`}>{cat}</h4>
                                        <button onClick={() => openAddTaskModal('OUTGOING', cat)} className={`text-xs text-${theme}-600 hover:underline font-medium cursor-pointer`}>+ 添加提资项</button>
                                    </div>
                                    <div className="space-y-2">
                                        {currentSub.tasks.filter(t => t.group === 'OUTGOING' && t.category === cat).map(task => (
                                            <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onUpload={(e) => handleTaskFileUpload(task.id, e)} onDeleteVersion={handleDeleteVersion} onDeleteTask={() => handleDeleteTask(task.id)} theme={theme} />
                                        ))}
                                        {currentSub.tasks.filter(t => t.group === 'OUTGOING' && t.category === cat).length === 0 && (
                                            <div className="text-xs text-slate-400 italic pl-2">暂无提资项</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </Section>
                    </div>

                    <div ref={receivedRef}>
                        <Section
                            title={GROUP_LABELS['RECEIVED']}
                            isOpen={expandedGroups['RECEIVED']}
                            onToggle={() => setExpandedGroups({ ...expandedGroups, RECEIVED: !expandedGroups.RECEIVED })}
                            theme={theme}
                        >
                            <div className="flex flex-wrap gap-2 mb-4 px-4 animate-fade-in">
                                {currentSub.receivedCategories.map(cat => (
                                    <div key={cat} className="group relative">
                                        <button className={`px-3 py-1 bg-${theme}-50 text-${theme}-700 rounded text-sm hover:bg-${theme}-100 transition`}>{cat}</button>
                                        <button onClick={() => handleRemoveCategory('RECEIVED', cat)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">×</button>
                                    </div>
                                ))}
                                <button onClick={() => { const c = prompt('新分类名称:'); if (c) handleAddCategory('RECEIVED', c); }} className="px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded text-sm hover:bg-slate-50 hover:text-blue-500 transition">+ 分类</button>
                            </div>

                            {currentSub.receivedCategories.map(cat => (
                                <div key={cat} className="mb-4 px-4 transition-all duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className={`font-bold text-slate-600 text-sm border-l-4 border-${theme}-400 pl-2`}>{cat}</h4>
                                        <button onClick={() => openAddTaskModal('RECEIVED', cat)} className={`text-xs text-${theme}-600 hover:underline font-medium cursor-pointer`}>+ 添加接收项</button>
                                    </div>
                                    <div className="space-y-2">
                                        {currentSub.tasks.filter(t => t.group === 'RECEIVED' && t.category === cat).map(task => (
                                            <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onUpload={(e) => handleTaskFileUpload(task.id, e)} onDeleteVersion={handleDeleteVersion} onDeleteTask={() => handleDeleteTask(task.id)} theme={theme} />
                                        ))}
                                        {currentSub.tasks.filter(t => t.group === 'RECEIVED' && t.category === cat).length === 0 && (
                                            <div className="text-xs text-slate-400 italic pl-2">暂无接收项</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </Section>
                    </div>

                    <div ref={processRef}>
                        <Section
                            title={GROUP_LABELS['DESIGN_PROCESS']}
                            isOpen={expandedGroups['DESIGN_PROCESS']}
                            onToggle={() => setExpandedGroups({ ...expandedGroups, DESIGN_PROCESS: !expandedGroups.DESIGN_PROCESS })}
                            theme={theme}
                        >
                            <div className="px-4 mb-2 flex justify-end">
                                <button onClick={() => openAddTaskModal('DESIGN_PROCESS', TaskCategory.GENERAL_DESIGN)} className={`text-xs text-${theme}-600 hover:underline font-medium cursor-pointer`}>+ 添加设计流程项</button>
                            </div>
                            {currentSub.tasks.filter(t => t.group === 'DESIGN_PROCESS').map(task => (
                                <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onUpload={(e) => handleTaskFileUpload(task.id, e)} onDeleteVersion={handleDeleteVersion} onDeleteTask={() => handleDeleteTask(task.id)} theme={theme} />
                            ))}
                        </Section>
                    </div>
                </div>
            </div>

            <div className="w-80 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pb-20 scrollbar-hide animate-fade-in-right">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">项目日历</h3>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setShowPlanEntry(!showPlanEntry)} className={`text-xs text-${theme}-600 font-bold border border-${theme}-200 px-1 rounded hover:bg-${theme}-50`} title="手动添加">+添加</button>
                            <button onClick={() => downloadTemplate('plan')} className={`text-xs text-${theme}-600 hover:underline`} title="下载模版">⬇</button>
                            <button onClick={() => planFileInputRef.current?.click()} className={`text-xs text-${theme}-600 hover:underline`}>导入</button>
                        </div>
                        <input type="file" ref={planFileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
                    </div>

                    {showPlanEntry && (
                        <div className="p-3 bg-yellow-50 border-b border-yellow-100 animate-fade-in">
                            <input type="date" className="w-full border p-1 rounded mb-1 text-xs" value={newPlanEntry.date} onChange={e => setNewPlanEntry({ ...newPlanEntry, date: e.target.value })} />
                            <input type="text" placeholder="里程碑名称" className="w-full border p-1 rounded mb-2 text-xs" value={newPlanEntry.name} onChange={e => setNewPlanEntry({ ...newPlanEntry, name: e.target.value })} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowPlanEntry(false)} className="text-xs text-slate-500">取消</button>
                                <button onClick={handleManualPlanAdd} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">确认</button>
                            </div>
                        </div>
                    )}

                    <Calendar plans={currentSub.plans} />
                    <div className="p-3 text-xs text-slate-500 border-t border-slate-100">
                        提示：悬停在标记日期上查看里程碑。
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col transition-all hover:shadow-md">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">设计输入提要</h3>
                        <div className="flex gap-2">
                            <button onClick={() => downloadTemplate('input')} className={`text-xs text-${theme}-600 hover:underline`} title="下载模版">⬇ 模版</button>
                            <button onClick={() => inputFileInputRef.current?.click()} className={`text-xs text-${theme}-600 hover:underline`}>导入输入</button>
                        </div>
                        <input type="file" ref={inputFileInputRef} onChange={handleDesignInputImport} accept=".txt, .doc, .docx" className="hidden" />
                    </div>
                    <textarea
                        className="flex-1 w-full p-3 text-sm text-slate-700 resize-none focus:outline-none"
                        value={currentSub.designInputContent}
                        onChange={(e) => updateCurrentSubProject(sp => ({ ...sp, designInputContent: e.target.value }))}
                        placeholder="在此处梳理关键设计输入..."
                    />
                </div>

            </div>

            {aiQuestion && (
                <div className="fixed bottom-6 right-6 z-40 max-w-md bg-indigo-50 border border-indigo-200 rounded-lg p-6 shadow-2xl animate-bounce-in">
                    <button
                        onClick={() => setAiQuestion(null)}
                        className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <div className="flex items-start space-x-4">
                        <div className="bg-indigo-100 p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900 mb-1">AI 流程质检提问</h3>
                            <p className="text-indigo-800 text-sm">{aiQuestion}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderRegulations = () => (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white px-6 py-4 shadow-sm border-b border-slate-200 z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">强制性条文库</h2>
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
                    <h2 className="text-2xl font-bold text-slate-800">常见错误预警</h2>
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

    const renderAiAssistant = () => (
        <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">AI 辅助设计助手</h2>
            <div className="flex-1 bg-white rounded-lg shadow-inner border border-slate-200 p-4 overflow-y-auto space-y-4 mb-4">
                {chatMessages.length === 0 && (
                    <div className="text-center text-slate-400 mt-10">
                        <p>请描述您的设计问题，例如：</p>
                        <ul className="mt-2 space-y-1 text-sm">
                            <li>"如何确定排烟风机的风量？"</li>
                            <li>"帮我检查这段设计说明是否符合规范..."</li>
                        </ul>
                    </div>
                )}
                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                            <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {loadingAi && (
                    <div className="flex justify-start">
                        <div className="bg-slate-50 text-slate-500 rounded-lg p-3">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="输入问题..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                />
                <button
                    onClick={handleChatSend}
                    disabled={loadingAi}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    发送
                </button>
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
                                { id: 'dashboard', label: '项目看板', icon: '📊' },
                                { id: 'regulations', label: '规范库', icon: '📜' },
                                { id: 'errors', label: '常见错误', icon: '❌' },
                                { id: 'gallery', label: '图库', icon: '🖼️' },
                                { id: 'ai-assistant', label: 'AI 助手', icon: '🤖' }
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
                            {currentView === 'dashboard' ? '设计流程监控' :
                                currentView === 'regulations' ? '强制性条文库' :
                                    currentView === 'errors' ? '常见差错库' :
                                        currentView === 'gallery' ? '设计大样图库' : 'AI 智能助手'}
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
                            {currentView === 'gallery' && (
                                <Gallery
                                    theme={theme}
                                    items={currentSub.gallery}
                                    onAdd={(files) => {
                                        const newItems = files.map((f, i) => ({
                                            id: `g_${Date.now()}_${i}`,
                                            title: f.title,
                                            drawingNumber: f.drawingNumber,
                                            url: URL.createObjectURL(f.file),
                                            category: 'general',
                                            uploadDate: new Date().toLocaleDateString(),
                                            type: f.file.type === 'application/pdf' ? 'pdf' : 'image' as any
                                        }));
                                        updateCurrentSubProject(sp => ({ ...sp, gallery: [...sp.gallery, ...newItems] }));
                                    }}
                                    onRemove={(id) => updateCurrentSubProject(sp => ({ ...sp, gallery: sp.gallery.filter(g => g.id !== id) }))}
                                />
                            )}
                            {currentView === 'ai-assistant' && renderAiAssistant()}
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
                            <p className="text-slate-400 text-sm font-bold mt-2">定义全新的主项目与协同子项</p>
                        </div>
                        <div className="space-y-6">
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
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-between">
                            <button onClick={() => setShowNewProjectModal(false)} className="px-6 py-4 text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-xs">放弃</button>
                            <button onClick={handleCreateProject} className={`px-10 py-4 bg-${theme}-600 text-white font-black rounded-3xl shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 hover:-translate-y-1 transition active:translate-y-0 text-sm`}>开启设计</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Settings Modal */}
            {showImportSettingsModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 animate-scale-in">
                        <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">配置一键同步</h3>
                        <p className="text-sm text-slate-400 font-bold mb-10">快速从历史优选工程中复用任务模版</p>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">来源工程</label>
                                    <select
                                        className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 bg-slate-50 font-bold text-sm text-slate-700 appearance-none transition-all cursor-pointer"
                                        onChange={(e) => setImportSelection(prev => ({ ...prev, mainId: e.target.value, subId: '' }))}
                                        value={importSelection.mainId}
                                    >
                                        <option value="">请选择项目</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">来源子项</label>
                                    <select
                                        className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 bg-slate-50 font-bold text-sm text-slate-700 appearance-none transition-all cursor-pointer disabled:opacity-30"
                                        onChange={(e) => setImportSelection(prev => ({ ...prev, subId: e.target.value }))}
                                        value={importSelection.subId}
                                        disabled={!importSelection.mainId}
                                    >
                                        <option value="">请选择子项</option>
                                        {projects.find(p => p.id === importSelection.mainId)?.subProjects.map(sp => (
                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-blue-50/50 p-6 rounded-[2rem] flex gap-4 border border-blue-100/50">
                                <span className="text-2xl">💡</span>
                                <p className="text-sm text-blue-800/80 leading-relaxed font-bold">
                                    导入后将同步目标工程的所有<b>收发提资分类</b>与<b>任务清单</b>，现有子项的配置将被按需补充。
                                </p>
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-between">
                            <button onClick={() => setShowImportSettingsModal(false)} className="px-6 py-4 text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-xs">取消操作</button>
                            <button onClick={handleImportSettings} className={`px-10 py-4 bg-${theme}-600 text-white font-black rounded-3xl shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 transition ${!importSelection.subId ? 'opacity-30 cursor-not-allowed' : ''}`} disabled={!importSelection.subId}>开始同步</button>
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

            {/* Global Modals */}
            {showModal && <MandatoryClauseModal onClose={() => setShowModal(false)} />}
        </div>
    );
};

export default App;