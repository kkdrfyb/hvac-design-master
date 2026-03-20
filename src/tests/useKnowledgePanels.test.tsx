import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useKnowledgePanels } from '../hooks/useKnowledgePanels';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useKnowledgePanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((path: string) => {
      if (path.includes('/knowledge/clauses')) {
        return Promise.resolve([
          { id: 'm2', code: 'GB 50016-2014', clauseNumber: '9.3.11', content: '防火阀设置' },
          { id: 'm4', code: 'GB 50019-2015', clauseNumber: '6.3.9', content: '事故通风排风口' },
        ]);
      }
      if (path.includes('/knowledge/errors')) {
        return Promise.resolve([
          { id: 'err1', title: '防火阀设置遗漏', category: '通风系统', description: '遗漏防火阀', solution: '补齐防火阀' },
          { id: 'err2', title: '冷凝水管坡度不足', category: '通用设计流程', description: '坡度不足', solution: '复核坡度' },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  it('initializes lists and supports clause filtering/paging', async () => {
    const { result } = renderHook(() => useKnowledgePanels({ isAdmin: false }));

    await waitFor(() => {
      expect(result.current.displayedClauses.length).toBeGreaterThan(0);
      expect(result.current.displayedErrors.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setClauseSearch('GB 50019');
    });

    expect(result.current.displayedClauses).toHaveLength(1);
    expect(result.current.displayedClauses[0].code).toContain('GB 50019');

    act(() => {
      result.current.setClauseSearch('');
      result.current.setDisplayCount(2);
    });

    await waitFor(() => {
      expect(result.current.displayedClauses.length).toBeLessThanOrEqual(2);
    });
  });

  it('supports common error search and random refresh', async () => {
    const { result } = renderHook(() => useKnowledgePanels({ isAdmin: false }));

    await waitFor(() => {
      expect(result.current.displayedErrors.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setErrorSearch('防火阀');
    });

    expect(result.current.displayedErrors).toHaveLength(1);
    expect(result.current.displayedErrors[0].title).toContain('防火阀');

    act(() => {
      result.current.setErrorSearch('');
      result.current.setErrorDisplayCount(1);
      result.current.refreshRandomErrors();
    });

    await waitFor(() => {
      expect(result.current.displayedErrors.length).toBeLessThanOrEqual(1);
    });
  });
});
