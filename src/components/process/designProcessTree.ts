import {
  DESIGN_PROCESS_KIND_LABELS,
  DESIGN_PROCESS_KINDS,
  getProcessSubtypeOptions,
  getRecordSubtypeLabel,
} from '../../process';
import {
  DesignProcessRecord,
  DesignStage,
  SubmissionFile,
} from '../../types';
import type { TreeNode } from '../common/TreeDiagram';

const key = (...parts: Array<string | number>) => parts.map(part => encodeURIComponent(String(part))).join('__');

const countVersions = (records: DesignProcessRecord[]) =>
  records.reduce((total, record) => total + (record.versions?.length || 0), 0);

export interface BuildDesignProcessTreeOptions {
  currentStage: DesignStage;
  processStages: DesignStage[];
  processRecords: DesignProcessRecord[];
  onDownloadFile: (file: SubmissionFile) => void;
}

export const buildDesignProcessTreeNodes = ({
  currentStage,
  processStages,
  processRecords,
  onDownloadFile,
}: BuildDesignProcessTreeOptions): TreeNode[] => {
  const stageNodes: TreeNode[] = processStages.map(stage => {
    const stageRecords = [...processRecords]
      .filter(record => record.stage === stage)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const stageVersionCount = countVersions(stageRecords);

    const kindNodes: TreeNode[] = DESIGN_PROCESS_KINDS.map((kind): TreeNode | null => {
      const kindRecords = stageRecords.filter(record => record.kind === kind);
      if (kindRecords.length === 0) return null;

      const subtypeNames = getProcessSubtypeOptions(
        kind,
        kindRecords.map(record => getRecordSubtypeLabel(record))
      ).filter(subtype => kindRecords.some(record => getRecordSubtypeLabel(record) === subtype));

      const subtypeNodes: TreeNode[] = subtypeNames.map(subtype => {
        const subtypeRecords = kindRecords.filter(
          record => getRecordSubtypeLabel(record) === subtype
        );
        const subtypeVersionCount = countVersions(subtypeRecords);
        const latest = subtypeRecords[0];

        const recordNodes: TreeNode[] = subtypeRecords.map((record, recordIndex) => {
          const versionNodes: TreeNode[] = (record.versions || []).map((version, versionIndex) => {
            const fileNodes: TreeNode[] = version.files.map((file, fileIndex) => ({
              id: key('design', stage, kind, subtype, record.id, version.version, file.id || file.name || fileIndex),
              label: file.name,
              caption: [file.uploadedBy, file.uploadedAt].filter(Boolean).join(' · ') || '已归档文件',
              tone: 'slate',
              icon: '📎',
              meta: [
                `版本：${version.version || '—'}`,
                `上传时间：${file.uploadedAt || '—'}`,
                `上传人：${file.uploadedBy || '—'}`,
              ],
              actions: [
                {
                  label: '下载文件',
                  primary: true,
                  onClick: () => onDownloadFile(file),
                },
              ],
            }));

            return {
              id: key('design', stage, kind, subtype, record.id, version.version, versionIndex),
              label: `Ver ${version.version || '—'}`,
              caption: [version.date, `${version.files.length} 个文件`].filter(Boolean).join(' · '),
              badge: versionIndex === 0 ? '最新版本' : undefined,
              tone: versionIndex === 0 ? 'emerald' : 'violet',
              children: fileNodes,
            };
          });

          return {
            id: key('design', stage, kind, subtype, record.id, recordIndex),
            label: record.title || subtype,
            caption: [record.createdBy, record.createdAt].filter(Boolean).join(' · '),
            tone: 'blue',
            detail: [
              record.detail ? `说明：${record.detail}` : '',
              record.changeSummary ? `变更摘要：${record.changeSummary}` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
            meta: [
              `记录时间：${record.createdAt || '—'}`,
              `记录人：${record.createdBy || '—'}`,
              `版本数：${record.versions?.length || 0}`,
            ],
            children: versionNodes,
          };
        });

        return {
          id: key('design', stage, kind, subtype),
          label: subtype,
          caption: `${subtypeRecords.length} 条记录 · ${subtypeVersionCount} 个版本`,
          badge: latest ? '已有记录' : undefined,
          tone: subtypeVersionCount > 0 ? 'emerald' : 'amber',
          detail: latest?.detail,
          children: recordNodes,
        };
      });

      return {
        id: key('design', stage, kind),
        label: DESIGN_PROCESS_KIND_LABELS[kind],
        caption: `${kindRecords.length} 条记录 · ${countVersions(kindRecords)} 个版本`,
        tone: 'violet',
        children: subtypeNodes,
      };
    }).filter((node): node is TreeNode => node !== null);

    return {
      id: key('design', stage),
      label: stage,
      caption: `${stageRecords.length} 条记录 · ${stageVersionCount} 个版本`,
      badge: stage === currentStage ? '当前阶段' : undefined,
      tone: stage === currentStage ? 'blue' : 'slate',
      detail: stageRecords.length ? undefined : '该阶段暂无过程记录，可切换到列表模式新增。',
      children: kindNodes,
    };
  });

  return [
    {
      id: 'design-process-root',
      label: '设计过程',
      icon: '▦',
      tone: 'blue',
      caption: `${processStages.length} 个阶段 · ${processRecords.length} 条记录 · ${countVersions(processRecords)} 个版本`,
      children: stageNodes,
    },
  ];
};
