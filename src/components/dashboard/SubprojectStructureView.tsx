import React, { useEffect, useMemo, useState } from 'react';
import { STRUCTURE_STATUS_META, type StructureStatus } from '../../process';
import {
  DesignProcessRecord,
  DesignStage,
  FocusItem,
  MainProject,
  StageConfirmation,
  SubmissionFile,
  SubProject,
  ThemeColor,
} from '../../types';
import FocusItemsPanel from './FocusItemsPanel';
import { buildStructureTree, type StructureSubtypeNode } from './structureTree';
import TreeDiagram, { DisplayModeToggle, type DisplayMode } from '../common/TreeDiagram';
import { buildOverviewTreeNodes } from './overviewTree';

interface SubprojectStructureViewProps {
  actorName: string;
  currentMain?: MainProject;
  currentSub?: SubProject;
  currentStage: DesignStage;
  activeStage: DesignStage;
  processStages: DesignStage[];
  processRecords: DesignProcessRecord[];
  stageConfirmations?: Record<DesignStage, StageConfirmation>;
  focusItems: FocusItem[];
  theme: ThemeColor;
  readOnly?: boolean;
  onSelectStage: (stage: DesignStage) => void;
  onToggleStageConfirmation: (stage: DesignStage, nextConfirmation: StageConfirmation) => void;
  onDownloadFile: (file: SubmissionFile) => void;
  onCreateFocusItem: (stage: DesignStage, kind: string) => FocusItem | null;
  onUpdateFocusItem: (
    focusItemId: string,
    patch: Partial<Pick<FocusItem, 'content' | 'completed'>>
  ) => void;
  onDeleteFocusItem: (focusItemId: string) => void;
}

const STRINGS = {
  empty: '暂无结构数据。',
  categoryTabs: '分类切换',
  constructionTabs: '施工阶段二级页签',
  subtypeLabel: '细项',
  noSubtype: '当前分类暂无细项内容。',
  latestUpdate: '最近更新',
  subtypeCount: '细项数',
  recordCount: '记录数',
  fileCount: '文件数',
  description: '说明',
  summary: '变更摘要',
  confirm: '确认本阶段完成',
  cancelConfirm: '取消确认',
  confirmed: '已确认完成',
  pendingConfirm: '待手动确认',
  currentStage: '当前阶段',
  completedSubtypes: '完成细项',
  existingRecords: '已有记录',
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const isConstructionStage = (stage: DesignStage) => stage.includes('施工');

const statusPriority: StructureStatus[] = ['risk', 'in_progress', 'done', 'locked', 'not_started'];

const sortSubtypes = (subtypes: StructureSubtypeNode[]) =>
  [...subtypes].sort(
    (a, b) => statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status)
  );

