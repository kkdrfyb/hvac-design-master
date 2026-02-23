import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useKnowledgePanels } from '../hooks/useKnowledgePanels';

describe('useKnowledgePanels', () => {
  it('initializes lists and supports clause filtering/paging', async () => {
    const { result } = renderHook(() => useKnowledgePanels());

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
    const { result } = renderHook(() => useKnowledgePanels());

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
