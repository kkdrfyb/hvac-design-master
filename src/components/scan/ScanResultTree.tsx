import React, { useState } from 'react';
import { DESIGN_PROCESS_KIND_LABELS } from '../../process';
import {
  type ScannedFile,
  type ScannedKindGroup,
  type ScannedSubtype,
  type ScannedVersion,
  type DesignProcessKind,
  type ScanResult,
} from '../../types';

// ── 工具 ────────────────────────────────────────────────────────

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 1)} ${sizes[idx]}`;
};

const getKindLabel = (kind: string): string =>
  DESIGN_PROCESS_KIND_LABELS[kind as DesignProcessKind] || kind;

const getKindBadgeColor = (kind: string): string => {
  const colors: Record<string, string> = {
    INPUT: 'bg-blue-100 text-blue-700',
    RECEIVED_INTERFACE: 'bg-purple-100 text-purple-700',
    CALCULATION: 'bg-amber-100 text-amber-700',
    INTERFACE: 'bg-cyan-100 text-cyan-700',
    DELIVERABLE: 'bg-emerald-100 text-emerald-700',
    POST_ISSUE: 'bg-rose-100 text-rose-700',
    NOTE: 'bg-slate-100 text-slate-600',
  };
  return colors[kind] || 'bg-slate-100 text-slate-600';
};

// ── 文件行组件 ──────────────────────────────────────────────────

interface FileRowProps {
  file: ScannedFile;
  checked: boolean;
  onToggle: () => void;
}

const FileRow: React.FC<FileRowProps> = React.memo(({ file, checked, onToggle }) => {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className={`text-xs flex-1 truncate ${checked ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
        {file.name}
      </span>
      <span className="text-[10px] text-slate-400 font-mono">{formatSize(file.size)}</span>
    </label>
  );
});

FileRow.displayName = 'FileRow';

// ── 版本折叠面板 ────────────────────────────────────────────────

interface VersionSectionProps {
  version: ScannedVersion;
  selectedFiles: Set<string>;
  onToggleFile: (fullPath: string) => void;
}

