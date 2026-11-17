import React, { useEffect, useMemo, useState } from 'react';

export type TreeTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

export interface TreeNodeAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface TreeNode {
  id: string;
  label: string;
  caption?: string;
  badge?: string;
  tone?: TreeTone;
  icon?: string;
  detail?: string;
  meta?: string[];
  children?: TreeNode[];
  actions?: TreeNodeAction[];
  onSelect?: () => void;
}

export type DisplayMode = 'tree' | 'list';

const TONE_DOT: Record<TreeTone, string> = {
  slate: 'bg-slate-300',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};

const TONE_BADGE: Record<TreeTone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  violet: 'bg-violet-100 text-violet-700',
};

const TONE_SELECTED: Record<TreeTone, string> = {
  slate: 'border-slate-400 bg-slate-50',
  blue: 'border-blue-400 bg-blue-50',
  emerald: 'border-emerald-400 bg-emerald-50',
  amber: 'border-amber-400 bg-amber-50',
  rose: 'border-rose-400 bg-rose-50',
  violet: 'border-violet-400 bg-violet-50',
};

function collectParentIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: TreeNode[]) => {
    list.forEach(node => {
      if (node.children?.length) {
        ids.push(node.id);
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return ids;
}

function findNodePath(nodes: TreeNode[], id: string, trail: TreeNode[] = []): TreeNode[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.id === id) return nextTrail;
    if (node.children?.length) {
      const found = findNodePath(node.children, id, nextTrail);
      if (found) return found;
    }
  }
  return null;
}

export const DisplayModeToggle: React.FC<{
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  treeLabel?: string;
  listLabel?: string;
}> = ({ mode, onChange, treeLabel = '树图模式', listLabel = '列表模式' }) => (
  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5" role="group" aria-label="展示模式切换">
    <button
      type="button"
      onClick={() => onChange('tree')}
      aria-pressed={mode === 'tree'}
      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
        mode === 'tree' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      🌳 {treeLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange('list')}
      aria-pressed={mode === 'list'}
      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
        mode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      ☰ {listLabel}
    </button>
  </div>
);

const TreeDiagram: React.FC<{
  nodes: TreeNode[];
  emptyText?: string;
  defaultExpandDepth?: number;
  hint?: string;
}> = ({ nodes, emptyText = '暂无可展示的树状数据。', defaultExpandDepth = 1, hint }) => {
  const parentIds = useMemo(() => collectParentIds(nodes), [nodes]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const defaults: Record<string, boolean> = {};
    const walk = (list: TreeNode[], depth: number) => {
      list.forEach(node => {
        if (node.children?.length) {
          defaults[node.id] = depth < defaultExpandDepth;
          walk(node.children, depth + 1);
        }
      });
    };
    walk(nodes, 0);
    setExpanded(prev => {
      const merged = { ...defaults };
      parentIds.forEach(id => {
        if (typeof prev[id] === 'boolean') merged[id] = prev[id];
      });
      return merged;
    });
  }, [nodes, parentIds, defaultExpandDepth]);

  useEffect(() => {
    if (!nodes.length) {
      setSelectedId('');
      return;
    }
    if (!findNodePath(nodes, selectedId)) {
      setSelectedId(nodes[0].id);
    }
  }, [nodes, selectedId]);

  const selectedPath = useMemo(
    () => (selectedId ? findNodePath(nodes, selectedId) : null),
    [nodes, selectedId]
  );
  const selected = selectedPath?.[selectedPath.length - 1];

  const handleNodeClick = (node: TreeNode) => {
    setSelectedId(node.id);
    if (node.children?.length) {
      setExpanded(prev => ({ ...prev, [node.id]: !prev[node.id] }));
    }
    node.onSelect?.();
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const tone = node.tone || 'slate';
    const hasChildren = !!node.children?.length;
    const isExpanded = expanded[node.id] ?? depth < defaultExpandDepth;
    const isSelected = selectedId === node.id;

    return (
      <li key={node.id} className="relative pl-5">
        {depth > 0 ? (
          <span className="absolute left-0 top-6 h-px w-4 bg-slate-200" aria-hidden="true" />
        ) : null}
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 transition-all ${
            isSelected
              ? `${TONE_SELECTED[tone]} shadow-sm`
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={() => handleNodeClick(node)}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            {node.icon ? (
              <span className="mt-0.5 text-xs text-slate-400">{node.icon}</span>
            ) : (
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black leading-5 text-slate-800">{node.label}</span>
                {node.badge ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE_BADGE[tone]}`}>
                    {node.badge}
                  </span>
                ) : null}
              </span>
              {node.caption ? (
                <span className="mt-0.5 block truncate text-[10px] text-slate-400">{node.caption}</span>
              ) : null}
            </span>
          </button>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(prev => ({ ...prev, [node.id]: !isExpanded }))}
              className="mt-0.5 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              aria-label={isExpanded ? `收起 ${node.label}` : `展开 ${node.label}`}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : null}
        </div>
        {hasChildren && isExpanded ? (
          <ul className="ml-3 mt-2 space-y-2 border-l border-slate-200 pl-4">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  if (!nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-xs text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          {hint || '点击节点展开 / 收起，右侧查看节点详情'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(Object.fromEntries(parentIds.map(id => [id, true])))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            全部展开
          </button>
          <button
            type="button"
            onClick={() => setExpanded(Object.fromEntries(parentIds.map(id => [id, false])))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            全部收起
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <ul className="space-y-2">{nodes.map(node => renderNode(node, 0))}</ul>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {selected ? (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  节点详情
                </div>
                <div className="mt-1.5 text-sm font-black leading-5 text-slate-800">{selected.label}</div>
                {selectedPath && selectedPath.length > 1 ? (
                  <div className="mt-1 text-[10px] leading-4 text-slate-400">
                    {selectedPath.map(item => item.label).join(' / ')}
                  </div>
                ) : null}
              </div>
              {selected.caption ? (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  {selected.caption}
                </div>
              ) : null}
              {selected.meta?.length ? (
                <div className="space-y-1">
                  {selected.meta.map((item, index) => (
                    <div key={`${selected.id}-meta-${index}`} className="text-[11px] text-slate-500">
                      {item}
                    </div>
                  ))}
                </div>
              ) : null}
              {selected.detail ? (
                <div>
                  <div className="text-[10px] font-bold text-slate-500">说明</div>
                  <div className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
                    {selected.detail}
                  </div>
                </div>
              ) : null}
              {selected.children?.length ? (
                <div className="text-[10px] text-slate-400">包含 {selected.children.length} 个子节点</div>
              ) : null}
              {selected.actions?.length ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.actions.map((action, index) => (
                    <button
                      key={`${selected.id}-action-${index}`}
                      type="button"
                      onClick={action.onClick}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                        action.primary
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">请选择一个节点查看详情。</div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TreeDiagram;
