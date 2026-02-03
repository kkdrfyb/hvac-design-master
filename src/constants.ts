import { TaskItem, MandatoryClause, CommonError, MainProject, TaskGroup, DesignStage, ProjectType, TemplateCategory } from './types';

export const DESIGN_STAGES: DesignStage[] = ['方案设计', '初步设计', '施工图设计'];

export const PROJECT_TYPES: ProjectType[] = ['核岛厂房', '附属工业厂房', '其他'];

export const TEMPLATE_CATEGORIES: Record<ProjectType, Record<DesignStage, TemplateCategory[]>> = {
  核岛厂房: {
    方案设计: [
      {
        id: 'ni-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'ni-i-1', content: '核岛相关专业条件是否齐备（工艺系统/电气条件/安全级别与边界）', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口', minimal: true },
          { id: 'ni-i-2', content: '核岛系统边界条件是否统一（房间边界/安全边界）', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'ni-risk',
        name: '安全与系统风险',
        group: 'RISK',
        items: [
          { id: 'ni-r-1', content: '主要通风与空调系统方案是否明确（系统划分/运行工况/设备配置原则）', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险', minimal: true },
          { id: 'ni-r-2', content: '关键房间安全风险控制方案是否确认', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险' }
        ]
      },
      {
        id: 'ni-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'ni-d-1', content: '初设阶段暖通成果是否形成（初设说明书/系统图/关键计算文件）', group: 'DELIVERABLE', categoryId: 'ni-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    初步设计: [
      {
        id: 'ni-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'ni-i-1', content: '核岛相关专业条件是否齐备（工艺系统/电气条件/安全级别与边界）', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口', minimal: true },
          { id: 'ni-i-2', content: '核岛系统边界条件是否统一（房间边界/安全边界）', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'ni-risk',
        name: '安全与系统风险',
        group: 'RISK',
        items: [
          { id: 'ni-r-1', content: '主要通风与空调系统方案是否明确（系统划分/运行工况/设备配置原则）', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险', minimal: true },
          { id: 'ni-r-2', content: '关键房间安全风险控制方案是否确认', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险' }
        ]
      },
      {
        id: 'ni-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'ni-d-1', content: '初设阶段暖通成果是否形成（初设说明书/系统图/关键计算文件）', group: 'DELIVERABLE', categoryId: 'ni-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    施工图设计: [
      {
        id: 'ni-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'ni-ci-1', content: '多专业接口条件是否最终确认（结构预留/电气接口/仪控边界）', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口', minimal: true },
          { id: 'ni-ci-2', content: '施工图接口变更记录是否闭合', group: 'INTERFACE', categoryId: 'ni-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'ni-risk',
        name: '安全与系统风险',
        group: 'RISK',
        items: [
          { id: 'ni-cr-1', content: '关键系统与房间通风空调设计是否闭合（系统完整性/冗余/极端工况）', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险', minimal: true },
          { id: 'ni-cr-2', content: '系统冗余与关键设备配置是否落实', group: 'RISK', categoryId: 'ni-risk', category: '安全与系统风险' }
        ]
      },
      {
        id: 'ni-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'ni-cd-1', content: '施工图阶段成果文件是否齐全（施工图/设备表/计算书/设计说明）', group: 'DELIVERABLE', categoryId: 'ni-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ]
  },
  附属工业厂房: {
    方案设计: [
      {
        id: 'aux-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'aux-i-1', content: '其他专业关键条件是否齐备（工艺条件/电气防爆分区/安全条件）', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口', minimal: true },
          { id: 'aux-i-2', content: '厂房边界条件是否明确（净高/设备区划分）', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'aux-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'aux-r-1', content: '危险气体相关通风设计是否完成（氯气/氢气区域通风方案与计算）', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制', minimal: true },
          { id: 'aux-r-2', content: '事故通风系统设置条件是否落实', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制' }
        ]
      },
      {
        id: 'aux-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'aux-d-1', content: '当前阶段成果文件是否已形成（暖通图纸或说明性成果）', group: 'DELIVERABLE', categoryId: 'aux-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    初步设计: [
      {
        id: 'aux-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'aux-i-1', content: '其他专业关键条件是否齐备（工艺条件/电气防爆分区/安全条件）', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口', minimal: true },
          { id: 'aux-i-2', content: '厂房边界条件是否明确（净高/设备区划分）', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'aux-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'aux-r-1', content: '危险气体相关通风设计是否完成（氯气/氢气区域通风方案与计算）', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制', minimal: true },
          { id: 'aux-r-2', content: '事故通风系统设置条件是否落实', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制' }
        ]
      },
      {
        id: 'aux-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'aux-d-1', content: '当前阶段成果文件是否已形成（暖通图纸或说明性成果）', group: 'DELIVERABLE', categoryId: 'aux-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    施工图设计: [
      {
        id: 'aux-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'aux-ci-1', content: '多专业接口条件是否最终确认（结构预留/电气接口/仪控边界）', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口', minimal: true },
          { id: 'aux-ci-2', content: '现场接口变更记录是否闭合', group: 'INTERFACE', categoryId: 'aux-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'aux-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'aux-cr-1', content: '危险气体区域通风系统是否闭合（冗余/极端工况）', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制', minimal: true },
          { id: 'aux-cr-2', content: '事故通风系统联锁与排风路径是否确认', group: 'RISK', categoryId: 'aux-risk', category: '安全与风险控制' }
        ]
      },
      {
        id: 'aux-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'aux-cd-1', content: '施工图阶段成果文件是否齐全（施工图/设备表/计算书/设计说明）', group: 'DELIVERABLE', categoryId: 'aux-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ]
  },
  其他: {
    方案设计: [
      {
        id: 'gen-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'gen-i-1', content: '多专业接口条件是否齐备', group: 'INTERFACE', categoryId: 'gen-interface', category: '多专业接口', minimal: true },
          { id: 'gen-i-2', content: '关键边界条件是否明确', group: 'INTERFACE', categoryId: 'gen-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'gen-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'gen-r-1', content: '安全/风险相关系统方案是否明确', group: 'RISK', categoryId: 'gen-risk', category: '安全与风险控制', minimal: true }
        ]
      },
      {
        id: 'gen-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'gen-d-1', content: '当前阶段成果文件是否已形成', group: 'DELIVERABLE', categoryId: 'gen-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    初步设计: [
      {
        id: 'gen-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'gen-i-1', content: '多专业接口条件是否齐备', group: 'INTERFACE', categoryId: 'gen-interface', category: '多专业接口', minimal: true },
          { id: 'gen-i-2', content: '关键边界条件是否明确', group: 'INTERFACE', categoryId: 'gen-interface', category: '多专业接口' }
        ]
      },
      {
        id: 'gen-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'gen-r-1', content: '安全/风险相关系统方案是否明确', group: 'RISK', categoryId: 'gen-risk', category: '安全与风险控制', minimal: true }
        ]
      },
      {
        id: 'gen-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'gen-d-1', content: '当前阶段成果文件是否已形成', group: 'DELIVERABLE', categoryId: 'gen-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ],
    施工图设计: [
      {
        id: 'gen-interface',
        name: '多专业接口',
        group: 'INTERFACE',
        items: [
          { id: 'gen-ci-1', content: '多专业接口条件是否最终确认', group: 'INTERFACE', categoryId: 'gen-interface', category: '多专业接口', minimal: true }
        ]
      },
      {
        id: 'gen-risk',
        name: '安全与风险控制',
        group: 'RISK',
        items: [
          { id: 'gen-cr-1', content: '关键系统设计是否闭合', group: 'RISK', categoryId: 'gen-risk', category: '安全与风险控制', minimal: true }
        ]
      },
      {
        id: 'gen-deliver',
        name: '阶段成果',
        group: 'DELIVERABLE',
        items: [
          { id: 'gen-cd-1', content: '施工图阶段成果文件是否齐全', group: 'DELIVERABLE', categoryId: 'gen-deliver', category: '阶段成果', minimal: true }
        ]
      }
    ]
  }
};

export const buildTasksFromTemplate = (type: ProjectType, stage: DesignStage, enabledCategoryIds: string[]): TaskItem[] => {
  const categories = TEMPLATE_CATEGORIES[type][stage];
  const enabledSet = new Set(enabledCategoryIds);
  return categories
    .filter(category => enabledSet.has(category.id))
    .flatMap(category =>
      category.items.map(item => ({
        id: `${stage}-${item.id}-${Math.random().toString(36).slice(2, 8)}`,
        categoryId: item.categoryId,
        category: item.category,
        group: item.group,
        stage,
        content: item.content,
        isCompleted: false,
        versions: []
      }))
    );
};

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
        type: '附属工业厂房',
        stage: '初步设计',
        stageHistory: [],
        enabledCategoryIds: TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id),
        tasks: buildTasksFromTemplate('附属工业厂房', '初步设计', TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id)),
        plans: [
          { id: 'p1', name: '初步设计提交', date: new Date().toISOString().split('T')[0] }
        ],
        designInputContent: '1. 室外计算参数按连云港气象参数执行。\n2. 室内设计温度：夏季26±2℃，冬季18±2℃。\n3. 氯气储存间需设置事故通风系统，换气次数不小于12次/h。\n4. 所有通风设备需采用防爆型。',
        gallery: []
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
    category: '通风系统',
    description: '经常遗漏穿越重要机房或变形缝处的防火阀。',
    solution: '检查所有穿越防火分区、变形缝及重要设备机房的管段，并在系统图中标注。'
  },
  {
    id: 'err2',
    title: '冷凝水管坡度不足',
    category: '通用设计流程',
    description: '吊顶空间有限时，冷凝水管坡度往往小于0.005，导致排水不畅漏水。',
    solution: '在剖面图中严格复核吊顶高度，确保至少1%的坡度，必要时增加提升泵。'
  },
  {
    id: 'err3',
    title: '采暖管道补偿器选型错误',
    category: '采暖管道',
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
