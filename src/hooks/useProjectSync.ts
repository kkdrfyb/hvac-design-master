import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api } from '../api';
import { MainProject, SubProject } from '../types';

interface UseProjectSyncOptions {
  currentMainId: string;
  currentSubId: string;
  canEditCurrentProject?: boolean;
  setProjects: Dispatch<SetStateAction<MainProject[]>>;
  ensureValidSubProject: (sp: Partial<SubProject> | any) => SubProject;
}

export const useProjectSync = ({
  currentMainId,
  currentSubId,
  canEditCurrentProject = true,
  setProjects,
  ensureValidSubProject,
}: UseProjectSyncOptions) => {
  const updateCurrentSubProject = useCallback(
    (updater: (sp: SubProject) => SubProject) => {
      if (!canEditCurrentProject) return;
      setProjects(prevProjects => {
        const nextProjects = prevProjects.map(mainProject => {
          if (mainProject.id === currentMainId) {
            return {
              ...mainProject,
              subProjects: mainProject.subProjects.map(subProject =>
                subProject.id === currentSubId
                  ? ensureValidSubProject(updater(ensureValidSubProject(subProject)))
                  : subProject
              ),
            };
          }
          return mainProject;
        });

        const updatedMain = nextProjects.find(project => project.id === currentMainId);
        if (updatedMain) {
          api.post('/projects', updatedMain).catch(error => console.error('Auto-save failed', error));
        }

        return nextProjects;
      });
    },
    [canEditCurrentProject, currentMainId, currentSubId, ensureValidSubProject, setProjects]
  );

  return { updateCurrentSubProject };
};
