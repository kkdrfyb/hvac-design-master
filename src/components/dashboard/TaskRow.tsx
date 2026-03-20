import React, { useRef } from 'react';
import { SubmissionFile, TaskItem, TaskStatus, ThemeColor } from '../../types';

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
  onChangeStatus: (status: TaskStatus) => void;
  onChangeBlockedReason: (blockedReason: string) => void;
  onAddComment: (content: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetryUpload: () => void;
  uploadError?: string;
  onDownloadFile: (file: SubmissionFile) => void;
  onDeleteVersion: (taskId: string, version: string) => void;
  onDeleteTask: () => void;
  theme: ThemeColor;
  readOnly?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onToggle,
  onChangeStatus,
  onChangeBlockedReason,
  onAddComment,
  onUpload,
  onRetryUpload,
  uploadError,
  onDownloadFile,
  onDeleteVersion,
  onDeleteTask,
  theme,
  readOnly,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentDraft, setCommentDraft] = React.useState('');
  const isCompleted = task.status === 'COMPLETED';
  const statusClass: Record<TaskStatus, string> = {
    TODO: 'bg-slate-100 text-slate-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    BLOCKED: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div
      className={`p-3 border-l-4 ${isCompleted ? `border-${theme}-400 bg-slate-50` : 'border-slate-300 bg-white'} shadow-sm mb-2 rounded-r transition-all hover:shadow group ${readOnly ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={onToggle}
          disabled={readOnly}
          className={`mt-1 w-4 h-4 text-${theme}-600 rounded focus:ring-${theme}-500 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
        <div className="flex-1">
          <div className={`${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'} text-sm`}>
            <HighlightedText text={task.content} theme={theme} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusClass[task.status]}`}>{task.status}</span>
            {!readOnly && (
              <select
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                value={task.status}
                onChange={e => onChangeStatus(e.target.value as TaskStatus)}
              >
                <option value="TODO">未开始</option>
                <option value="IN_PROGRESS">进行中</option>
                <option value="BLOCKED">阻塞</option>
                <option value="COMPLETED">完成</option>
              </select>
            )}
          </div>
          {task.status === 'BLOCKED' && (
            <div className="mt-2">
              <input
                type="text"
                disabled={readOnly}
                value={task.blockedReason || ''}
                onChange={e => onChangeBlockedReason(e.target.value)}
                placeholder="请输入阻塞原因"
                className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-amber-50"
              />
            </div>
          )}
          {uploadError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
              <span className="flex-1">{uploadError}</span>
              {!readOnly && (
                <button type="button" onClick={onRetryUpload} className="font-bold underline">
                  重试
                </button>
              )}
            </div>
          )}

          <div className="mt-2 space-y-2">
            {task.comments?.length > 0 && (
              <div className="space-y-1">
                {task.comments.slice(-3).map(comment => (
                  <div key={comment.id} className="text-xs bg-slate-50 border border-slate-100 rounded px-2 py-1">
                    <span className="font-bold text-slate-700">{comment.author}</span>
                    <span className="mx-1 text-slate-400">·</span>
                    <span className="text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                    <div className="text-slate-600 mt-0.5">{comment.content}</div>
                  </div>
                ))}
              </div>
            )}
            {!readOnly && (
              <div className="flex gap-2">
                <input
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="添加评论..."
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!commentDraft.trim()) return;
                    onAddComment(commentDraft);
                    setCommentDraft('');
                  }}
                  className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                >
                  评论
                </button>
              </div>
            )}
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
