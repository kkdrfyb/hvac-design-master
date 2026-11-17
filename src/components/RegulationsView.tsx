import React from 'react';
import { api } from '../api';

interface RegulationsViewProps {
  knowledgeError?: string;
}

interface StandardDirectoryItem {
  id: string;
  code: string;
  title: string;
  chunkCount: number;
  pdfAvailable: boolean;
}

interface StandardChunk {
  id: string;
  clauseNumber: string;
  content: string;
}

interface StandardDocument {
  id: string;
  code: string;
  title: string;
  pdfAvailable: boolean;
  chunks: StandardChunk[];
}

interface StandardSearchHit {
  id: string;
  standardId: string;
  code: string;
  title: string;
  clauseNumber: string;
  excerpt: string;
}

const STRINGS = {
  title: '规范全文',
  globalSearch: '搜索全部规范全文',
  currentSearch: '在当前规范内搜索',
  collapse: '收起目录',
  expand: '展开目录',
  directory: '规范目录',
  noDirectory: '暂未发现可读取的规范全文。',
  searchResults: '跨规范搜索结果',
  noResults: '没有匹配到相关内容。',
  searching: '正在搜索...',
  loading: '正在加载规范全文...',
  openPdf: '打开 PDF 原文',
  chunkLabel: '全文位置',
  totalChunks: '正文片段',
  currentMatches: '当前规范命中',
  emptyDocument: '当前规范还没有可展示的全文内容。',
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderHighlightedText = (content: string, keyword: string) => {
  const query = keyword.trim();
  if (!query) return content;
  const matcher = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return content.split(matcher).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  );
};

const includesQuery = (content: string, keyword: string) =>
  content.toLowerCase().includes(keyword.trim().toLowerCase());

