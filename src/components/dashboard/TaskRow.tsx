import React, { useRef } from 'react';
import { SubmissionFile, TaskItem, ThemeColor } from '../../types';

const HighlightedText: React.FC<{ text: string; theme: ThemeColor }> = ({ text, theme }) => {
  const keywords = ['温度', '压力', '阀', '排烟', '通风', '供暖', '设计', '计算', '规范', '防火'];
  const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'g'));

  return (
    <span>
      {parts.map((part, i) =>
        keywords.includes(part) ? (
          <span key={i} className={`font-bold text-${theme}-600`}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface TaskRowProps {
  task: TaskItem;
  onToggle: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadFile: (file: SubmissionFile) => void;
  onDeleteVersion: (taskId: string, version: string) => void;
  onDeleteTask: () => void;
  theme: ThemeColor;
  readOnly?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onToggle,
  onUpload,
  onDownloadFile,
  onDeleteVersion,
  onDeleteTask,
  theme,
  readOnly,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`p-3 border-l-4 ${task.isCompleted ? `border-${theme}-400 bg-slate-50` : 'border-slate-300 bg-white'} shadow-sm mb-2 rounded-r transition-all hover:shadow group ${readOnly ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={onToggle}
          disabled={readOnly}
          className={`mt-1 w-4 h-4 text-${theme}-600 rounded focus:ring-${theme}-500 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
        <div className="flex-1">
          <div className={`${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'} text-sm`}>
            <HighlightedText text={task.content} theme={theme} />
          </div>

          {task.versions.length > 0 && (
            <div className="mt-2 space-y-1">
              {task.versions.map(v => (
                <div
                  key={v.version}
                  className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-100 p-1 rounded w-fit"
                >
                  <span className={`font-bold bg-${theme}-100 text-${theme}-700 px-1 rounded`}>Ver {v.version}</span>
                  <span>{v.date}</span>
                  <span className="text-slate-400">|</span>
                  {v.files.map((f, i) => (
                    <button
                      key={f.id || `${f.name}-${i}`}
                      type="button"
                      onClick={() => onDownloadFile(f)}
                      className="underline decoration-slate-300 hover:text-slate-700"
                      title={f.name}
                    >
                      {f.name}
                    </button>
                  ))}
                  {!readOnly && (
                    <button
                      onClick={() => onDeleteVersion(task.id, v.version)}
                      className="text-red-400 hover:text-red-600 ml-2 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`text-slate-400 hover:text-${theme}-600 p-1`}
              title="上传文件"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={onUpload} multiple />

            <button onClick={onDeleteTask} className="text-slate-400 hover:text-red-500 p-1" title="删除任务">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskRow;
