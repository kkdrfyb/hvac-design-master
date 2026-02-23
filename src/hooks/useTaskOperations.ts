import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { api } from '../api';
import { DesignStage, SubmissionFile, SubmissionVersion, SubProject, TaskGroup, TaskItem, TaskStatus } from '../types';

interface AddTaskParams {
  group: TaskGroup;
  category: string;
  categoryId: string;
}

interface UseTaskOperationsOptions {
  activeStage: DesignStage;
  currentSub: SubProject;
  currentMainId: string;
  currentSubId: string;
  actorName: string;
  updateCurrentSubProject: (updater: (sp: SubProject) => SubProject) => void;
}

export const useTaskOperations = ({
  activeStage,
  currentSub,
  currentMainId,
  currentSubId,
  actorName,
  updateCurrentSubProject,
}: UseTaskOperationsOptions) => {
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addTaskParams, setAddTaskParams] = useState<AddTaskParams | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [pendingUploads, setPendingUploads] = useState<Record<string, File[]>>({});

  const getErrorText = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const appendOperationLog = (
    sp: SubProject,
    action: string,
    targetType: 'stage' | 'task' | 'file' | 'comment',
    targetId: string,
    detail?: string
  ): SubProject => {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      actor: actorName,
      createdAt: new Date().toISOString(),
      targetType,
      targetId,
      detail,
    };
    return {
      ...sp,
      operationLogs: [entry, ...(sp.operationLogs || [])].slice(0, 300),
    };
  };

  const toggleTask = (id: string) => {
    if (activeStage !== currentSub.stage) return;
    updateCurrentSubProject(sp => ({
      ...appendOperationLog(sp, 'toggle_task_completed', 'task', id),
      tasks: sp.tasks.map(task => {
        if (task.id !== id) return task;
        return {
          ...task,
          status: task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED',
        };
      }),
    }));
  };

  const setTaskStatus = (id: string, status: TaskStatus) => {
    if (activeStage !== currentSub.stage) return;
    updateCurrentSubProject(sp => {
      const next = {
        ...sp,
        tasks: sp.tasks.map(task => {
          if (task.id !== id) return task;
          return {
            ...task,
            status,
            blockedReason: status === 'BLOCKED' ? (task.blockedReason || '') : undefined,
          };
        }),
      };
      return appendOperationLog(next, 'set_task_status', 'task', id, status);
    });
  };

  const setTaskBlockedReason = (id: string, blockedReason: string) => {
    if (activeStage !== currentSub.stage) return;
    updateCurrentSubProject(sp => ({
      ...sp,
      tasks: sp.tasks.map(task => {
        if (task.id !== id) return task;
        return {
          ...task,
          blockedReason,
        };
      }),
    }));
  };

  const addTaskComment = (taskId: string, content: string) => {
    if (activeStage !== currentSub.stage) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    updateCurrentSubProject(sp => {
      const next = {
        ...sp,
        tasks: sp.tasks.map(task => {
          if (task.id !== taskId) return task;
          const comment = {
            id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            content: trimmed,
            author: actorName,
            createdAt: new Date().toISOString(),
          };
          return {
            ...task,
            comments: [...(task.comments || []), comment],
          };
        }),
      };
      return appendOperationLog(next, 'add_task_comment', 'comment', taskId, trimmed.slice(0, 80));
    });
  };

  const handleDownloadFile = async (file: SubmissionFile) => {
    const targetPath = file.downloadPath || (file.id ? `/files/${file.id}` : '');
    if (!targetPath) return;
    try {
      const { blob, fileName } = await api.downloadFile(targetPath);
      const downloadName = fileName || file.name || 'download.bin';
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('File download failed', err);
      alert('文件下载失败，请稍后重试。');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (activeStage !== currentSub.stage) return;
    if (!confirm('确定删除此任务项吗？')) return;
    updateCurrentSubProject(sp => {
      const next = {
        ...sp,
        tasks: sp.tasks.filter(task => task.id !== taskId),
      };
      return appendOperationLog(next, 'delete_task', 'task', taskId);
    });
  };

  const applyTaskUpload = async (taskId: string, files: File[] | FileList) => {
    const response = await api.uploadFiles(
      `/projects/${currentMainId}/subprojects/${currentSubId}/tasks/${taskId}/files`,
      files,
      { source: 'manual' }
    );
    updateCurrentSubProject(sp => {
      const next = {
        ...sp,
        tasks: sp.tasks.map(task => {
          if (task.id !== taskId) return task;
          if (response?.task?.versions && Array.isArray(response.task.versions)) {
            return { ...task, ...response.task, versions: response.task.versions };
          }
          if (response?.version) {
            return { ...task, versions: [response.version as SubmissionVersion, ...task.versions] };
          }
          return task;
        }),
      };
      return appendOperationLog(next, 'upload_task_file', 'file', taskId);
    });
  };

  const handleTaskFileUpload = async (taskId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (activeStage !== currentSub.stage) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    try {
      await applyTaskUpload(taskId, fileArray);
      setUploadErrors(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setPendingUploads(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (err) {
      console.error('File upload failed', err);
      setUploadErrors(prev => ({
        ...prev,
        [taskId]: getErrorText(err, '文件上传失败，请稍后重试。'),
      }));
      setPendingUploads(prev => ({
        ...prev,
        [taskId]: fileArray,
      }));
    } finally {
      event.target.value = '';
    }
  };

  const retryTaskUpload = async (taskId: string) => {
    if (activeStage !== currentSub.stage) return;
    const files = pendingUploads[taskId];
    if (!files || files.length === 0) return;
    try {
      await applyTaskUpload(taskId, files);
      setUploadErrors(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setPendingUploads(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (err) {
      console.error('Retry file upload failed', err);
      setUploadErrors(prev => ({
        ...prev,
        [taskId]: getErrorText(err, '重试上传失败，请稍后再试。'),
      }));
    }
  };

  const handleDeleteVersion = async (taskId: string, version: string) => {
    if (activeStage !== currentSub.stage) return;
    try {
      const response = await api.delete(
        `/projects/${currentMainId}/subprojects/${currentSubId}/tasks/${taskId}/versions/${encodeURIComponent(version)}`
      );
      updateCurrentSubProject(sp => {
        const next = {
          ...sp,
          tasks: sp.tasks.map(task => {
            if (task.id !== taskId) return task;
            if (response?.task?.versions && Array.isArray(response.task.versions)) {
              return { ...task, ...response.task, versions: response.task.versions };
            }
            return { ...task, versions: task.versions.filter(v => v.version !== version) };
          }),
        };
        return appendOperationLog(next, 'delete_task_version', 'file', taskId, version);
      });
    } catch (err) {
      console.error('Delete version failed', err);
      alert('删除版本失败，请稍后重试。');
    }
  };

  const openAddTaskModal = (group: TaskGroup, category: string, categoryId: string) => {
    setAddTaskParams({ group, category, categoryId });
    setNewTaskContent('');
    setAddTaskModalOpen(true);
  };

  const closeAddTaskModal = () => {
    setAddTaskModalOpen(false);
  };

  const handleConfirmAddTask = () => {
    if (!newTaskContent.trim() || !addTaskParams) return;

    const { group, category, categoryId } = addTaskParams;
    updateCurrentSubProject(sp => {
      const newTask: TaskItem = {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        categoryId,
        category,
        group,
        stage: currentSub.stage,
        content: newTaskContent,
        status: 'TODO',
        versions: [],
        comments: [],
      };
      const next = {
        ...sp,
        tasks: [...sp.tasks, newTask],
      };
      return appendOperationLog(next, 'add_task', 'task', newTask.id, newTask.content.slice(0, 80));
    });

    setAddTaskModalOpen(false);
    setAddTaskParams(null);
  };

  return {
    addTaskModalOpen,
    addTaskCategory: addTaskParams?.category,
    newTaskContent,
    setNewTaskContent,
    openAddTaskModal,
    closeAddTaskModal,
    handleConfirmAddTask,
    toggleTask,
    setTaskStatus,
    setTaskBlockedReason,
    addTaskComment,
    handleDownloadFile,
    handleDeleteTask,
    handleTaskFileUpload,
    retryTaskUpload,
    uploadErrors,
    handleDeleteVersion,
  };
};
