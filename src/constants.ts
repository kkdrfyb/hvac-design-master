import { TaskItem, MandatoryClause, CommonError, MainProject, TaskGroup, TaskCategory } from './types';

// Helper to create initial tasks for a new subproject
export const createInitialTasks = (): TaskItem[] => [
  // --- Calculations ---
  {
    id: 'c1',
    category: TaskCategory.LOAD_CALC,
    group: 'CALCULATION',
    content: '完成夏季逐时冷负荷计算及冬季热负荷计算',
    isCompleted: false,
    versions: []
  },
  {
    id: 'c2',
    category: TaskCategory.SMOKE_CALC,
    group: 'CALCULATION',
    content: '完成防烟分区排烟量及楼梯间加压送风量计算',
    isCompleted: false,
    versions: []
  },
  {
    id: 'c3',
    category: TaskCategory.RESISTANCE_CALC,
    group: 'CALCULATION',
    content: '完成最不利环路风管及水管阻力计算',
    isCompleted: false,
    versions: []
  },
  {
    id: 'c4',
    category: TaskCategory.EQUIP_REVIEW,
    group: 'CALCULATION',
    content: '校核设备选型参数（冷机、水泵、风机）是否满足工况要求',
    isCompleted: false,
    versions: []
  },

  // --- Outgoing Submissions (Default items) ---
  {
    id: 's1',
    category: '结构专业',
    group: 'OUTGOING',
    content: '核对所有穿墙、穿楼板孔洞位置及尺寸',
    isCompleted: false,
    versions: []
  },
  {
    id: 'e1',
    category: '电气专业',
    group: 'OUTGOING',
    content: '提供所有空调末端及主机的用电功率（工作/备用）',
    isCompleted: false,
    versions: []
  },

  // --- Received Data ---
  {
    id: 'ra1',
    category: '建筑专业',
    group: 'RECEIVED',
    content: '接收建筑最新平立剖底图及防火分区图',
    isCompleted: false,
    versions: []
  },

  // --- Design Process ---
  {
    id: 'h1',
    category: TaskCategory.HEATING_PIPELINE,
    group: 'DESIGN_PROCESS',
    content: '布置固定支架位置，进行受力分析',
    isCompleted: false,
    versions: []
  },
  {
    id: 'v1',
    category: TaskCategory.VENTILATION_SYSTEM,
    group: 'DESIGN_PROCESS',
    content: '计算各房间换气次数是否达标',
    isCompleted: false,
    versions: []
  }
];

export const INITIAL_PROJECTS: MainProject[] = [
  {
    id: 'mp1',
    name: '田湾核电项目',
    code: '0603',
    subProjects: [
      {
        id: 'sp1',
        name: '氯气制备站',
        code: '01UTL',
        tasks: createInitialTasks(),
        plans: [
          { id: 'p1', name: '初步设计提交', date: new Date().toISOString().split('T')[0] }
        ],
        designInputContent: '1. 室外计算参数按连云港气象参数执行。\n2. 室内设计温度：夏季26±2℃，冬季18±2℃。\n3. 氯气储存间需设置事故通风系统，换气次数不小于12次/h。\n4. 所有通风设备需采用防爆型。',
        gallery: [],
        submissionCategories: ['结构专业', '电气专业', '自控专业', '通信专业', '防护专业', '总图专业'],
        receivedCategories: ['建筑专业', '结构专业', '工艺专业', '电气专业']
      }
    ]
  }
];

export const MANDATORY_CLAUSES: MandatoryClause[] = [
  {
    id: 'm2',
    code: 'GB 50016-2014',
    clauseNumber: '9.3.11',
    content: '通风、空气调节系统的风管在穿越防火分区处、穿越通风、空气调节机房的房间隔墙和楼板处等部位应设置防火阀。'
  },
  {
    id: 'm4',
    code: 'GB 50019-2015',
    clauseNumber: '6.3.9',
    content: '事故通风的排风口，应配置在有害气体散发量可能最大的地点。'
  },
  {
    id: 'm5',
    code: 'GB 50016-2014',
    clauseNumber: '8.5.3',
    content: '民用建筑的下列场所或部位应设置排烟设施：设置在一、二、三层且房间建筑面积大于100m²的歌舞娱乐放映游艺场所。'
  },
  {
    id: 'm6',
    code: 'GB 50016-2014',
    clauseNumber: '9.3.2',
    content: '厂房内有爆炸危险场所的排风管道，严禁穿过防火墙和有爆炸危险的房间隔墙。'
  },
  {
    id: 'm7',
    code: 'GB 50189-2015',
    clauseNumber: '4.2.19',
    content: '空调冷却水系统应设置自动监测与控制功能，并应能根据负荷变化自动调节冷却水流量或风机转速。'
  },
  {
    id: 'm9',
    code: 'GB 50016-2014',
    clauseNumber: '6.4.1',
    content: '疏散楼梯间应符合下列规定：楼梯间内不应设置烧水间、可燃材料储藏室、垃圾道。'
  },
  {
    id: 'm11',
    code: 'GB 50016-2014',
    clauseNumber: '9.3.16',
    content: '燃油或燃气锅炉房应设置自然通风或机械通风设施。燃气锅炉房应选用防爆型的事故排风机。'
  }
];

export const COMMON_ERRORS: CommonError[] = [
  {
    id: 'err1',
    title: '防火阀设置遗漏',
    category: TaskCategory.VENTILATION_SYSTEM,
    description: '经常遗漏穿越重要机房或变形缝处的防火阀。',
    solution: '检查所有穿越防火分区、变形缝及重要设备机房的管段，并在系统图中标注。'
  },
  {
    id: 'err2',
    title: '冷凝水管坡度不足',
    category: TaskCategory.GENERAL_DESIGN,
    description: '吊顶空间有限时，冷凝水管坡度往往小于0.005，导致排水不畅漏水。',
    solution: '在剖面图中严格复核吊顶高度，确保至少1%的坡度，必要时增加提升泵。'
  },
  {
    id: 'err3',
    title: '采暖管道补偿器选型错误',
    category: TaskCategory.HEATING_PIPELINE,
    description: '高层建筑立管未考虑足够的自然补偿或补偿器安装位置错误。',
    solution: '严格计算热伸长量，优先利用L型、Z型自然补偿，固定支架必须能承受推力。'
  },
  {
    id: 'err4',
    title: '结构孔洞提资遗漏',
    // We keep task category strings for compatibility or use strings directly
    category: '结构提资',
    description: '由于管线综合调整后未及时更新结构提资图，导致现场开洞困难。',
    solution: '在最终出图前，必须进行一次结构底图与暖通平面图的叠图检查。'
  }
];