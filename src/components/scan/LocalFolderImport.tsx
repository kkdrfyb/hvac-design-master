import React, { useMemo, useRef, useState } from 'react';
import { api } from '../../api';
import {
  DESIGN_PROCESS_KIND_LABELS,
  DESIGN_PROCESS_KINDS,
  PROCESS_SUBTYPE_LIBRARY,
} from '../../process';
import { type DesignProcessKind, type DesignStage } from '../../types';

// ── 目录名 → 过程类别（沿用 folder_scanner.py 的中文口径） ────
const KIND_DIR_HINTS: Array<{ hints: string[]; kind: DesignProcessKind }> = [
  { hints: ['设计输入', '设计依据', '任务书'], kind: 'INPUT' },
  { hints: ['收到提资', '提资', '接口条件', '条件'], kind: 'RECEIVED_INTERFACE' },
  { hints: ['计算结果', '计算书', '计算', '风量', '水力'], kind: 'CALCULATION' },
  { hints: ['对外提资', '外提'], kind: 'INTERFACE' },
  { hints: ['输出成果', '成果', '施工图', '图纸', '出图', '手册', '清单'], kind: 'DELIVERABLE' },
  { hints: ['出图后闭环', '闭环', 'FCR', 'CR', 'DEN'], kind: 'POST_ISSUE' },
  { hints: ['设计备注', '备注'], kind: 'NOTE' },
];

const isVersionDir = (seg: string): boolean =>
  /(?:版|版本)$/.test(seg) || /^[Vv]\d+$/.test(seg) || /^[A-D]$/.test(seg);

const inferKind = (relativePath: string): DesignProcessKind => {
  const segments = relativePath.split('/').filter(Boolean);
  for (const seg of segments.slice(0, -1)) {
    for (const { hints, kind } of KIND_DIR_HINTS) {
      if (hints.some(h => seg.includes(h))) return kind;
    }
  }
  return 'INPUT';
};

