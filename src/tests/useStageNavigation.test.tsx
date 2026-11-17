import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStageNavigation } from '../hooks/useStageNavigation';
import { SubProject } from '../types';

const baseSubProject: SubProject = {
  id: 'sp1',
  name: '子项1',
  code: 'S1',
  type: '附属工业厂房',
  stage: '初步设计',
  stageHistory: [],
  enabledCategoryIds: ['aux-interface', 'aux-risk', 'aux-deliver'],
  tasks: [
    {
      id: 'task1',
      categoryId: 'aux-interface',
      category: '多专业接口',
      group: 'INTERFACE',
      stage: '初步设计',
      content: '其他专业关键条件是否齐备（工艺条件/电气防爆分区/安全条件）',
      status: 'TODO',
      versions: [],
      comments: [],
    },
  ],
  operationLogs: [],
  processRecords: [],
  designSpecs: [],
};

describe('useStageNavigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resets selected category when stage changes', async () => {
    const updateCurrentSubProject = vi.fn();
    const { result } = renderHook(() =>
      useStageNavigation({
        currentSub: baseSubProject,
        actorName: 'tester',
        updateCurrentSubProject,
      })
    );

    act(() => {
      result.current.onSelectCategory('aux-risk');
    });
    expect(result.current.selectedCategoryId).toBe('aux-risk');

    act(() => {
      result.current.onChangeStage('施工图设计');
    });

    await waitFor(() => {
      expect(result.current.selectedCategoryId).toBe('overview');
    });
  });

  it('advances stage after confirmation and updates subproject via updater', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    const updateCurrentSubProject = vi.fn();

    const { result } = renderHook(() =>
      useStageNavigation({
        currentSub: baseSubProject,
        actorName: 'tester',
        updateCurrentSubProject,
      })
    );

    act(() => {
      result.current.handleStageAdvance();
    });

    expect(updateCurrentSubProject).toHaveBeenCalledTimes(1);
    const updater = updateCurrentSubProject.mock.calls[0][0] as (sp: SubProject) => SubProject;
    const updated = updater(baseSubProject);

    expect(updated.stage).toBe('施工图设计');
    expect(updated.stageHistory).toContain('初步设计');
    expect(updated.tasks.some(task => task.stage === '施工图设计')).toBe(true);
    expect(updated.operationLogs[0]?.action).toBe('阶段切换');
    expect(updated.operationLogs[0]?.actor).toBe('tester');
    expect(updated.operationLogs[0]?.detail).toBe('从 初步设计 切换到 施工图设计');
  });
});
