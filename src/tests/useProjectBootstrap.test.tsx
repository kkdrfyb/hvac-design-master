import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectBootstrap } from '../hooks/useProjectBootstrap';
import { INITIAL_PROJECTS } from '../constants';
import { SubProject } from '../types';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const normalizeSubProject = (sp: Partial<SubProject> | any): SubProject => ({
  id: sp?.id || 'sp_gen',
  name: sp?.name || '未命名子项',
  code: sp?.code || '0000',
  type: sp?.type || '其他',
  stage: sp?.stage || '方案设计',
  stageHistory: Array.isArray(sp?.stageHistory) ? sp.stageHistory : [],
  enabledCategoryIds: Array.isArray(sp?.enabledCategoryIds) ? sp.enabledCategoryIds : [],
  tasks: Array.isArray(sp?.tasks) ? sp.tasks : [],
  operationLogs: Array.isArray(sp?.operationLogs) ? sp.operationLogs : [],
  designSpecs: Array.isArray(sp?.designSpecs) ? sp.designSpecs : [],
});

describe('useProjectBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to INITIAL_PROJECTS when backend returns empty list', async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useProjectBootstrap({
        userId: 1,
        ensureValidSubProject: normalizeSubProject,
      })
    );

    await waitFor(() => {
      expect(result.current.projectsLoading).toBe(false);
      expect(result.current.projects.length).toBe(INITIAL_PROJECTS.length);
      expect(result.current.currentMainId).toBe(INITIAL_PROJECTS[0].id);
      expect(result.current.currentSubId).toBe(INITIAL_PROJECTS[0].subProjects[0].id);
    });

    expect(api.get).toHaveBeenCalledWith('/projects');
  });

  it('resets projects and selected ids after logout', async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ user }) =>
        useProjectBootstrap({
          userId: user,
          ensureValidSubProject: normalizeSubProject,
        }),
      { initialProps: { user: 1 as number | null } }
    );

    await waitFor(() => {
      expect(result.current.projects.length).toBeGreaterThan(0);
    });

    rerender({ user: null });

    await waitFor(() => {
      expect(result.current.projects).toEqual([]);
      expect(result.current.currentMainId).toBe('');
      expect(result.current.currentSubId).toBe('');
    });
  });

  it('does not refetch when rerender keeps same userId', async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ userId }) =>
        useProjectBootstrap({
          userId,
          ensureValidSubProject: normalizeSubProject,
        }),
      { initialProps: { userId: 1 as number | null } }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    rerender({ userId: 1 });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });
});