const RegulationsView: React.FC<RegulationsViewProps> = ({ knowledgeError }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [standards, setStandards] = React.useState<StandardDirectoryItem[]>([]);
  const [standardsLoading, setStandardsLoading] = React.useState(true);
  const [selectedStandardId, setSelectedStandardId] = React.useState('');
  const [selectedStandard, setSelectedStandard] = React.useState<StandardDocument | null>(null);
  const [documentLoading, setDocumentLoading] = React.useState(false);
  const [viewError, setViewError] = React.useState('');
  const [globalSearch, setGlobalSearch] = React.useState('');
  const [globalResults, setGlobalResults] = React.useState<StandardSearchHit[]>([]);
  const [globalSearching, setGlobalSearching] = React.useState(false);
  const [standardSearch, setStandardSearch] = React.useState('');
  const pendingChunkIdRef = React.useRef('');

  const scrollToPendingChunk = React.useCallback(() => {
    if (!pendingChunkIdRef.current) return;
    const target = document.getElementById(`standard-chunk-${pendingChunkIdRef.current}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pendingChunkIdRef.current = '';
  }, []);

  const loadStandards = React.useCallback(async () => {
    setStandardsLoading(true);
    setViewError('');
    try {
      const data = await api.get('/knowledge/standards');
      const items = Array.isArray(data) ? data : [];
      setStandards(items);
      setSelectedStandardId(prev => prev || items[0]?.id || '');
    } catch (error) {
      setViewError(error instanceof Error ? error.message : '规范目录加载失败');
    } finally {
      setStandardsLoading(false);
    }
  }, []);

  const loadStandard = React.useCallback(async (standardId: string) => {
    if (!standardId) {
      setSelectedStandard(null);
      return;
    }
    setDocumentLoading(true);
    setViewError('');
    try {
      const data = await api.get(`/knowledge/standards/${standardId}`);
      setSelectedStandard(data);
    } catch (error) {
      setViewError(error instanceof Error ? error.message : '规范全文加载失败');
      setSelectedStandard(null);
    } finally {
      setDocumentLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  React.useEffect(() => {
    loadStandard(selectedStandardId);
  }, [loadStandard, selectedStandardId]);

  React.useEffect(() => {
    const query = globalSearch.trim();
    if (!query) {
      setGlobalResults([]);
      setGlobalSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setGlobalSearching(true);
      try {
        const data = await api.get(`/knowledge/standards/search?q=${encodeURIComponent(query)}`);
        setGlobalResults(Array.isArray(data) ? data : []);
      } catch (error) {
        setViewError(error instanceof Error ? error.message : '规范搜索失败');
      } finally {
        setGlobalSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [globalSearch]);

  React.useEffect(() => {
    if (!selectedStandard || !pendingChunkIdRef.current) return;
    scrollToPendingChunk();
  }, [scrollToPendingChunk, selectedStandard]);

  const activeStandardMeta = React.useMemo(
    () => standards.find(item => item.id === selectedStandardId) || null,
    [selectedStandardId, standards]
  );

  const visibleChunks = React.useMemo(() => {
    if (!selectedStandard) return [];
    const query = standardSearch.trim().toLowerCase();
    if (!query) return selectedStandard.chunks;
    return selectedStandard.chunks.filter(
      chunk =>
        chunk.clauseNumber.toLowerCase().includes(query) ||
        chunk.content.toLowerCase().includes(query)
    );
  }, [selectedStandard, standardSearch]);

  const matchingChunkCount = React.useMemo(() => {
    if (!selectedStandard) return 0;
    const query = standardSearch.trim();
    if (!query) return selectedStandard.chunks.length;
    return selectedStandard.chunks.filter(
      chunk => includesQuery(chunk.clauseNumber, query) || includesQuery(chunk.content, query)
    ).length;
  }, [selectedStandard, standardSearch]);

  const handleSelectStandard = (standardId: string) => {
    setSelectedStandardId(standardId);
    setStandardSearch('');
  };

  const handleSelectSearchHit = (hit: StandardSearchHit) => {
    pendingChunkIdRef.current = hit.id;
    setSelectedStandardId(hit.standardId);
    setStandardSearch(globalSearch.trim());
    if (hit.standardId === selectedStandardId) {
      window.setTimeout(scrollToPendingChunk, 0);
    }
  };

  const handleOpenPdf = async () => {
    if (!selectedStandard) return;
    try {
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      const { blob } = await api.downloadFile(`/knowledge/standards/${selectedStandard.id}/pdf`);
      const blobUrl = window.URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = blobUrl;
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'PDF 打开失败');
    }
  };

  const combinedError = viewError || knowledgeError || '';

  return (
    <div className="flex h-full min-h-0 bg-slate-50">
      <aside
        className={`border-r border-slate-200 bg-white transition-all duration-200 ${
          sidebarCollapsed ? 'w-14' : 'w-[320px]'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-slate-200 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              {!sidebarCollapsed ? (
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                    {STRINGS.directory}
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-800">{STRINGS.title}</div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(value => !value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                title={sidebarCollapsed ? STRINGS.expand : STRINGS.collapse}
              >
                {sidebarCollapsed ? '>' : '<'}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            {standardsLoading ? (
              <div className="px-2 py-4 text-sm text-slate-400">{STRINGS.loading}</div>
            ) : standards.length === 0 ? (
              <div className="px-2 py-4 text-sm text-slate-400">{STRINGS.noDirectory}</div>
            ) : (
              <div className="space-y-2">
                {standards.map(item => {
                  const selected = item.id === selectedStandardId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectStandard(item.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {sidebarCollapsed ? (
                        <div className="text-center text-[11px] font-black">
                          {item.code.replace('GB ', '')}
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-black">{item.code}</div>
                          <div className={`mt-1 text-sm font-bold ${selected ? 'text-white' : 'text-slate-700'}`}>
                            {item.title}
                          </div>
                          <div className={`mt-2 flex items-center justify-between text-[11px] ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                            <span>{STRINGS.totalChunks} {item.chunkCount}</span>
                            <span>{item.pdfAvailable ? 'PDF' : 'TXT'}</span>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                {STRINGS.title}
              </div>
              <div className="mt-1 truncate text-lg font-black text-slate-800">
                {selectedStandard ? `${selectedStandard.code} ${selectedStandard.title}` : STRINGS.title}
              </div>
            </div>
            {selectedStandard?.pdfAvailable ? (
              <button
                type="button"
                onClick={handleOpenPdf}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {STRINGS.openPdf}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div>
              <div className="mb-1 text-[11px] font-bold text-slate-500">{STRINGS.globalSearch}</div>
              <input
                type="text"
                value={globalSearch}
                onChange={event => setGlobalSearch(event.target.value)}
                placeholder={STRINGS.globalSearch}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300"
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold text-slate-500">{STRINGS.currentSearch}</div>
              <input
                type="text"
                value={standardSearch}
                onChange={event => setStandardSearch(event.target.value)}
                placeholder={STRINGS.currentSearch}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300"
              />
            </div>
          </div>

          {combinedError ? (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {combinedError}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {globalSearch.trim() ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-800">{STRINGS.searchResults}</div>
                {globalSearching ? (
                  <div className="text-xs text-slate-400">{STRINGS.searching}</div>
                ) : (
                  <div className="text-xs text-slate-400">{globalResults.length} 条结果</div>
                )}
              </div>

              {globalResults.length > 0 ? (
                <div className="space-y-2">
                  {globalResults.map(hit => (
                    <button
                      key={`${hit.standardId}-${hit.id}`}
                      type="button"
                      onClick={() => handleSelectSearchHit(hit)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-black text-slate-700">{hit.code}</span>
                        <span className="text-slate-400">{hit.title}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">
                          {hit.clauseNumber}
                        </span>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {renderHighlightedText(hit.excerpt, globalSearch)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !globalSearching ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  {STRINGS.noResults}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="font-bold text-slate-700">
                  {activeStandardMeta?.code || selectedStandard?.code || '--'}
                </span>
                <span>{STRINGS.totalChunks} {selectedStandard?.chunks.length || 0}</span>
                <span>{STRINGS.currentMatches} {matchingChunkCount}</span>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              {documentLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  {STRINGS.loading}
                </div>
              ) : visibleChunks.length > 0 ? (
                visibleChunks.map(chunk => (
                  <section
                    key={chunk.id}
                    id={`standard-chunk-${chunk.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {STRINGS.chunkLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{chunk.clauseNumber}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {renderHighlightedText(chunk.content, standardSearch)}
                    </div>
                  </section>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  {selectedStandard ? STRINGS.noResults : STRINGS.emptyDocument}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegulationsView;
