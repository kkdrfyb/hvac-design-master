import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectSync } from '../hooks/useProjectSync';
import { MainProject, SubProject } from '../types';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
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
  processRecords: Array.isArray(sp?.processRecords) ? sp.processRecords : [],
  designSpecs: Array.isArray(sp?.designSpecs) ? sp.designSpecs : [],
});

const baseProjects: MainProject[] = [
  {
    id: 'mp1',
    name: '主项目A',
    code: 'M1',
    designSpecTemplates: [],
    subProjects: [
      {
        id: 'sp1',
        name: '子项1',
        code: 'S1',
        type: '附属工业厂房',
        stage: '初步设计',
        stageHistory: [],
        enabledCategoryIds: [],
        tasks: [],
        operationLogs: [],
        processRecords: [],
        designSpecs: [],
      },
    ],
  },
];

describe('useProjectSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates targeted subproject and persists updated main project', () => {
    const setProjects = vi.fn();
    const { result } = renderHook(() =>
      useProjectSync({
        currentMainId: 'mp1',
        currentSubId: 'sp1',
        setProjects,
        ensureValidSubProject: normalizeSubProject,
      })
    );

    act(() => {
      result.current.updateCurrentSubProject(sp => ({ ...sp, name: '子项1-更新后' }));
    });

    expect(setProjects).toHaveBeenCalledTimes(1);
    const updater = setProjects.mock.calls[0][0] as (projects: MainProject[]) => MainProject[];
    const nextProjects = updater(baseProjects);

    expect(nextProjects[0].subProjects[0].name).toBe('子项1-更新后');
    expect(api.post).toHaveBeenCalledWith('/projects', expect.objectContaining({ id: 'mp1' }));
  });
});