const VersionSection: React.FC<VersionSectionProps> = ({ version, selectedFiles, onToggleFile }) => {
  const [expanded, setExpanded] = useState(true);
  const allSelected = version.files.every(f => selectedFiles.has(f.fullPath));
  const someSelected = version.files.some(f => selectedFiles.has(f.fullPath));

  return (
    <div className="ml-4 border-l-2 border-slate-200 pl-3">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-1.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        <span className="text-[10px]">{expanded ? '▾' : '▸'}</span>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${allSelected ? 'bg-blue-500' : someSelected ? 'bg-amber-400' : 'bg-slate-300'}`} />
        {version.label}
        <span className="text-[10px] text-slate-400 font-normal">({version.files.length} 个文件)</span>
      </button>
      {expanded && (
        <div className="mt-0.5">
          {version.files.map(file => (
            <FileRow
              key={file.fullPath}
              file={file}
              checked={selectedFiles.has(file.fullPath)}
              onToggle={() => onToggleFile(file.fullPath)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── 细项折叠面板 ────────────────────────────────────────────────

interface SubtypeSectionProps {
  subtype: ScannedSubtype;
  selectedFiles: Set<string>;
  onToggleFile: (fullPath: string) => void;
}

const SubtypeSection: React.FC<SubtypeSectionProps> = ({ subtype, selectedFiles, onToggleFile }) => {
  const [expanded, setExpanded] = useState(true);
  const hasVersions = subtype.versions.length > 0;
  const hasDirectFiles = subtype.directFiles.length > 0;
  const allFiles = [
    ...subtype.versions.flatMap(v => v.files),
    ...subtype.directFiles,
  ];
  const allSelected = allFiles.length > 0 && allFiles.every(f => selectedFiles.has(f.fullPath));
  const someSelected = allFiles.some(f => selectedFiles.has(f.fullPath));

  return (
    <div className="ml-4 border-l-2 border-indigo-200 pl-3">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-1.5 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800"
      >
        <span className="text-xs">{expanded ? '▾' : '▸'}</span>
        <span className={`inline-block w-2 h-2 rounded-full ${allSelected ? 'bg-indigo-500' : someSelected ? 'bg-amber-400' : 'bg-slate-300'}`} />
        {subtype.subtype}
        <span className="text-[11px] text-slate-400 font-normal">
          ({allFiles.length} 个文件{hasVersions ? `, ${subtype.versions.length} 个版本` : ''})
        </span>
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {hasVersions && subtype.versions.map(v => (
            <VersionSection
              key={v.label}
              version={v}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
            />
          ))}
          {hasDirectFiles && (
            <div className="ml-4 border-l-2 border-slate-200 pl-3 mt-1">
              {subtype.directFiles.map(file => (
                <FileRow
                  key={file.fullPath}
                  file={file}
                  checked={selectedFiles.has(file.fullPath)}
                  onToggle={() => onToggleFile(file.fullPath)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Kind 组折叠面板 ─────────────────────────────────────────────

interface KindSectionProps {
  group: ScannedKindGroup;
  selectedFiles: Set<string>;
  onToggleFile: (fullPath: string) => void;
}

const KindSection: React.FC<KindSectionProps> = ({ group, selectedFiles, onToggleFile }) => {
  const [expanded, setExpanded] = useState(true);
  const allFiles = [
    ...group.subtypes.flatMap(s => [
      ...s.versions.flatMap(v => v.files),
      ...s.directFiles,
    ]),
    ...group.directFiles,
  ];
  const allSelected = allFiles.length > 0 && allFiles.every(f => selectedFiles.has(f.fullPath));

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-slate-400">{expanded ? '▾' : '▸'}</span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${getKindBadgeColor(group.kind)}`}>
            {getKindLabel(group.kind)}
          </span>
          <span className="text-sm font-semibold text-slate-700">{group.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            {group.subtypes.length} 个细项 / {allFiles.length} 个文件
          </span>
          <span className={`w-2 h-2 rounded-full ${allSelected ? 'bg-blue-500' : 'bg-amber-400'}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          {group.subtypes.length === 0 && group.directFiles.length === 0 && (
            <p className="text-xs text-slate-400 italic py-2">空的分类</p>
          )}
          {group.subtypes.map(s => (
            <SubtypeSection
              key={s.subtype}
              subtype={s}
              selectedFiles={selectedFiles}
              onToggleFile={onToggleFile}
            />
          ))}
          {group.directFiles.length > 0 && (
            <div className="ml-4 border-l-2 border-indigo-200 pl-3 mt-1">
              {group.directFiles.map(f => (
                <FileRow
                  key={f.fullPath}
                  file={f}
                  checked={selectedFiles.has(f.fullPath)}
                  onToggle={() => onToggleFile(f.fullPath)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── 主组件 ──────────────────────────────────────────────────────

interface ScanResultTreeProps {
  result: ScanResult;
  /** 当前选中的文件路径集合 */
  selectedFiles: Set<string>;
  /** 切换文件选中状态 */
  onToggleFile: (fullPath: string) => void;
  /** 全选/取消全选 */
  onToggleSelectAll: (selected: boolean) => void;
}

const ScanResultTree: React.FC<ScanResultTreeProps> = ({
  result,
  selectedFiles,
  onToggleFile,
  onToggleSelectAll,
}) => {
  const allFiles = result.kinds.flatMap(k => [
    ...k.subtypes.flatMap(s => [
      ...s.versions.flatMap(v => v.files),
      ...s.directFiles,
    ]),
    ...k.directFiles,
  ]);
  const allSelected = allFiles.length > 0 && allFiles.every(f => selectedFiles.has(f.fullPath));

  return (
    <div className="space-y-3">
      {/* 控制栏 */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleSelectAll(!allSelected)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"
            />
            {allSelected ? '取消全选' : '全选'}
          </label>
          <span className="text-xs text-slate-400">
            已选 {selectedFiles.size} / {allFiles.length} 个文件
          </span>
        </div>
      </div>

      {/* Kind 组 */}
      {result.kinds.map(group => (
        <KindSection
          key={group.kind}
          group={group}
          selectedFiles={selectedFiles}
          onToggleFile={onToggleFile}
        />
      ))}

      {/* 未匹配的文件夹 */}
      {result.unmatchedFolders.length > 0 && (
        <div className="border border-amber-200 rounded-xl bg-amber-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">
            未识别的文件夹（已忽略）
          </p>
          <ul className="text-xs text-amber-600 space-y-0.5">
            {result.unmatchedFolders.map(name => (
              <li key={name} className="flex items-center gap-1">
                <span>📁</span> {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 警告 */}
      {result.warnings.length > 0 && (
        <div className="border border-red-200 rounded-xl bg-red-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700 mb-1">扫描警告</p>
          <ul className="text-xs text-red-600 space-y-0.5">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 空状态 */}
      {result.kinds.length === 0 && result.unmatchedFolders.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">没有发现可识别的设计过程文件夹</p>
          <p className="text-xs mt-1">请检查路径是否正确，或确认根目录下是否有 设计输入/收到提资/计算结果 等文件夹</p>
        </div>
      )}
    </div>
  );
};

export default ScanResultTree;