const inferSubtype = (relativePath: string, kind: DesignProcessKind): string => {
  const segments = relativePath.split('/').filter(Boolean);
  const parent = segments.length >= 2 ? segments[segments.length - 2] : '';
  if (!parent || isVersionDir(parent)) return '';
  // 若父目录本身是类别名，则不重复作为细项
  if (KIND_DIR_HINTS.some(({ hints }) => hints.some(h => parent.includes(h)))) return '';
  const library = PROCESS_SUBTYPE_LIBRARY[kind] || [];
  return library.includes(parent) ? parent : parent;
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

// ── 单个待上传文件 ────────────────────────────────────────────
interface LocalFileItem {
  key: string;
  file: File;
  relativePath: string;
  kind: DesignProcessKind;
  subtype: string;
  selected: boolean;
}

interface LocalFolderImportProps {
  currentMainId: string;
  currentSubId: string;
  currentStage: DesignStage;
  actorName: string;
  readOnly?: boolean;
  onViewProcess: () => void;
}

const LocalFolderImport: React.FC<LocalFolderImportProps> = ({
  currentMainId,
  currentSubId,
  currentStage,
  actorName,
  readOnly = false,
  onViewProcess,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderName, setFolderName] = useState('');
  const [items, setItems] = useState<LocalFileItem[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ ok: number; fail: number; fails: string[] } | null>(null);
  const [batchKind, setBatchKind] = useState<DesignProcessKind>('INPUT');
  const [batchSubtype, setBatchSubtype] = useState('');

  // 选目录：webkitRelativePath 提供本机相对层级
  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = Array.from(fileList as FileList);
    const root = (files[0] as any).webkitRelativePath?.split('/')[0] || '所选文件夹';
    setFolderName(root);
    setError('');
    setResult(null);
    setProgress(null);
    const next: LocalFileItem[] = files.map(file => {
      const relativePath = (file as any).webkitRelativePath || file.name;
      const kind = inferKind(relativePath);
      return {
        key: `${relativePath}__${file.size}__${file.lastModified}`,
        file,
        relativePath,
        kind,
        subtype: inferSubtype(relativePath, kind),
        selected: true,
      };
    });
    setItems(next);
    // 允许再次选择同一目录
    event.target.value = '';
  };

  const selectedCount = useMemo(() => items.filter(i => i.selected).length, [items]);
  const totalSize = useMemo(() => items.reduce((sum, i) => sum + i.file.size, 0), [items]);
  const selectedSize = useMemo(
    () => items.filter(i => i.selected).reduce((sum, i) => sum + i.file.size, 0),
    [items]
  );

  const toggleOne = (key: string) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, selected: !i.selected } : i)));

  const setAll = (selected: boolean) =>
    setItems(prev => prev.map(i => ({ ...i, selected })));

  const setKind = (key: string, kind: DesignProcessKind) =>
    setItems(prev =>
      prev.map(i => (i.key === key ? { ...i, kind, subtype: '' } : i))
    );

  const setSubtype = (key: string, subtype: string) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, subtype } : i)));

  // 把当前勾选的文件批量归类
  const applyBatch = () => {
    if (selectedCount === 0) {
      setError('请先勾选要归类的文件');
      return;
    }
    setItems(prev =>
      prev.map(i => (i.selected ? { ...i, kind: batchKind, subtype: batchSubtype.trim() } : i))
    );
    setError('');
  };

  // 上传：按 (kind, subtype) 分组，每组调用现有上传接口，逐组失败隔离
  const handleUpload = async () => {
    if (readOnly) {
      setError('当前项目为只读，不能上传资料');
      return;
    }
    if (selectedCount === 0) {
      setError('请先勾选要上传的文件');
      return;
    }
    const chosen = items.filter(i => i.selected);
    const groups = new Map<string, LocalFileItem[]>();
    chosen.forEach(item => {
      const key = `${item.kind}|${item.subtype.trim()}`;
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    setError('');
    setResult(null);
    setUploading(true);
    setProgress({ done: 0, total: chosen.length });

    let ok = 0;
    let fail = 0;
    const fails: string[] = [];
    let groupIndex = 0;

    for (const [key, group] of Array.from(groups.entries())) {
      const [kind, subtype] = key.split('|');
      const recordId = `local_${Date.now()}_${groupIndex++}`;
      const label = DESIGN_PROCESS_KIND_LABELS[kind as DesignProcessKind] || kind;
      try {
        await api.uploadFiles(
          `/projects/${currentMainId}/subprojects/${currentSubId}/process-record-files`,
          group.map(g => g.file),
          {
            recordId,
            stage: currentStage,
            kind,
            subtype,
            title: subtype || label || '本机导入资料',
          }
        );
        ok += group.length;
      } catch (err) {
        fail += group.length;
        fails.push(`${label}${subtype ? ' / ' + subtype : ''}：${err instanceof Error ? err.message : '上传失败'}`);
      }
      setProgress({ done: ok + fail, total: chosen.length });
    }

    setUploading(false);
    setResult({ ok, fail, fails });
    if (ok > 0) {
      setItems(prev => prev.map(i => (i.selected ? { ...i, selected: false } : i)));
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部栏 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800">本机资料导入</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              在您自己的电脑上选择资料文件夹，预览并勾选后上传到当前项目（文件只在点击上传后才会离开本机）
            </p>
          </div>
          <span className="text-xs text-slate-400">当前阶段：{currentStage}</span>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {readOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              当前项目为只读，您仍可预览文件，但不能上传。
            </div>
          )}

          {/* 选择文件夹 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-sm font-bold text-slate-700 mb-1">选择本机文件夹</label>
                <p className="text-xs text-slate-400">
                  支持中文名、长路径与多层目录；系统会自动按目录名归类到七类设计过程，上传前都可修改。
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={handlePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
              >
                选择文件夹…
              </button>
            </div>
            {folderName && (
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{folderName}</span>
                <span>共 <b className="text-blue-600">{items.length}</b> 个文件</span>
                <span>合计 {formatSize(totalSize)}</span>
                <button
                  type="button"
                  onClick={() => { setItems([]); setFolderName(''); setResult(null); setError(''); }}
                  className="ml-auto text-slate-400 hover:text-rose-500"
                >
                  清空
                </button>
              </div>
            )}
          </div>

          {/* 错误 / 结果 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-emerald-700">
                  上传完成：成功 {result.ok} 个文件{result.fail > 0 ? `，失败 ${result.fail} 个` : ''}
                </p>
                <button
                  type="button"
                  onClick={onViewProcess}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  查看设计过程 →
                </button>
              </div>
              {result.fails.length > 0 && (
                <ul className="mt-2 text-xs text-rose-600 list-disc pl-5 space-y-0.5">
                  {result.fails.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* 归类工具条 */}
          {items.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => setAll(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">全选</button>
                <button type="button" onClick={() => setAll(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">取消全选</button>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500">把选中文件归为</span>
                <select
                  value={batchKind}
                  onChange={e => setBatchKind(e.target.value as DesignProcessKind)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  {DESIGN_PROCESS_KINDS.map(k => (
                    <option key={k} value={k}>{DESIGN_PROCESS_KIND_LABELS[k]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={batchSubtype}
                  onChange={e => setBatchSubtype(e.target.value)}
                  placeholder="细项（可留空）"
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-40"
                />
                <button
                  type="button"
                  onClick={applyBatch}
                  disabled={selectedCount === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  应用归类
                </button>
              </div>
            </div>
          )}

          {/* 文件清单 */}
          {items.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-xs text-slate-500">
                已选 <b className="text-blue-600">{selectedCount}</b> / {items.length} 个文件，预计上传 {formatSize(selectedSize)}
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                {items.map(item => (
                  <div key={item.key} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleOne(item.key)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-700 truncate" title={item.relativePath}>{item.file.name}</div>
                      <div className="text-[11px] text-slate-400 truncate" title={item.relativePath}>{item.relativePath}</div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono w-16 text-right">{formatSize(item.file.size)}</span>
                    <select
                      value={item.kind}
                      onChange={e => setKind(item.key, e.target.value as DesignProcessKind)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-28"
                    >
                      {DESIGN_PROCESS_KINDS.map(k => (
                        <option key={k} value={k}>{DESIGN_PROCESS_KIND_LABELS[k]}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={item.subtype}
                      onChange={e => setSubtype(item.key, e.target.value)}
                      placeholder="细项"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-32"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 上传操作 */}
          {items.length > 0 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">
                {uploading && progress
                  ? <>正在上传 {progress.done} / {progress.total} 个文件…</>
                  : <>将按归类分组上传到当前项目 / 子项 <b className="text-slate-700">{currentStage}</b> 阶段</>}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setItems([]); setFolderName(''); setResult(null); setError(''); }}
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  清空结果
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || readOnly || selectedCount === 0}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />上传中…</>
                  ) : (
                    `上传 ${selectedCount} 个文件`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalFolderImport;
