import { STRUCTURE_STATUS_META, type StructureStatus } from '../../process';
import {
  DesignStage,
  FocusItem,
  MainProject,
  StageConfirmation,
  SubProject,
} from '../../types';
import type { StructureStageNode } from './structureTree';
import type { TreeTone, TreeNode } from '../common/TreeDiagram';

const key = (...parts: Array<string | number>) => parts.map(part => encodeURIComponent(String(part))).join('__');

const STATUS_TONE: Record<StructureStatus, TreeTone> = {
  done: 'emerald',
  in_progress: 'amber',
  not_started: 'slate',
  risk: 'rose',
  locked: 'blue',
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export interface BuildOverviewTreeOptions {
  currentMain?: MainProject;
  currentSub?: SubProject;
  activeStage: DesignStage;
  stageTrees: StructureStageNode[];
  stageConfirmations?: Record<DesignStage, StageConfirmation>;
  focusItems: FocusItem[];
  onSelectStage: (stage: DesignStage) => void;
  onDownloadFile: (file: import('../../types').SubmissionFile) => void;
}

export const buildOverviewTreeNodes = ({
  currentMain,
  currentSub,
  activeStage,
  stageTrees,
  stageConfirmations,
  focusItems,
  onSelectStage,
  onDownloadFile,
}: BuildOverviewTreeOptions): TreeNode[] => {
  const stageNodes: TreeNode[] = stageTrees.map(stageTree => {
    const confirmation = stageConfirmations?.[stageTree.stage];
    const stageMeta = STRUCTURE_STATUS_META[stageTree.status];
    const stageFocusItems = focusItems.filter(item => item.stage === stageTree.stage);
    const stageRecordCount = stageTree.kinds.reduce(
      (total, kind) =>
        total + kind.subtypes.reduce((sum, subtype) => sum + subtype.records.length, 0),
      0
    );
    const stageFileCount = stageTree.kinds.reduce(
      (total, kind) =>
        total +
        kind.subtypes.reduce(
          (sum, subtype) =>
            sum + (subtype.latestVersion?.files.length || 0),
          0
        ),
      0
    );

    const kindNodes: TreeNode[] = stageTree.kinds.map(kind => {
      const kindMeta = STRUCTURE_STATUS_META[kind.status];
      const kindFocusItems = stageFocusItems.filter(
        item => item.kind === kind.kind || item.kind === kind.label
      );

      const subtypeNodes: TreeNode[] = kind.subtypes.map(subtype => {
        const subtypeMeta = STRUCTURE_STATUS_META[subtype.status];
        const recordNodes: TreeNode[] = subtype.records.map((record, index) => ({
          id: key('overview', stageTree.stage, kind.kind, subtype.subtype, 'record', record.id || index),
          label: record.title || subtype.subtype,
          caption: [record.createdBy, record.createdAt].filter(Boolean).join(' · '),
          tone: 'blue',
          detail: [record.detail, record.changeSummary ? `变更摘要：${record.changeSummary}` : '']
            .filter(Boolean)
            .join('\n\n'),
          meta: [`记录时间：${formatDate(record.createdAt)}`, `版本数：${record.versions?.length || 0}`],
        }));

        const archivedFiles = subtype.records.flatMap(record =>
          (record.versions || []).flatMap(version =>
            version.files.map(file => ({ file, version: version.version }))
          )
        );
        const fileGroupNode: TreeNode | null = archivedFiles.length
          ? {
              id: key('overview', stageTree.stage, kind.kind, subtype.subtype, 'files'),
              label: '归档文件',
              caption: `${archivedFiles.length} 个文件`,
              tone: 'violet',
              children: archivedFiles.map(({ file, version }, fileIndex) => ({
                id: key(
                  'overview',
                  stageTree.stage,
                  kind.kind,
                  subtype.subtype,
                  'file',
                  file.id || file.name || fileIndex
                ),
                label: file.name,
                caption: [version ? `Ver ${version}` : '', file.uploadedBy, formatDate(file.uploadedAt)]
                  .filter(Boolean)
                  .join(' · '),
                tone: 'slate',
                icon: '📎',
                actions: [
                  {
                    label: '下载文件',
                    primary: true,
                    onClick: () => onDownloadFile(file),
                  },
                ],
              })),
            }
          : null;

        return {
          id: key('overview', stageTree.stage, kind.kind, subtype.subtype),
          label: subtype.subtype,
          caption: `${subtype.records.length} 条记录 · ${subtype.latestVersion?.files.length || 0} 个最新文件`,
          badge: subtypeMeta.label,
          tone: STATUS_TONE[subtype.status],
          detail: subtype.latestRecord?.detail,
          meta: [
            `状态：${subtypeMeta.label}`,
            `最近更新：${formatDate(subtype.latestVersion?.date || subtype.latestRecord?.createdAt)}`,
            `记录数：${subtype.records.length}`,
          ],
          children: [...recordNodes, ...(fileGroupNode ? [fileGroupNode] : [])],
        };
      });

      const focusNode: TreeNode | null = kindFocusItems.length
        ? {
            id: key('overview', stageTree.stage, kind.kind, 'focus'),
            label: '关注事项',
            caption: `${kindFocusItems.length} 项`,
            tone: 'amber',
            children: kindFocusItems.map((item, index) => ({
              id: key('overview', stageTree.stage, kind.kind, 'focus', item.id || index),
              label: item.content,
              badge: item.completed ? '已完成' : '待跟进',
              tone: item.completed ? 'emerald' : 'amber',
              detail: `创建于 ${formatDate(item.createdAt)}，更新于 ${formatDate(item.updatedAt)}`,
            })),
          }
        : null;

      return {
        id: key('overview', stageTree.stage, kind.kind),
        label: kind.label,
        caption: `${kind.subtypes.length} 个细项`,
        badge: kindMeta.label,
        tone: STATUS_TONE[kind.status],
        children: [...subtypeNodes, ...(focusNode ? [focusNode] : [])],
      };
    });

    const stageFocusNode: TreeNode | null = stageFocusItems.length
      ? {
          id: key('overview', stageTree.stage, 'focus'),
          label: '本阶段关注事项',
          caption: `${stageFocusItems.length} 项`,
          tone: 'amber',
          children: stageFocusItems.map((item, index) => ({
            id: key('overview', stageTree.stage, 'stage-focus', item.id || index),
            label: item.content,
            badge: item.completed ? '已完成' : '待跟进',
            tone: item.completed ? 'emerald' : 'amber',
          })),
        }
      : null;

    return {
      id: key('overview', stageTree.stage),
      label: stageTree.stage,
      caption: `${stageTree.completedSubtypeCount}/${stageTree.totalSubtypeCount} 完成细项 · ${stageRecordCount} 条记录 · ${stageFileCount} 个文件`,
      badge: stageMeta.label,
      tone: STATUS_TONE[stageTree.status],
      detail: confirmation?.confirmed
        ? `阶段已确认完成${confirmation.confirmedBy ? `，确认人：${confirmation.confirmedBy}` : ''}。`
        : '本阶段尚未手动确认完成。',
      meta: [
        `确认状态：${confirmation?.confirmed ? '已确认' : '待确认'}`,
        `确认时间：${formatDate(confirmation?.confirmedAt)}`,
      ],
      onSelect: () => onSelectStage(stageTree.stage),
      children: [...kindNodes, ...(stageFocusNode ? [stageFocusNode] : [])],
    };
  });

  const mainName = currentMain?.name || '项目';
  const subName = currentSub?.name || '子项';
  const rootLabel = currentMain && currentSub ? `${mainName} / ${subName}` : '项目总览';
  const rootCaption = [
    currentMain?.code,
    currentSub?.code,
    `${stageTrees.length} 个阶段`,
  ]
    .filter(Boolean)
    .join(' · ');

  return [
    {
      id: key('overview', currentMain?.id || 'project', currentSub?.id || 'subproject'),
      label: rootLabel,
      icon: '🏗',
      tone: 'blue',
      caption: rootCaption,
      badge: activeStage,
      children: stageNodes,
    },
  ];
};