const SubprojectStructureView: React.FC<SubprojectStructureViewProps> = ({
  actorName,
  currentMain,
  currentSub,
  currentStage,
  activeStage,
  processStages,
  processRecords,
  stageConfirmations,
  focusItems,
  theme,
  readOnly = false,
  onSelectStage,
  onToggleStageConfirmation,
  onDownloadFile,
  onCreateFocusItem,
  onUpdateFocusItem,
  onDeleteFocusItem,
}) => {
  const [selectedKindKey, setSelectedKindKey] = useState('');
  const [selectedSubtypeKey, setSelectedSubtypeKey] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('tree');

  const stageTrees = useMemo(
    () => buildStructureTree(currentStage, processStages, processRecords),
    [currentStage, processRecords, processStages]
  );

  useEffect(() => {
    if (!stageTrees.some(stageTree => stageTree.stage === activeStage) && stageTrees[0]) {
      onSelectStage(stageTrees[0].stage);
    }
  }, [activeStage, onSelectStage, stageTrees]);

  const activeStageTree = useMemo(
    () => stageTrees.find(stageTree => stageTree.stage === activeStage) || stageTrees[0],
    [activeStage, stageTrees]
  );

  const visibleKinds = useMemo(() => activeStageTree?.kinds || [], [activeStageTree]);

  useEffect(() => {
    if (!visibleKinds.length) {
      setSelectedKindKey('');
      return;
    }
    setSelectedKindKey(prev =>
      visibleKinds.some(kind => kind.kind === prev) ? prev : visibleKinds[0].kind
    );
  }, [visibleKinds]);

  const selectedKind = useMemo(
    () => visibleKinds.find(kind => kind.kind === selectedKindKey) || visibleKinds[0],
    [selectedKindKey, visibleKinds]
  );

  const visibleSubtypes = useMemo(
    () => (selectedKind ? sortSubtypes(selectedKind.subtypes) : []),
    [selectedKind]
  );

  useEffect(() => {
    if (!visibleSubtypes.length) {
      setSelectedSubtypeKey('');
      return;
    }
    setSelectedSubtypeKey(prev =>
      visibleSubtypes.some(subtype => subtype.subtype === prev)
        ? prev
        : visibleSubtypes.find(subtype => subtype.status !== 'not_started')?.subtype ||
          visibleSubtypes[0].subtype
    );
  }, [visibleSubtypes]);

  const selectedSubtype = useMemo(
    () =>
      visibleSubtypes.find(subtype => subtype.subtype === selectedSubtypeKey) ||
      visibleSubtypes[0],
    [selectedSubtypeKey, visibleSubtypes]
  );

  const treeNodes = useMemo(
    () =>
      buildOverviewTreeNodes({
        currentMain,
        currentSub,
        activeStage,
        stageTrees,
        stageConfirmations,
        focusItems,
        onSelectStage,
        onDownloadFile,
      }),
    [
      currentMain,
      currentSub,
      activeStage,
      stageTrees,
      stageConfirmations,
      focusItems,
      onSelectStage,
      onDownloadFile,
    ]
  );

  if (!activeStageTree) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">{STRINGS.empty}</div>
      </div>
    );
  }

  const selectedKindMeta = selectedKind ? STRUCTURE_STATUS_META[selectedKind.status] : null;
  const selectedSubtypeMeta = selectedSubtype
    ? STRUCTURE_STATUS_META[selectedSubtype.status]
    : null;
  const selectedSubtypeFiles = selectedSubtype?.latestVersion?.files || [];
  const activeStageConfirmation = stageConfirmations?.[activeStageTree.stage];
  const isActiveStageConfirmed = !!activeStageConfirmation?.confirmed;
  const activeStageRecordCount = visibleKinds.reduce(
    (count, kind) => count + kind.subtypes.filter(item => item.status !== 'not_started').length,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-800">{activeStageTree.stage}</span>
            {activeStageTree.stage === currentStage ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {STRINGS.currentStage}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                STRUCTURE_STATUS_META[activeStageTree.status].badgeClass
              }`}
            >
              {STRUCTURE_STATUS_META[activeStageTree.status].label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isActiveStageConfirmed
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isActiveStageConfirmed ? STRINGS.confirmed : STRINGS.pendingConfirm}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
            <span>
              {STRINGS.completedSubtypes} {activeStageTree.completedSubtypeCount}/
              {activeStageTree.totalSubtypeCount}
            </span>
            <span>
              {STRINGS.existingRecords} {activeStageRecordCount}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DisplayModeToggle mode={displayMode} onChange={setDisplayMode} />
          <button
            type="button"
            onClick={() =>
              onToggleStageConfirmation(activeStageTree.stage, {
                confirmed: !isActiveStageConfirmed,
                confirmedAt: !isActiveStageConfirmed ? new Date().toISOString() : undefined,
                confirmedBy: !isActiveStageConfirmed ? actorName : undefined,
              })
            }
            disabled={readOnly}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              readOnly
                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                : isActiveStageConfirmed
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isActiveStageConfirmed ? STRINGS.cancelConfirm : STRINGS.confirm}
          </button>
        </div>
      </div>

      {displayMode === 'tree' ? (
        <div className="mt-4">
          <TreeDiagram
            nodes={treeNodes}
            defaultExpandDepth={1}
            hint="项目 → 阶段 → 分类 → 细项 → 记录 / 文件，点击节点查看详情"
          />
        </div>
      ) : (
        <div className="mt-4 grid items-start gap-3 xl:grid-cols-[220px_210px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {isConstructionStage(activeStageTree.stage)
              ? STRINGS.constructionTabs
              : STRINGS.categoryTabs}
          </div>
          <div className="space-y-2">
            {visibleKinds.map(kind => {
              const meta = STRUCTURE_STATUS_META[kind.status];
              const selected = selectedKind?.kind === kind.kind;
              const doneCount = kind.subtypes.filter(
                item => item.status === 'done' || item.status === 'locked'
              ).length;

              return (
                <button
                  key={kind.kind}
                  type="button"
                  onClick={() => setSelectedKindKey(kind.kind)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold">{kind.label}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selected ? 'bg-white/15 text-white' : meta.badgeClass
                        }`}
                      >
                        {meta.label}
                      </span>
                      <span className={selected ? 'text-[10px] text-slate-300' : 'text-[10px] text-slate-400'}>
                        {doneCount}/{kind.subtypes.length}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {STRINGS.subtypeLabel}
          </div>
          {visibleSubtypes.length > 0 ? (
            <div className="space-y-2">
              {visibleSubtypes.map(subtype => {
                const meta = STRUCTURE_STATUS_META[subtype.status];
                const selected = selectedSubtype?.subtype === subtype.subtype;
                return (
                  <button
                    key={subtype.subtype}
                    type="button"
                    onClick={() => setSelectedSubtypeKey(subtype.subtype)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold">{subtype.subtype}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selected ? 'bg-white/15 text-white' : meta.badgeClass
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              {STRINGS.noSubtype}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          {selectedKind && selectedKindMeta && selectedSubtype && selectedSubtypeMeta ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-800">
                        {selectedSubtype.subtype}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedSubtypeMeta.badgeClass}`}
                      >
                        {selectedSubtypeMeta.label}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {STRINGS.latestUpdate}: {formatDate(
                        selectedSubtype.latestVersion?.date ||
                          selectedSubtype.latestRecord?.createdAt
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>
                      {STRINGS.subtypeCount}: {visibleSubtypes.length}
                    </div>
                    <div>
                      {STRINGS.recordCount}: {selectedSubtype.records.length}
                    </div>
                    <div>
                      {STRINGS.fileCount}: {selectedSubtypeFiles.length}
                    </div>
                  </div>
                </div>

                {selectedSubtype.latestRecord?.changeSummary ? (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                    <div className="text-[10px] font-bold text-amber-700">{STRINGS.summary}</div>
                    <div className="mt-1 whitespace-pre-wrap text-[11px] text-amber-800">
                      {selectedSubtype.latestRecord.changeSummary}
                    </div>
                  </div>
                ) : null}

                {selectedSubtype.latestRecord?.detail ? (
                  <div className="mt-3">
                    <div className="text-[10px] font-bold text-slate-500">
                      {STRINGS.description}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-[11px] text-slate-600">
                      {selectedSubtype.latestRecord.detail}
                    </div>
                  </div>
                ) : null}

                {selectedSubtypeFiles.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {selectedSubtypeFiles.map(file => (
                      <button
                        key={file.id || file.name}
                        type="button"
                        onClick={() => onDownloadFile(file)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-300"
                      >
                        <span className="text-xs font-medium text-slate-700">{file.name}</span>
                        <div className="text-right text-[10px] text-slate-400">
                          <div>{file.uploadedBy || '--'}</div>
                          <div>{formatDate(file.uploadedAt)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <FocusItemsPanel
                activeStage={activeStage}
                activeKind={selectedKind.kind}
                activeKindLabel={selectedKind.label}
                focusItems={focusItems}
                theme={theme}
                readOnly={readOnly}
                onCreateFocusItem={onCreateFocusItem}
                onUpdateFocusItem={onUpdateFocusItem}
                onDeleteFocusItem={onDeleteFocusItem}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              {STRINGS.empty}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default SubprojectStructureView;
