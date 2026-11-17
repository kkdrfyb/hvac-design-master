import React, { useState } from 'react';
import { api } from '../../api';
import { type ScanResult, type DesignStage } from '../../types';
import ScanResultTree from './ScanResultTree';

// ── 辅助：扁平化扫描结果中所有文件路径 ────────────────────

const collectAllFiles = (result: ScanResult): string[] => {
  const paths: string[] = [];
  for (const kind of result.kinds) {
    for (const subtype of kind.subtypes) {
      for (const version of subtype.versions) {
        for (const file of version.files) {
          paths.push(file.fullPath);
        }
      }
      for (const file of subtype.directFiles) {
        paths.push(file.fullPath);
      }
    }
    for (const file of kind.directFiles) {
      paths.push(file.fullPath);
    }
  }
  return paths;
};

// ── 主组件 ──────────────────────────────────────────────────────

interface FolderScannerViewProps {
  currentMainId: string;
  currentSubId: string;
  currentStage: DesignStage;
  actorName: string;
  onViewProcess: () => void;
}

const FolderScannerView: React.FC<FolderScannerViewProps> = ({
  currentMainId,
  currentSubId,
  currentStage,
  actorName,
  onViewProcess,
}) => {
  const [folderPath, setFolderPath] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 扫描
  const handleScan = async () => {
    const path = folderPath.trim();
    if (!path) {
      setError('请输入文件夹路径');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    setScanResult(null);
    try {
      const result: ScanResult = await api.scanFolder(path);
      setScanResult(result);
      // 默认全选
      const allPaths = collectAllFiles(result);
      setSelectedFiles(new Set(allPaths));
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换文件
  const handleToggleFile = (fullPath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fullPath)) {
        next.delete(fullPath);
      } else {
        next.add(fullPath);
      }
      return next;
    });
  };

  // 全选/取消全选
  const handleToggleSelectAll = (selectAll: boolean) => {
    if (!scanResult) return;
    if (selectAll) {
      setSelectedFiles(new Set(collectAllFiles(scanResult)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  // 生成选中记录 → 提交 apply
  const handleApply = async () => {
    if (!scanResult || selectedFiles.size === 0) {
      setError('没有选中任何文件');
      return;
    }

    // 构建 records：按 (kind, subtype, version) 分组
    const recordMap = new Map<string, {
      kind: string;
      subtype: string;
      version: string;
      stage: DesignStage;
      title: string;
      files: { fullPath: string; name: string }[];
    }>();

    for (const kind of scanResult.kinds) {
      for (const subtype of kind.subtypes) {
        // 版本文件夹中的文件
        for (const version of subtype.versions) {
          const selected = version.files.filter(f => selectedFiles.has(f.fullPath));
          if (selected.length === 0) continue;
          const key = `${kind.kind}|${subtype.subtype}|${version.label}`;
          recordMap.set(key, {
            kind: kind.kind,
            subtype: subtype.subtype,
            version: version.label,
            stage: currentStage,
            title: subtype.subtype,
            files: selected.map(f => ({ fullPath: f.fullPath, name: f.name })),
          });
        }
        // 直接文件
        const selectedDirect = subtype.directFiles.filter(f => selectedFiles.has(f.fullPath));
        if (selectedDirect.length > 0) {
          const key = `${kind.kind}|${subtype.subtype}|_direct`;
          recordMap.set(key, {
            kind: kind.kind,
            subtype: subtype.subtype,
            version: 'A版',
            stage: currentStage,
            title: subtype.subtype,
            files: selectedDirect.map(f => ({ fullPath: f.fullPath, name: f.name })),
          });
        }
      }
      // kind 直接文件
      const selectedKindFiles = kind.directFiles.filter(f => selectedFiles.has(f.fullPath));
      if (selectedKindFiles.length > 0) {
        const key = `${kind.kind}|__kind__|_direct`;
        recordMap.set(key, {
          kind: kind.kind,
          subtype: kind.label,
          version: 'A版',
          stage: currentStage,
          title: kind.label,
          files: selectedKindFiles.map(f => ({ fullPath: f.fullPath, name: f.name })),
        });
      }
    }

    const records = Array.from(recordMap.values());

    if (records.length === 0) {
      setError('没有可导入的记录');
      return;
    }

    setError('');
    setApplying(true);
    try {
      const result = await api.applyScan(currentMainId, currentSubId, {
        stage: currentStage,
        rootPath: scanResult.rootPath,
        records,
      });
      setSuccess(`成功导入 ${result.imported} 条记录，共 ${result.totalFiles} 个文件`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* 顶部栏 */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">文件夹扫描</h2>
          <p className="text-xs text-slate-400">
            将本地文件系统中的过程文件批量导入到当前项目
          </p>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 路径输入 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              文件夹路径
            </label>
            <p className="text-xs text-slate-400 mb-3">
              选择项目文件夹，要求根目录下按设计过程分类组织（设计输入 / 收到提资 / 计算结果 / 对外提资 / 输出成果 / 出图后闭环 / 设计备注）
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={folderPath}
                onChange={e => setFolderPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="例如: D:\projects\制氯站"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 outline-none"
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={loading || !folderPath.trim()}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    扫描中...
                  </>
                ) : (
                  '扫描'
                )}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-emerald-700">{success}</p>
                <button
                  type="button"
                  onClick={onViewProcess}
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  查看设计过程 →
                </button>
              </div>
            </div>
          )}

          {/* 扫描结果 */}
          {scanResult && (
            <>
              {/* 摘要 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">根目录：</span>
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {scanResult.rootPath}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="font-bold text-blue-600">{scanResult.summary.kindCount}</span>
                    <span>个分类</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="font-bold text-blue-600">{scanResult.summary.fileCount}</span>
                    <span>个文件</span>
                  </div>
                  {scanResult.summary.unmatchedCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <span className="font-bold">{scanResult.summary.unmatchedCount}</span>
                      <span>个未匹配文件夹</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 树形结构 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <ScanResultTree
                  result={scanResult}
                  selectedFiles={selectedFiles}
                  onToggleFile={handleToggleFile}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">
                  已选中 <span className="font-bold text-blue-600">{selectedFiles.size}</span> 个文件
                  {selectedFiles.size > 0 && (
                    <>，将以当前阶段 <span className="font-bold">{currentStage}</span> 导入</>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setScanResult(null);
                      setSelectedFiles(new Set());
                      setSuccess('');
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50"
                  >
                    清空结果
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={applying || selectedFiles.size === 0}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {applying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        导入中...
                      </>
                    ) : (
                      '更新项目'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderScannerView;
