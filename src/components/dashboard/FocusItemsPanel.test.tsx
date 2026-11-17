import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FocusItemsPanel from './FocusItemsPanel';
import { FocusItem } from '../../types';

const baseItem: FocusItem = {
  id: 'focus-1',
  stage: '方案设计',
  kind: 'INPUT',
  content: '检查主要输入条件',
  completed: false,
  createdAt: '2026-04-03T10:00:00.000Z',
  updatedAt: '2026-04-03T10:00:00.000Z',
};

describe('FocusItemsPanel', () => {
  it('filters by stage and kind, and supports create update complete delete', () => {
    const onCreateFocusItem = vi.fn(() => ({
      ...baseItem,
      id: 'focus-new',
      content: '',
    }));
    const onUpdateFocusItem = vi.fn();
    const onDeleteFocusItem = vi.fn();

    render(
      <FocusItemsPanel
        activeStage="方案设计"
        activeKind="INPUT"
        activeKindLabel="设计输入"
        focusItems={[
          baseItem,
          { ...baseItem, id: 'focus-2', kind: 'CALCULATION', content: '不应显示' },
          { ...baseItem, id: 'focus-3', stage: '初步设计', content: '也不应显示' },
        ]}
        theme="blue"
        onCreateFocusItem={onCreateFocusItem}
        onUpdateFocusItem={onUpdateFocusItem}
        onDeleteFocusItem={onDeleteFocusItem}
      />
    );

    expect(screen.getByDisplayValue('检查主要输入条件')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('不应显示')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('也不应显示')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '更新后的重点' },
    });
    expect(onUpdateFocusItem).toHaveBeenCalledWith('focus-1', {
      content: '更新后的重点',
    });

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onUpdateFocusItem).toHaveBeenCalledWith('focus-1', { completed: true });

    fireEvent.click(screen.getByRole('button', { name: /删除/i }));
    expect(onDeleteFocusItem).toHaveBeenCalledWith('focus-1');

    fireEvent.click(screen.getByRole('button', { name: /新增重点/i }));
    expect(onCreateFocusItem).toHaveBeenCalledWith('方案设计', 'INPUT');
  });
});
