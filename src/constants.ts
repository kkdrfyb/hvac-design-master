import { TaskItem, MandatoryClause, CommonError, MainProject, TaskGroup, DesignStage, ProjectType, TemplateCategory } from './types';

export const DESIGN_STAGES: DesignStage[] = ['方案设计', '初步设计', '施工图设计'];

export const PROJECT_TYPES: ProjectType[] = ['核岛厂房', '附属工业厂房', '其他'];

export const TEMPLATE_CATEGORIES: Record<ProjectType, Record<DesignStage, TemplateCategory[]>> = {
  核岛厂房: {
    方案设计: [
      {
        id: 'ni-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'ni-int-s-1', content: '核岛房间功能分区与温湿度设计指标是否明确', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计', minimal: true },
          { id: 'ni-int-s-2', content: '主要系统设计原则与运行工况是否形成内部结论', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计' }
        ]
      },
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
        id: 'ni-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'ni-int-p-1', content: '核岛主要系统方案与控制策略是否形成初设结论', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计', minimal: true },
          { id: 'ni-int-p-2', content: '关键设备选型边界条件是否完成校核', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计' }
        ]
      },
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
        id: 'ni-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'ni-int-c-1', content: '施工图层面系统细化与房间参数是否全部闭合', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计', minimal: true },
          { id: 'ni-int-c-2', content: '关键节点做法与控制逻辑是否可落地', group: 'INTERNAL', categoryId: 'ni-internal', category: '专业内部设计' }
        ]
      },
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
      },
      {
        id: 'ni-equipment',
        name: '设备审查',
        group: 'EQUIPMENT_REVIEW',
        items: [
          { id: 'ni-eq-1', content: '关键设备技术参数与图纸一致性是否审查完成', group: 'EQUIPMENT_REVIEW', categoryId: 'ni-equipment', category: '设备审查', minimal: true },
          { id: 'ni-eq-2', content: '设备接口条件与安装维护空间是否确认', group: 'EQUIPMENT_REVIEW', categoryId: 'ni-equipment', category: '设备审查' }
        ]
      }
    ]
  },
  附属工业厂房: {
    方案设计: [
      {
        id: 'aux-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'aux-int-s-1', content: '厂房工况与通风空调系统原则是否形成内部方案', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计', minimal: true },
          { id: 'aux-int-s-2', content: '主要设备布置约束与检修需求是否明确', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计' }
        ]
      },
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
        id: 'aux-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'aux-int-p-1', content: '关键系统工况与计算边界是否完成初设校核', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计', minimal: true },
          { id: 'aux-int-p-2', content: '主要设备选型原则与系统控制逻辑是否明确', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计' }
        ]
      },
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
        id: 'aux-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'aux-int-c-1', content: '施工图阶段系统深化设计是否完整闭合', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计', minimal: true },
          { id: 'aux-int-c-2', content: '关键节点构造与控制策略是否可实施', group: 'INTERNAL', categoryId: 'aux-internal', category: '专业内部设计' }
        ]
      },
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
      },
      {
        id: 'aux-equipment',
        name: '设备审查',
        group: 'EQUIPMENT_REVIEW',
        items: [
          { id: 'aux-eq-1', content: '关键设备参数与系统设计输入是否一致', group: 'EQUIPMENT_REVIEW', categoryId: 'aux-equipment', category: '设备审查', minimal: true },
          { id: 'aux-eq-2', content: '设备接口条件、检修与替换空间是否确认', group: 'EQUIPMENT_REVIEW', categoryId: 'aux-equipment', category: '设备审查' }
        ]
      }
    ]
  },
  其他: {
    方案设计: [
      {
        id: 'gen-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'gen-int-s-1', content: '专业内部设计输入条件是否完整', group: 'INTERNAL', categoryId: 'gen-internal', category: '专业内部设计', minimal: true }
        ]
      },
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
        id: 'gen-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'gen-int-p-1', content: '专业内部系统方案与计算是否完成初设校核', group: 'INTERNAL', categoryId: 'gen-internal', category: '专业内部设计', minimal: true }
        ]
      },
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
        id: 'gen-internal',
        name: '专业内部设计',
        group: 'INTERNAL',
        items: [
          { id: 'gen-int-c-1', content: '施工图层面专业内部设计是否闭合', group: 'INTERNAL', categoryId: 'gen-internal', category: '专业内部设计', minimal: true }
        ]
      },
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
      },
      {
        id: 'gen-equipment',
        name: '设备审查',
        group: 'EQUIPMENT_REVIEW',
        items: [
          { id: 'gen-eq-1', content: '关键设备参数与图纸一致性是否复核', group: 'EQUIPMENT_REVIEW', categoryId: 'gen-equipment', category: '设备审查', minimal: true }
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
        status: 'TODO',
        versions: [],
        comments: []
      }))
    );
};

