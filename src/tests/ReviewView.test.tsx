import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewView from '../components/review/ReviewView';
import { ReviewRecord } from '../types';

describe('ReviewView', () => {
  it('creates a review record with the closed-loop fields', () => {
    const onCreate = vi.fn();
    render(
      <ReviewView
        records={[]}
        stages={['方案设计', '施工图设计']}
        currentStage="施工图设计"
        actorName="tester"
        readOnly={false}
        onCreate={onCreate}
        onUpdate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('+ 发起校审'));
    const inputs = document.querySelectorAll('input, textarea');
    fireEvent.change(inputs[0], { target: { value: '通风布置图 B版' } });
    fireEvent.change(inputs[1], { target: { value: 'tester' } });
    fireEvent.change(inputs[2], { target: { value: 'designer' } });
    fireEvent.change(inputs[3], { target: { value: '风管穿墙处缺少防火阀标注' } });
    fireEvent.change(inputs[4], { target: { value: 'GB 50016 相关条款' } });
    fireEvent.click(screen.getByText('保存校审意见'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const record = onCreate.mock.calls[0][0] as ReviewRecord;
    expect(record.target).toBe('通风布置图 B版');
    expect(record.issue).toContain('缺少防火阀标注');
    expect(record.standardRef).toBe('GB 50016 相关条款');
    expect(record.status).toBe('待整改');
    expect(record.history[0].action).toBe('发起校审');
  });

  it('submits correction and closes review through the review actions', () => {
    const onUpdate = vi.fn();
    const record: ReviewRecord = {
      id: 'r1',
      stage: '施工图设计',
      kind: '互校',
      target: '系统流程图 A版',
      reviewer: 'reviewer',
      issue: '设备编号不一致',
      standardRef: '',
      assignee: 'designer',
      correction: '',
      reviewComment: '',
      status: '待整改',
      createdAt: '2026-11-17T10:00:00.000Z',
      createdBy: 'reviewer',
      updatedAt: '2026-11-17T10:00:00.000Z',
      history: [],
    };
    render(
      <ReviewView
        records={[record]}
        stages={['施工图设计']}
        currentStage="施工图设计"
        actorName="designer"
        readOnly={false}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
      />
    );

    const correction = screen.getByPlaceholderText('填写整改回复');
    fireEvent.change(correction, { target: { value: '已统一设备编号' } });
    fireEvent.click(screen.getByText('提交整改'));
    expect(onUpdate.mock.calls[0][1]).toMatchObject({
      correction: '已统一设备编号',
      status: '待复核',
    });

    onUpdate.mockClear();
    const closed: ReviewRecord = { ...record, status: '待复核', correction: '已统一设备编号' };
    render(
      <ReviewView
        records={[closed]}
        stages={['施工图设计']}
        currentStage="施工图设计"
        actorName="reviewer"
        readOnly={false}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
      />
    );
    fireEvent.click(screen.getByText('复核通过'));
    expect(onUpdate.mock.calls[0][1]).toMatchObject({ status: '已关闭' });
  });

  it('blocks edits when project is read-only', () => {
    render(
      <ReviewView
        records={[]}
        stages={[]}
        currentStage="方案设计"
        actorName="tester"
        readOnly
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
      />
    );
    expect(screen.queryByText('+ 发起校审')).toBeNull();
    expect(screen.getByText(/当前项目只读/)).toBeTruthy();
  });
});
