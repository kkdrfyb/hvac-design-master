import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATEGORIES } from '../constants';
import { useProjectCreation } from '../hooks/useProjectCreation';
import { MainProject, SubProject } from '../types';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
  },
}));

const baseSubProject: SubProject = {
  id: 'sp1',
  name: '子项1',
  code: 'S1',
  type: '附属工业厂房',
  stage: '初步设计',
  stageHistory: [],
  enabledCategoryIds: TEMPLATE_CATEGORIES['附属工业厂房']['初步设计'].map(category => category.id),
  tasks: [],
  operationLogs: [],
};

const baseProjects: MainProject[] = [
  {
    id: 'mp1',
    name: '主项目A',
    code: 'M1',
    subProjects: [baseSubProject],
  },
];

describe('useProjectCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens/closes modal and updates template selection', () => {
    const setProjects = vi.fn();
    const setCurrentMainId = vi.fn();
    const setCurrentSubId = vi.fn();

    const { result } = renderHook(() =>
      useProjectCreation({
        projects: baseProjects,
        setProjects,
        setCurrentMainId,
        setCurrentSubId,
      })
    );

    expect(result.current.showNewProjectModal).toBe(false);

    act(() => {
      result.current.openNewProjectModal();
    });
    expect(result.current.showNewProjectModal).toBe(true);

    act(() => {
      result.current.handleTemplateSelectionChange('核岛厂房', '施工图设计');
    });
    expect(result.current.newProjectData.type).toBe('核岛厂房');
    expect(result.current.newProjectData.stage).toBe('施工图设计');
    expect(result.current.newProjectData.enabledCategoryIds).toEqual(
      TEMPLATE_CATEGORIES['核岛厂房']['施工图设计'].map(category => category.id)
    );

    act(() => {
      result.current.closeNewProjectModal();
    });
    expect(result.current.showNewProjectModal).toBe(false);
  });

  it('creates subproject under existing main project and persists', async () => {
    const setProjects = vi.fn();
    const setCurrentMainId = vi.fn();
    const setCurrentSubId = vi.fn();

    const { result } = renderHook(() =>
      useProjectCreation({
        projects: baseProjects,
        setProjects,
        setCurrentMainId,
        setCurrentSubId,
      })
    );

    act(() => {
      result.current.setNewProjectData({
        ...result.current.newProjectData,
        mainName: '主项目A',
        mainCode: 'M1',
        subName: '新增子项',
        subCode: 'S2',
      });
    });

    await act(async () => {
      result.current.handleCreateProject();
    });

    expect(setProjects).toHaveBeenCalledTimes(1);
    const updatedProjects = setProjects.mock.calls[0][0] as MainProject[];
    expect(updatedProjects).toHaveLength(1);
    expect(updatedProjects[0].id).toBe('mp1');
    expect(updatedProjects[0].subProjects).toHaveLength(2);
    expect(updatedProjects[0].subProjects[1].name).toBe('新增子项');
    expect(updatedProjects[0].subProjects[1].id).toMatch(/^sp_/);

    expect(setCurrentMainId).toHaveBeenCalledWith('mp1');
    expect(setCurrentSubId).toHaveBeenCalledWith(expect.stringMatching(/^sp_/));
    expect(api.post).toHaveBeenCalledWith('/projects', expect.objectContaining({ id: 'mp1' }));
  });
});
