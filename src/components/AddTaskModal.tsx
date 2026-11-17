import React from 'react';
import { ThemeColor } from '../types';

interface AddTaskModalProps {
  theme: ThemeColor;
  category?: string;
  content: string;
  onContentChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  theme,
  category,
  content,
  onContentChange,
  onCancel,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 animate-bounce-in border border-white/20">
        <div className="flex items-center gap-2 mb-6">
          <span
            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-${theme}-100 text-${theme}-700 shadow-sm shadow-${theme}-50`}
          >
            {category}
          </span>
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">添加管控任务</h3>
        <textarea
          autoFocus
          className="w-full border border-slate-50 rounded-[2rem] p-6 text-sm font-bold text-slate-600 focus:ring-8 focus:ring-blue-50 focus:border-blue-200 outline-none resize-none h-48 mb-10 bg-slate-50 transition-all placeholder:text-slate-300"
          placeholder="请描述具体的设计要点或提资要求..."
          value={content}
          onChange={e => onContentChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              onConfirm();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">CTRL + ENTER 快速入库</span>
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="text-slate-400 font-black hover:text-slate-600 transition tracking-widest uppercase text-[10px]"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className={`bg-${theme}-600 text-white px-8 py-4 rounded-3xl font-black shadow-2xl shadow-${theme}-200 hover:bg-${theme}-700 transition active:scale-95`}
            >
              确认添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
