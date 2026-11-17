import React from 'react';
import { DesignStage, FocusItem, ThemeColor } from '../../types';

interface FocusItemsPanelProps {
  activeStage: DesignStage;
  activeKind: string;
  activeKindLabel: string;
  focusItems: FocusItem[];
  theme: ThemeColor;
  readOnly?: boolean;
  onCreateFocusItem: (stage: DesignStage, kind: string) => FocusItem | null;
  onUpdateFocusItem: (
    focusItemId: string,
    patch: Partial<Pick<FocusItem, 'content' | 'completed'>>
  ) => void;
  onDeleteFocusItem: (focusItemId: string) => void;
}

const STRINGS = {
  title: '执行重点',
  add: '新增重点',
  empty: '当前分类还没有执行重点。',
  emptyReadonly: '当前分类暂无执行重点。',
  textareaPlaceholder: '输入当前阶段、当前分类下需要跟进的执行重点备注',
  completed: '完成',
  delete: '删除',
};

const FocusItemsPanel: React.FC<FocusItemsPanelProps> = ({
  activeStage,
  activeKind,
  activeKindLabel,
  focusItems,
  theme,
  readOnly = false,
  onCreateFocusItem,
  onUpdateFocusItem,
  onDeleteFocusItem,
}) => {
  const visibleItems = React.useMemo(
    () =>
      [...focusItems]
        .filter(item => item.stage === activeStage && item.kind === activeKind)
        .sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        }),
    [activeKind, activeStage, focusItems]
  );

  const handleCreate = () => {
    if (!activeKind) return;
    onCreateFocusItem(activeStage, activeKind);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {STRINGS.title}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-700">{activeKindLabel}</div>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={handleCreate}
            className={`rounded-lg bg-${theme}-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-${theme}-700`}
          >
            {STRINGS.add}
          </button>
        ) : null}
      </div>

      {visibleItems.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visibleItems.map(item => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={readOnly}
                    onChange={event =>
                      onUpdateFocusItem(item.id, { completed: event.target.checked })
                    }
                    className={`h-4 w-4 rounded border-slate-300 text-${theme}-600`}
                  />
                  {STRINGS.completed}
                </label>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => onDeleteFocusItem(item.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                  >
                    {STRINGS.delete}
                  </button>
                ) : null}
              </div>

              <textarea
                value={item.content}
                readOnly={readOnly}
                onChange={event => onUpdateFocusItem(item.id, { content: event.target.value })}
                placeholder={STRINGS.textareaPlaceholder}
                className="mt-3 min-h-[92px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
          {readOnly ? STRINGS.emptyReadonly : STRINGS.empty}
        </div>
      )}
    </div>
  );
};

export default FocusItemsPanel;
