import React from 'react';
import { DESIGN_STAGES, PROJECT_TYPES, TEMPLATE_CATEGORIES } from '../constants';
import { DesignStage, NewProjectDraft, ProjectType, ThemeColor } from '../types';

interface NewProjectModalProps {
  theme: ThemeColor;
  data: NewProjectDraft;
  onChange: (next: NewProjectDraft) => void;
  onTemplateSelectionChange: (nextType: ProjectType, nextStage: DesignStage) => void;
  onToggleCategory: (categoryId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  theme,
  data,
  onChange,
  onTemplateSelectionChange,
  onToggleCategory,
  onCancel,
  onConfirm,
}) => {
  return (
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
              <input
                type="text"
                className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200"
                placeholder="e.g. 某商业综合体"
                value={data.mainName}
                onChange={e => onChange({ ...data, mainName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">项目编号</label>
              <input
                type="text"
                className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200"
                placeholder="2024-HV-01"
                value={data.mainCode}
                onChange={e => onChange({ ...data, mainCode: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-6 border-t border-slate-50 space-y-6">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">步骤 2：子项基本信息</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">首个子项/单体</label>
                <input
                  type="text"
                  className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200"
                  placeholder="A1地库/办公楼"
                  value={data.subName}
                  onChange={e => onChange({ ...data, subName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">子项编号</label>
                <input
                  type="text"
                  className="w-full border border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 outline-none bg-slate-50 font-bold text-sm text-slate-700 transition-all border-transparent focus:border-blue-200"
                  placeholder="Sub-01"
                  value={data.subCode}
                  onChange={e => onChange({ ...data, subCode: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">步骤 3：子项类型</label>
                <select
                  className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none bg-slate-50 font-bold text-sm text-slate-700 appearance-none"
                  value={data.type}
                  onChange={e => onTemplateSelectionChange(e.target.value as ProjectType, data.stage)}
                >
                  {PROJECT_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">当前设计阶段</label>
                <select
                  className="w-full border border-slate-100 rounded-2xl px-5 py-4 outline-none bg-slate-50 font-bold text-sm text-slate-700 appearance-none"
                  value={data.stage}
                  onChange={e => onTemplateSelectionChange(data.type, e.target.value as DesignStage)}
                >
                  {DESIGN_STAGES.map(stage => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">步骤 4：启用文件分类</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_CATEGORIES[data.type][data.stage].map(category => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={data.enabledCategoryIds.includes(category.id)}
                      onChange={() => onToggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-4 text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-xs"
          >
            放弃
          </button>
          <button
            onClick={onConfirm}
            className={`px-10 py-4 bg-${theme}-600 text-white font-black rounded-3xl shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 hover:-translate-y-1 transition active:translate-y-0 text-sm`}
          >
            开启设计
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
