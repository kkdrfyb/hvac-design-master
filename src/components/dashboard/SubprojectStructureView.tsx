import React, { useEffect, useMemo, useState } from 'react';
import { STRUCTURE_STATUS_META, type StructureStatus } from '../../process';
import { DesignProcessRecord, DesignStage, StageConfirmation, SubmissionFile } from '../../types';
import {
  buildStructureTree,
  type StructureSubtypeNode,
} from './structureTree';

interface SubprojectStructureViewProps {
  actorName: string;
  currentStage: DesignStage;
  activeStage: DesignStage;
  processStages: DesignStage[];
  processRecords: DesignProcessRecord[];
  stageConfirmations?: Record<DesignStage, StageConfirmation>;
  onSelectStage: (stage: DesignStage) => void;
  onToggleStageConfirmation: (stage: DesignStage, nextConfirmation: StageConfirmation) => void;
  onDownloadFile: (file: SubmissionFile) => void;
}

const formatDate = (value?: string) => {
  if (!value) return '暂无';
  return new Date(value).toLocaleString();
};

const isConstructionStage = (stage: DesignStage) => stage.includes('施工');

const statusPriority: StructureStatus[] = [
  'risk',
  'in_progress',
  'done',
  'locked',
  'not_started',
];

const sortSubtypes = (subtypes: StructureSubtypeNode[]) =>
  [...subtypes].sort(
    (a, b) => statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status)
  );