export const INITIAL_PROJECTS: MainProject[] = [
  {
    id: 'mp1',
    name: '田湾核电项目',
    code: '0603',
    designSpecTemplates: [],
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
      operationLogs: [],
      focusItems: [],
      designSpecs: [],
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

MANDATORY_CLAUSES.push(
  {
    id: 'm50019_notice',
    code: 'GB 50019-2015',
    clauseNumber: '公告第822号',
    content:
      '《工业建筑供暖通风与空气调节设计规范》GB 50019-2015 自2016年2月1日起实施；公告列明的强制性条文包括5.4.12、5.5.2、5.7.4、5.8.17、6.1.13、6.2.2、6.3.2、6.3.10、6.4.7、6.9.2、6.9.3、6.9.9、6.9.12、6.9.13、6.9.15、6.9.19、6.9.30、8.5.6、9.1.2、9.4.4(4)、9.7.12、9.11.3、10.2.12、11.2.11、11.6.7。',
  },
  {
    id: 'm50019_outline',
    code: 'GB 50019-2015',
    clauseNumber: '第6章至第11章',
    content:
      '本规范的暖通核心内容覆盖通风、除尘与有害气体净化、空气调节、冷源与热源、矿井空气调节以及监测与控制，可作为工业项目暖通系统设计、校核和复核的基础检索入口。',
  },
  {
    id: 'm50736_notice',
    code: 'GB 50736-2012',
    clauseNumber: '公告第1270号',
    content:
      '《民用建筑供暖通风与空气调节设计规范》GB 50736-2012 自2012年10月1日起实施；公告列明的强制性条文包括3.0.6(1)、5.2.1、5.3.5、5.3.10、5.4.3(1)、5.4.6、5.5.1、5.5.5、5.5.8、5.6.1、5.6.6、5.7.3、5.9.5、5.10.1、6.1.6、6.3.2、6.3.9(2)、6.6.13、6.6.16、7.2.1、7.2.10、7.2.11(1、3)、7.5.2(3)、7.5.6、8.1.2、8.1.8、8.2.2、8.2.5、8.3.4(1)、8.3.5(4)、8.5.20(1)、8.7.7(4)、8.10.3(1、2、3)、8.11.14、9.1.5(1、2、3、4)、9.4.9。',
  },
  {
    id: 'm50736_scope',
    code: 'GB 50736-2012',
    clauseNumber: '1.0.2',
    content:
      '本规范适用于新建、改建和扩建民用建筑的供暖、通风与空气调节设计，不适用于有特殊用途、特殊净化与防护要求的建筑物以及临时性建筑物设计。',
  },
  {
    id: 'm50736_outline',
    code: 'GB 50736-2012',
    clauseNumber: '第5章至第11章',
    content:
      '本规范主要技术内容包括供暖、通风、空气调节、冷源与热源、检测与监控、消声与隔振、绝热与防腐，可作为民用建筑暖通设计的基础索引。',
  },
  {
    id: 'm50016_notice',
    code: 'GB 50016-2014（2018年版）',
    clauseNumber: '2018年版说明',
    content:
      '《建筑设计防火规范》GB 50016-2014（2018年版）仍是大量建筑防火审查与复核的常用依据，但自GB 55037-2022实施后，公告列明的相关强制性条文应按新通用规范执行。',
  },
  {
    id: 'm50016_replace',
    code: 'GB 50016-2014（2018年版）',
    clauseNumber: '与GB 55037-2022衔接',
    content:
      '官方公告明确，GB 50016-2014（2018年版）中被废止的强制性条文包含多项暖通和防排烟条款，如8.5.3、9.3.2、9.3.11、9.3.16等；项目审查时需注意与GB 55037-2022的衔接。',
  },
  {
    id: 'm55036_notice',
    code: 'GB 55036-2022',
    clauseNumber: '公告第116号',
    content:
      '《消防设施通用规范》GB 55036-2022 自2023年3月1日起实施，为强制性工程建设规范，全部条文必须严格执行；现行工程建设标准相关规定与本规范不一致时，以本规范为准。',
  },
  {
    id: 'm55036_outline',
    code: 'GB 55036-2022',
    clauseNumber: '主要章节',
    content:
      '本规范主要章节覆盖消防给水与消火栓系统、自动喷水灭火系统、泡沫灭火系统、水喷雾与细水雾灭火系统、固定消防炮、气体灭火系统、干粉灭火系统、灭火器、防烟排烟系统和火灾自动报警系统。',
  },
  {
    id: 'm55037_notice',
    code: 'GB 55037-2022',
    clauseNumber: '公告第189号',
    content:
      '《建筑防火通用规范》GB 55037-2022 自2023年6月1日起实施，为强制性工程建设规范，全部条文必须严格执行；现行工程建设标准相关规定与本规范不一致时，以本规范为准。',
  },
  {
    id: 'm55037_outline',
    code: 'GB 55037-2022',
    clauseNumber: '主要章节',
    content:
      '本规范主要章节覆盖总平面布局、建筑平面布置与防火分隔、建筑结构耐火、建筑构造与装修、安全疏散与避难、消防设施、供暖通风与空调系统、电气设计、施工、使用和维护。',
  },
  {
    id: 'm55037_hvac',
    code: 'GB 55037-2022',
    clauseNumber: '第9章',
    content:
      '第9章专门规定供暖、通风与空调系统防火要求，按“一般规定、供暖系统、通风与空气调节系统”展开，是暖通专业进行防火复核时的重点章节。',
  }
);

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
