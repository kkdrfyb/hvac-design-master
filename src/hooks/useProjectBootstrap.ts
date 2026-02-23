import { useEffect, useState } from 'react';
import { api } from '../api';
import { INITIAL_PROJECTS } from '../constants';
import { MainProject, SubProject } from '../types';

interface UseProjectBootstrapOptions {
  userId: number | string | null;
  ensureValidSubProject: (sp: Partial<SubProject> | any) => SubProject;
}

export const useProjectBootstrap = ({ userId, ensureValidSubProject }: UseProjectBootstrapOptions) => {
  const [projects, setProjects] = useState<MainProject[]>([]);
  const [currentMainId, setCurrentMainId] = useState('');
  const [currentSubId, setCurrentSubId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setCurrentMainId('');
      setCurrentSubId('');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    setProjectsLoading(true);
    api
      .get('/projects')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const validatedData = data.map(mainProject => ({
            ...mainProject,
            subProjects:
              Array.isArray(mainProject.subProjects) && mainProject.subProjects.length > 0
                ? mainProject.subProjects.map(ensureValidSubProject)
                : mainProject.id === 'mp1'
                  ? INITIAL_PROJECTS[0].subProjects.map(ensureValidSubProject)
                  : [],
          }));

          setProjects(validatedData);
          const firstMain = validatedData[0];
          setCurrentMainId(firstMain.id);
          if (firstMain.subProjects && firstMain.subProjects.length > 0) {
            setCurrentSubId(firstMain.subProjects[0].id);
          } else {
            setCurrentSubId('');
          }
        } else {
          setProjects(INITIAL_PROJECTS);
          setCurrentMainId(INITIAL_PROJECTS[0].id);
          setCurrentSubId(INITIAL_PROJECTS[0].subProjects[0].id);
        }
      })
      .catch(error => {
        console.error('Failed to fetch projects', error);
      })
      .finally(() => {
        setProjectsLoading(false);
      });
  }, [ensureValidSubProject, userId]);

  return {
    projects,
    setProjects,
    currentMainId,
    setCurrentMainId,
    currentSubId,
    setCurrentSubId,
    projectsLoading,
  };
};