const SubprojectStructureView: React.FC<SubprojectStructureViewProps> = ({
  actorName,
  currentStage,
  activeStage,
  processStages,
  processRecords,
  stageConfirmations,
  onSelectStage,
  onToggleStageConfirmation,
  onDownloadFile,
}) => {
  const [selectedKindKey, setSelectedKindKey] = useState<string>('');
  const [selectedSubtypeKey, setSelectedSubtypeKey] = useState<string>('');

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
    () =>
      stageTrees.find(stageTree => stageTree.stage === activeStage) || stageTrees[0],
    [activeStage, stageTrees]
  );

  const visibleKinds = useMemo(
    () => activeStageTree?.kinds || [],
    [activeStageTree]
  );

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

  if (!activeStageTree) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">暂无结构数据。</div>
      </div>
    );
  }

  const selectedKindMeta = selectedKind
    ? STRUCTURE_STATUS_META[selectedKind.status]
    : null;
  const selectedSubtypeMeta = selectedSubtype
    ? STRUCTURE_STATUS_META[selectedSubtype.status]
    : null;
  const selectedSubtypeFiles = selectedSubtype?.latestVersion?.files || [];
  const activeStageConfirmation = stageConfirmations?.[activeStageTree.stage];
  const isActiveStageConfirmed = !!activeStageConfirmation?.confirmed;
  const activeStageFileCount = visibleKinds.reduce(
    (count, kind) =>
      count +
      kind.subtypes.reduce(
        (subtypeCount, subtype) =>
          subtypeCount + (subtype.latestVersion?.files.length || 0),
        0
      ),
    0
  );
  const activeStageRecordCount = visibleKinds.reduce(
    (count, kind) =>
      count + kind.subtypes.filter(item => item.status !== 'not_started').length,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="sticky top-0 z-20 -mx-6 -mt-2 bg-white/95 px-6 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">结构视图</h3>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <div>阶段数：{stageTrees.length}</div>
            <div>业务记录：{processRecords.length}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {stageTrees.map(stageTree => {
              const meta = STRUCTURE_STATUS_META[stageTree.status];
              const selected = activeStage === stageTree.stage;
              return (
                <button
                  key={stageTree.stage}
                  type="button"
                  onClick={() => onSelectStage(stageTree.stage)}
                  className={`min-w-[156px] rounded-2xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">{stageTree.stage}</span>
                    {stageTree.stage === currentStage ? (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        当前阶段
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        selected ? 'bg-white/15 text-white' : meta.badgeClass
                      }`}
                    >
                      {meta.label}
                    </span>
                    <span>
                      {stageTree.completedSubtypeCount}/{stageTree.totalSubtypeCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-800">
                    {activeStageTree.stage}
                  </span>
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
                    {isActiveStageConfirmed ? '已确认完成' : '待手动确认'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span>
                    完成细项 {activeStageTree.completedSubtypeCount}/
                    {activeStageTree.totalSubtypeCount}
                  </span>
                  <span>已有记录 {activeStageRecordCount}</span>
                  <span>最终版文件 {activeStageFileCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onToggleStageConfirmation(activeStageTree.stage, {
                    confirmed: !isActiveStageConfirmed,
                    confirmedAt: !isActiveStageConfirmed
                      ? new Date().toISOString()
                      : undefined,
                    confirmedBy: !isActiveStageConfirmed ? actorName : undefined,
                  })
                }
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isActiveStageConfirmed
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isActiveStageConfirmed ? '取消确认' : '确认本阶段完成'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {isConstructionStage(activeStageTree.stage) ? '施工阶段二级页签' : '分类切换'}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {visibleKinds.map(kind => {
              const meta = STRUCTURE_STATUS_META[kind.status];
              const selected = selectedKind?.kind === kind.kind;
              const doneCount = kind.subtypes.filter(
                item => item.status === 'done' || item.status === 'locked'
              ).length;
              const fileCount = kind.subtypes.reduce(
                (count, subtype) => count + (subtype.latestVersion?.files.length || 0),
                0
              );
              return (
                <button
                  key={kind.kind}
                  type="button"
                  onClick={() => setSelectedKindKey(kind.kind)}
                  className={`min-w-[148px] rounded-xl border px-3 py-2 text-left transition-all ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{kind.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selected ? 'bg-white/15 text-white' : meta.badgeClass
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-[10px] ${
                      selected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {doneCount}/{kind.subtypes.length} 已完成
                  </div>
                  <div
                    className={`text-[10px] ${
                      selected ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {fileCount} 个最终版文件
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 items-start lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500">细项</div>
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
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{subtype.subtype}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selected ? 'bg-white/15 text-white' : meta.badgeClass
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className={`mt-1 text-[10px] ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {(subtype.latestVersion?.files.length || 0) > 0
                        ? `${subtype.latestVersion?.files.length || 0} 个最终版文件`
                        : '暂无最终版文件'}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              当前分类暂无细项内容。
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          {selectedKind && selectedKindMeta && selectedSubtype && selectedSubtypeMeta ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-800">
                        {selectedKind.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedKindMeta.badgeClass}`}
                      >
                        {selectedKindMeta.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      当前细项内容直接展示在下方，不需要再往下滚过一大片分类卡片。
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>细项数：{visibleSubtypes.length}</div>
                    <div>
                      最近更新：
                      {formatDate(
                        selectedKind.subtypes
                          .map(
                            subtype =>
                              subtype.latestVersion?.date ||
                              subtype.latestRecord?.createdAt ||
                              ''
                          )
                          .filter(Boolean)
                          .sort((a, b) => b.localeCompare(a))[0]
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800">
                        {selectedSubtype.subtype}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedSubtypeMeta.badgeClass}`}
                      >
                        {selectedSubtypeMeta.label}
                      </span>
                      {selectedSubtypeFiles.length > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          最终版
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      最近更新：
                      {formatDate(
                        selectedSubtype.latestVersion?.date ||
                          selectedSubtype.latestRecord?.createdAt
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>记录数：{selectedSubtype.records.length}</div>
                    <div>文件数：{selectedSubtypeFiles.length}</div>
                  </div>
                </div>

                {selectedSubtype.latestRecord?.changeSummary ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="text-[10px] font-bold text-amber-700">
                      变更摘要
                    </div>
                    <div className="mt-1 text-[11px] text-amber-800 whitespace-pre-wrap">
                      {selectedSubtype.latestRecord.changeSummary}
                    </div>
                  </div>
                ) : null}

                {selectedSubtype.latestRecord?.detail ? (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">说明</div>
                    <div className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap">
                      {selectedSubtype.latestRecord.detail}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-[10px] font-bold text-slate-500">
                    最终版文件
                  </div>
                  {selectedSubtypeFiles.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedSubtypeFiles.map(file => (
                        <button
                          key={file.id || file.name}
                          type="button"
                          onClick={() => onDownloadFile(file)}
                          className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-slate-300"
                        >
                          <span className="text-xs font-medium text-slate-700">
                            {file.name}
                          </span>
                          <div className="text-[10px] text-slate-400 text-right">
                            <div>{file.uploadedBy || '未知上传人'}</div>
                            <div>{formatDate(file.uploadedAt)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400">
                      暂无最终版文件。
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              当前阶段暂无分类内容。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubprojectStructureView;
