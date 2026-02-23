import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { api } from '../api';
import { DesignStage, SubmissionFile, SubmissionVersion, SubProject, TaskGroup, TaskItem } from '../types';

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
  updateCurrentSubProject: (updater: (sp: SubProject) => SubProject) => void;
}

export const useTaskOperations = ({
  activeStage,
  currentSub,
  currentMainId,
  currentSubId,
  updateCurrentSubProject,
}: UseTaskOperationsOptions) => {
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [addTaskParams, setAddTaskParams] = useState<AddTaskParams | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');

  const toggleTask = (id: string) => {
    if (activeStage !== currentSub.stage) return;
    updateCurrentSubProject(sp => ({
      ...sp,
      tasks: sp.tasks.map(task => (task.id === id ? { ...task, isCompleted: !task.isCompleted } : task)),
    }));
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
    updateCurrentSubProject(sp => ({
      ...sp,
      tasks: sp.tasks.filter(task => task.id !== taskId),
    }));
  };

  const handleTaskFileUpload = async (taskId: string, event: ChangeEvent<HTMLInputElement>) => {
    if (activeStage !== currentSub.stage) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const response = await api.uploadFiles(
        `/projects/${currentMainId}/subprojects/${currentSubId}/tasks/${taskId}/files`,
        files,
        { source: 'manual' }
      );
      updateCurrentSubProject(sp => ({
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
      }));
    } catch (err) {
      console.error('File upload failed', err);
      alert('文件上传失败，请稍后重试。');
    } finally {
      event.target.value = '';
    }
  };

  const handleDeleteVersion = async (taskId: string, version: string) => {
    if (activeStage !== currentSub.stage) return;
    try {
      const response = await api.delete(
        `/projects/${currentMainId}/subprojects/${currentSubId}/tasks/${taskId}/versions/${encodeURIComponent(version)}`
      );
      updateCurrentSubProject(sp => ({
        ...sp,
        tasks: sp.tasks.map(task => {
          if (task.id !== taskId) return task;
          if (response?.task?.versions && Array.isArray(response.task.versions)) {
            return { ...task, ...response.task, versions: response.task.versions };
          }
          return { ...task, versions: task.versions.filter(v => v.version !== version) };
        }),
      }));
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
        isCompleted: false,
        versions: [],
      };
      return {
        ...sp,
        tasks: [...sp.tasks, newTask],
      };
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
    handleDownloadFile,
    handleDeleteTask,
    handleTaskFileUpload,
    handleDeleteVersion,
  };
};
