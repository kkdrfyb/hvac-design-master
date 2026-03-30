import {
  DESIGN_PROCESS_KIND_LABELS,
  DESIGN_PROCESS_KINDS,
  getAggregateStatus,
  getLatestVersion,
  getProcessSubtypeOptions,
  getRecordStatus,
  getRecordSubtypeLabel,
  type StructureStatus,
} from '../../process';
import { DesignProcessKind, DesignProcessRecord, DesignStage } from '../../types';

export interface StructureSubtypeNode {
  subtype: string;
  records: DesignProcessRecord[];
  latestRecord?: DesignProcessRecord;
  latestVersion?: ReturnType<typeof getLatestVersion>;
  status: StructureStatus;
}

export interface StructureKindNode {
  kind: DesignProcessKind;
  label: string;
  status: StructureStatus;
  subtypes: StructureSubtypeNode[];
}

export interface StructureStageNode {
  stage: DesignStage;
  status: StructureStatus;
  kinds: StructureKindNode[];
  completedSubtypeCount: number;
  totalSubtypeCount: number;
}

const sortRecords = (records: DesignProcessRecord[]) =>
  [...records].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

export const buildStructureTree = (
  currentStage: DesignStage,
  processStages: DesignStage[],
  processRecords: DesignProcessRecord[]
): StructureStageNode[] => {
  return processStages.map(stage => {
    const isHistoricalStage = stage !== currentStage;
    const stageRecords = sortRecords(processRecords.filter(record => record.stage === stage));

    const kinds = DESIGN_PROCESS_KINDS.map(kind => {
      const kindRecords = stageRecords.filter(record => record.kind === kind);
      const subtypeNames = getProcessSubtypeOptions(
        kind,
        kindRecords.map(record => getRecordSubtypeLabel(record))
      );
      const subtypes = subtypeNames.map(subtype => {
        const subtypeRecords = kindRecords.filter(record => getRecordSubtypeLabel(record) === subtype);
        const latestRecord = subtypeRecords[0];
        const latestVersion = getLatestVersion(latestRecord);
        const status = getRecordStatus(latestRecord, isHistoricalStage);
        return {
          subtype,
          records: subtypeRecords,
          latestRecord,
          latestVersion,
          status,
        };
      });
      const kindStatus = getAggregateStatus(subtypes.map(item => item.status));
      return {
        kind,
        label: DESIGN_PROCESS_KIND_LABELS[kind],
        status: kindStatus,
        subtypes,
      };
    });

    const stageStatus = getAggregateStatus(kinds.map(item => item.status));
    const completedSubtypeCount = kinds.reduce(
      (count, kind) => count + kind.subtypes.filter(item => item.status === 'done' || item.status === 'locked').length,
      0
    );
    const totalSubtypeCount = kinds.reduce((count, kind) => count + kind.subtypes.length, 0);
    return {
      stage,
      status: stageStatus,
      kinds,
      completedSubtypeCount,
      totalSubtypeCount,
    };
  });
};
