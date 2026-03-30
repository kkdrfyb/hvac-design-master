import React, { useMemo, useState } from 'react';
import {
  DESIGN_PROCESS_KIND_LABELS,
  DESIGN_PROCESS_KINDS,
  getProcessSubtypeOptions,
} from '../../process';
import { DesignProcessKind, DesignProcessRecord, DesignStage, SubmissionFile } from '../../types';

interface ProcessStageBoardProps {
  stage: DesignStage;
  records: DesignProcessRecord[];
  highlight?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpdateRecordSummary?: (recordId: string, changeSummary: string) => void;
  onUploadFiles: (params: {
    recordId: string;
    stage: DesignStage;
    kind: DesignProcessKind;
    subtype: string;
    title: string;
    files: File[];
  }) => Promise<void>;
  onDownloadFile: (file: SubmissionFile) => void;
  allowDelete?: boolean;
  onDeleteStage?: (stage: DesignStage) => void;
}

const sanitizeKey = (value: string) => value.replace(/[^\w\u4e00-\u9fa5-]+/g, '_');

const ProcessStageBoard: React.FC<ProcessStageBoardProps> = ({
  stage,
  records,
  highlight = false,
  expanded,
  onToggle,
  onUpdateRecordSummary,
  onUploadFiles,
  onDownloadFile,
  allowDelete = false,
  onDeleteStage,
}) => {
  const [uploadingKey, setUploadingKey] = useState('');
  const [uploadErrorKey, setUploadErrorKey] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [expandedKinds, setExpandedKinds] = useState<Record<string, boolean>>({});
  const [customSubtypeDrafts, setCustomSubtypeDrafts] = useState<Record<string, string>>({});
  const [customSubtypes, setCustomSubtypes] = useState<Record<string, string[]>>({});
  const [hiddenSubtypes, setHiddenSubtypes] = useState<Record<string, string[]>>({});

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [records]
  );

  const totalVersions = sortedRecords.reduce((count, record) => count + (record.versions?.length || 0), 0);

  return (
    <div
      className={`border rounded-2xl ${
        highlight ? 'border-blue-200 bg-blue-50/60 shadow-sm' : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <span className="text-sm text-slate-400">{expanded ? '▾' : '▸'}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-700">{stage}</h4>
              {highlight && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-black tracking-wide">
                  当前阶段
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {sortedRecords.length} 条业务记录 / {totalVersions} 个版本
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {allowDelete && onDeleteStage && (
            <button
              type="button"
              onClick={() => onDeleteStage(stage)}
              className="text-[10px] px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              删除空阶段
            </button>
          )}
          <span className="text-[10px] text-slate-400">{expanded ? '收起' : '展开'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {DESIGN_PROCESS_KINDS.map(recordKind => {
            const kindRecords = sortedRecords.filter(record => record.kind === recordKind);
            const kindKey = `${stage}-${recordKind}`;
            const kindExpanded = expandedKinds[kindKey] || false;
            const knownSubtypes = getProcessSubtypeOptions(
              recordKind,
              kindRecords
                .map(record => (record.subtype || record.title || '').trim())
                .filter(Boolean)
                .concat(customSubtypes[kindKey] || [])
            );
            const subtypeOptions = (knownSubtypes.length > 0 ? knownSubtypes : ['未分类']).filter(
              subtype => !(hiddenSubtypes[kindKey] || []).includes(subtype)
            );

            return (
              <div key={recordKind} className="border border-slate-200 rounded-xl bg-white">
                <button
                  type="button"
                  onClick={() => setExpandedKinds(prev => ({ ...prev, [kindKey]: !kindExpanded }))}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-xs font-black text-slate-700">{DESIGN_PROCESS_KIND_LABELS[recordKind]}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {kindRecords.length} 条记录 / {kindRecords.reduce((count, record) => count + (record.versions?.length || 0), 0)} 个版本
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{kindExpanded ? '收起' : '展开'}</span>
                </button>

                {kindExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                    <div className="pt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={customSubtypeDrafts[kindKey] || ''}
                        onChange={event =>
                          setCustomSubtypeDrafts(prev => ({ ...prev, [kindKey]: event.target.value }))
                        }
                        placeholder={`新增${DESIGN_PROCESS_KIND_LABELS[recordKind]}细项，例如：建筑条件、FCR`}
                        className="flex-1 min-w-[220px] border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const draft = (customSubtypeDrafts[kindKey] || '').trim();
                          if (!draft) return;
                          setCustomSubtypes(prev => ({
                            ...prev,
                            [kindKey]: Array.from(new Set([...(prev[kindKey] || []), draft])),
                          }));
                          setCustomSubtypeDrafts(prev => ({ ...prev, [kindKey]: '' }));
                        }}
                        className="text-[11px] px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        新增细项
                      </button>
                    </div>

                    {subtypeOptions.map(subtype => {
                      const subtypeKey = `${kindKey}-${subtype}`;
                      const subtypeRecords = kindRecords.filter(record => {
                        const normalizedSubtype = (record.subtype || record.title || '未分类').trim() || '未分类';
                        return normalizedSubtype === subtype;
                      });
                      const subtypeVersionCount = subtypeRecords.reduce(
                        (count, record) => count + (record.versions?.length || 0),
                        0
                      );

                      return (
                        <div key={subtype} className="border border-slate-100 rounded-xl bg-slate-50/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold text-slate-700">{subtype}</div>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {subtypeRecords.length} 条记录 / {subtypeVersionCount} 个版本
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {subtypeRecords.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHiddenSubtypes(prev => ({
                                      ...prev,
                                      [kindKey]: Array.from(new Set([...(prev[kindKey] || []), subtype])),
                                    }))
                                  }
                                  className="text-[11px] px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                  删除细项
                                </button>
                              )}
                              <label className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 text-white cursor-pointer hover:bg-slate-800">
                                上传文件
                                <input
                                  type="file"
                                  className="hidden"
                                  multiple
                                  onChange={async event => {
                                    const files = event.target.files ? Array.from(event.target.files) : [];
                                    if (files.length === 0) return;
                                    const existingRecord = subtypeRecords[0];
                                    const uploadTitle = existingRecord?.title || subtype;
                                    const uploadRecordId =
                                      existingRecord?.id ||
                                      `process_upload_${sanitizeKey(stage)}_${recordKind}_${sanitizeKey(subtype)}`;
                                    setUploadingKey(subtypeKey);
                                    setUploadErrorKey('');
                                    setUploadError('');
                                    try {
                                      await onUploadFiles({
                                        recordId: uploadRecordId,
                                        stage,
                                        kind: recordKind,
                                        subtype,
                                        title: uploadTitle,
                                        files,
                                      });
                                    } catch (err) {
                                      setUploadErrorKey(subtypeKey);
                                      setUploadError(err instanceof Error ? err.message : '上传失败');
                                    } finally {
                                      setUploadingKey('');
                                      event.target.value = '';
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {uploadingKey === subtypeKey && (
                            <div className="text-[11px] text-slate-400 mt-2">上传中...</div>
                          )}
                          {uploadErrorKey === subtypeKey && uploadError && (
                            <div className="text-[11px] text-red-600 mt-2">{uploadError}</div>
                          )}

                          {subtypeRecords.length === 0 ? (
                            <div className="text-[11px] text-slate-400 mt-2">
                              暂无该细项记录。可直接上传文件，系统会自动生成一条该细项过程记录。
                            </div>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {subtypeRecords.map(record => (
                                <div key={record.id} className="border-l-2 border-slate-200 pl-3">
                                  <div className="text-xs font-bold text-slate-700">{record.title}</div>
                                  {record.detail && (
                                    <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                                      {record.detail}
                                    </div>
                                  )}
                                  {typeof onUpdateRecordSummary === 'function' ? (
                                    <div className="mt-2">
                                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                        本次更新摘要
                                      </label>
                                      <textarea
                                        value={record.changeSummary || ''}
                                        onChange={event => onUpdateRecordSummary(record.id, event.target.value)}
                                        rows={2}
                                        placeholder="手工记录本版新增、替换、删除或补充的内容"
                                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-[11px] text-slate-600 resize-none bg-white"
                                      />
                                    </div>
                                  ) : record.changeSummary ? (
                                    <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                                      <div className="text-[10px] font-bold text-amber-700">变更摘要</div>
                                      <div className="text-[11px] text-amber-800 mt-1 whitespace-pre-wrap">
                                        {record.changeSummary}
                                      </div>
                                    </div>
                                  ) : null}
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    {record.createdBy} · {record.createdAt}
                                  </div>
                                  {record.versions && record.versions.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {record.versions.map((version, versionIndex) => {
                                        const latestFile = version.files[0];
                                        const versionMeta = [
                                          version.date,
                                          latestFile?.uploadedBy,
                                          latestFile?.uploadedAt,
                                          `${version.files.length} 个文件`,
                                        ]
                                          .filter(Boolean)
                                          .join(' · ');
                                        return (
                                        <div
                                          key={`${record.id}-${version.version}`}
                                          className="space-y-1 text-[11px] text-slate-500 bg-white rounded px-2 py-2"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-700">Ver {version.version}</span>
                                            {versionIndex === 0 && (
                                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                                最新版本
                                              </span>
                                            )}
                                            {versionMeta && <span>{versionMeta}</span>}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            {version.files.map(file => (
                                              <button
                                                key={file.id || `${version.version}-${file.name}`}
                                                type="button"
                                                onClick={() => onDownloadFile(file)}
                                                className="underline decoration-slate-300 hover:text-slate-700"
                                                title={`${file.name}${file.uploadedBy ? ` · ${file.uploadedBy}` : ''}`}
                                              >
                                                {file.name}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProcessStageBoard;
