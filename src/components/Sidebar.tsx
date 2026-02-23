import React from 'react';
import { MainProject, ThemeColor } from '../types';

interface SidebarProps {
  projects: MainProject[];
  currentMainId: string;
  currentSubId: string;
  onSelectProject: (mainId: string, subId: string) => void;
  onCreateProject: () => void;
  theme: ThemeColor;
}

const Sidebar: React.FC<SidebarProps> = ({
  projects,
  currentMainId,
  currentSubId,
  onSelectProject,
  onCreateProject,
  theme
}) => {
  return (
    <div className="flex flex-col gap-4">
      {projects.map(project => (
        <div key={project.id} className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center group">
            <span>{project.name}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 font-normal">#{project.code}</span>
          </div>
          <div className="space-y-0.5">
            {project.subProjects?.map(sub => (
              <button
                key={sub.id}
                onClick={() => onSelectProject(project.id, sub.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${currentMainId === project.id && currentSubId === sub.id
                  ? `bg-${theme}-600 text-white shadow-lg shadow-${theme}-200 scale-[1.02] z-10 relative`
                  : 'text-slate-600 hover:bg-slate-100 hover:translate-x-1'
                  }`}
                title={`${sub.name} (${sub.code})`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentMainId === project.id && currentSubId === sub.id ? 'bg-white' : `bg-${theme}-400`
                  }`}></span>
                <span className="truncate">{sub.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onCreateProject}
        className={`mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-${theme}-400 hover:text-${theme}-600 transition-all flex items-center justify-center gap-2 hover:bg-${theme}-50`}
      >
        <span className="text-sm">+</span>
        新建设计项目
      </button>
    </div>
  );
};

export default Sidebar;