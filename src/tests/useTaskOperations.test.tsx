import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskOperations } from '../hooks/useTaskOperations';
import { SubProject } from '../types';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    delete: vi.fn().mockResolvedValue({ task: { versions: [] } }),
    uploadFiles: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

const baseSubProject: SubProject = {
  id: 'sp1',
  name: '子项1',
  code: 'S1',
  type: '附属工业厂房',
  stage: '初步设计',
  stageHistory: [],
  enabledCategoryIds: ['aux-interface'],
  tasks: [
    {
      id: 'task1',
      categoryId: 'aux-interface',
      category: '多专业接口',
      group: 'INTERFACE',
      stage: '初步设计',
      content: '示例任务',
      isCompleted: false,
      versions: [{ version: 'A', date: '2026-02-14', files: [] }],
    },
  ],
};

describe('useTaskOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles task completion through updater', () => {
    const updateCurrentSubProject = vi.fn();
    const { result } = renderHook(() =>
      useTaskOperations({
        activeStage: '初步设计',
        currentSub: baseSubProject,
        currentMainId: 'mp1',
        currentSubId: 'sp1',
        updateCurrentSubProject,
      })
    );

    act(() => {
      result.current.toggleTask('task1');
    });

    expect(updateCurrentSubProject).toHaveBeenCalledTimes(1);
    const updater = updateCurrentSubProject.mock.calls[0][0] as (sp: SubProject) => SubProject;
    const updated = updater(baseSubProject);
    expect(updated.tasks[0].isCompleted).toBe(true);
  });

  it('opens add-task modal and confirms task creation', () => {
    const updateCurrentSubProject = vi.fn();
    const { result } = renderHook(() =>
      useTaskOperations({
        activeStage: '初步设计',
        currentSub: baseSubProject,
        currentMainId: 'mp1',
        currentSubId: 'sp1',
        updateCurrentSubProject,
      })
    );

    act(() => {
      result.current.openAddTaskModal('RISK', '安全与风险控制', 'aux-risk');
    });

    expect(result.current.addTaskModalOpen).toBe(true);
    expect(result.current.addTaskCategory).toBe('安全与风险控制');

    act(() => {
      result.current.setNewTaskContent('新增风险任务');
    });

    act(() => {
      result.current.handleConfirmAddTask();
    });

    expect(updateCurrentSubProject).toHaveBeenCalledTimes(1);
    const updater = updateCurrentSubProject.mock.calls[0][0] as (sp: SubProject) => SubProject;
    const updated = updater(baseSubProject);
    expect(updated.tasks).toHaveLength(2);
    expect(updated.tasks[1].content).toBe('新增风险任务');
    expect(updated.tasks[1].categoryId).toBe('aux-risk');
  });

  it('deletes version through API and applies updater response', async () => {
    const updateCurrentSubProject = vi.fn();
    const { result } = renderHook(() =>
      useTaskOperations({
        activeStage: '初步设计',
        currentSub: baseSubProject,
        currentMainId: 'mp1',
        currentSubId: 'sp1',
        updateCurrentSubProject,
      })
    );

    await act(async () => {
      await result.current.handleDeleteVersion('task1', 'A');
    });

    expect(api.delete).toHaveBeenCalledWith('/projects/mp1/subprojects/sp1/tasks/task1/versions/A');
    expect(updateCurrentSubProject).toHaveBeenCalledTimes(1);
    const updater = updateCurrentSubProject.mock.calls[0][0] as (sp: SubProject) => SubProject;
    const updated = updater(baseSubProject);
    expect(updated.tasks[0].versions).toEqual([]);
  });
});
