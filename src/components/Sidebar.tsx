import React from 'react';
import { MainProject, ThemeColor } from '../types';

interface SidebarProps {
  projects: MainProject[];
  currentMainId: string;
  currentSubId: string;
  onSelectProject: (mainId: string, subId: string) => void;
  onCreateProject: () => void;
  canCreateProject: boolean;
  theme: ThemeColor;
}

const Sidebar: React.FC<SidebarProps> = ({
  projects,
  currentMainId,
  currentSubId,
  onSelectProject,
  onCreateProject,
  canCreateProject,
  theme,
}) => {
  const [keyword, setKeyword] = React.useState('');
  const [expandedProjectIds, setExpandedProjectIds] = React.useState<string[]>([]);
  const normalized = keyword.trim().toLowerCase();

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const filteredProjects = [...projects]
    .map(project => {
      const projectHit =
        !normalized ||
        (project.name || '').toLowerCase().includes(normalized) ||
        (project.code || '').toLowerCase().includes(normalized);

      const subProjects = (project.subProjects || [])
        .filter(subProject => {
          if (!normalized) return true;
          const subHit =
            (subProject.name || '').toLowerCase().includes(normalized) ||
            (subProject.code || '').toLowerCase().includes(normalized);
          return projectHit || subHit;
        })
        .sort((a, b) => {
          if (!!a.canEdit === !!b.canEdit) {
            return (a.name || '').localeCompare(b.name || '');
          }
          return a.canEdit ? -1 : 1;
        });

      return {
        ...project,
        canEdit: !!project.canEdit || subProjects.some(subProject => !!subProject.canEdit),
        subProjects,
        projectHit,
      };
    })
    .filter(project => project.projectHit || project.subProjects.length > 0 || !normalized)
    .sort((a, b) => {
      if (!!a.canEdit === !!b.canEdit) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return a.canEdit ? -1 : 1;
    });

  return (
    <div className="flex h-full flex-col gap-3">
      <input
        type="text"
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
        placeholder="搜索项目或子项"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
      />

      <div className="space-y-2.5">
        {filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
            暂无项目
          </div>
        ) : (
          filteredProjects.map(project => {
            const isExpanded = !!normalized || expandedProjectIds.includes(project.id);
            const hasActiveSubProject = currentMainId === project.id;

            return (
              <div key={project.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleProjectExpanded(project.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                    hasActiveSubProject
                      ? 'border-slate-300 bg-slate-50 shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-700">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-300">
                        #{project.code || '未编号'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!project.canEdit ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] text-slate-500">
                          全只读
                        </span>
                      ) : null}
                      <span
                        className={`text-xs text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        ▶
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="space-y-1 pl-2.5">
                    {(project.subProjects || []).map(subProject => {
                      const selected = currentMainId === project.id && currentSubId === subProject.id;
                      const readonly = !subProject.canEdit;

                      return (
                        <button
                          key={subProject.id}
                          type="button"
                          onClick={() => onSelectProject(project.id, subProject.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${
                            selected
                              ? readonly
                                ? 'bg-slate-700 text-white shadow-lg'
                                : `bg-${theme}-600 text-white shadow-lg shadow-${theme}-200`
                              : readonly
                              ? 'text-slate-500 hover:bg-slate-100'
                              : 'text-slate-600 hover:bg-slate-100 hover:translate-x-1'
                          }`}
                          title={`${subProject.name} (${subProject.code})${readonly ? ' - 只读' : ''}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              selected ? 'bg-white' : readonly ? 'bg-slate-400' : `bg-${theme}-400`
                            }`}
                          />
                          <span className="truncate flex-1">{subProject.name}</span>
                          {readonly ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] ${
                                selected ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              只读
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {canCreateProject ? (
        <button
          type="button"
          onClick={onCreateProject}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-${theme}-400 hover:bg-${theme}-50 hover:text-${theme}-600`}
        >
          <span className="text-sm">+</span>
          新建设计项目
        </button>
      ) : null}
    </div>
  );
};

export default Sidebar;
