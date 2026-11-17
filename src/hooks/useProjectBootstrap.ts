import { useEffect, useState } from 'react';
import { api } from '../api';
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
          const validatedData = data
            .map(mainProject => ({
              ...mainProject,
              designSpecTemplates: Array.isArray(mainProject.designSpecTemplates)
                ? mainProject.designSpecTemplates
                : [],
              subProjects:
                Array.isArray(mainProject.subProjects) && mainProject.subProjects.length > 0
                  ? mainProject.subProjects.map(subProject => ({
                      ...ensureValidSubProject(subProject),
                      canEdit: !!subProject.canEdit,
                    }))
                  : [],
            }))
            .map(mainProject => ({
              ...mainProject,
              canEdit:
                !!mainProject.canEdit ||
                (mainProject.subProjects || []).some(subProject => !!subProject.canEdit),
            }));

          setProjects(validatedData);
          const firstEditable = validatedData
            .flatMap(project =>
              (project.subProjects || []).map(subProject => ({
                mainId: project.id,
                subId: subProject.id,
                canEdit: !!subProject.canEdit,
              }))
            )
            .find(item => item.canEdit);

          if (firstEditable) {
            setCurrentMainId(firstEditable.mainId);
            setCurrentSubId(firstEditable.subId);
          } else {
            const firstMain = validatedData[0];
            setCurrentMainId(firstMain?.id || '');
            if (firstMain?.subProjects && firstMain.subProjects.length > 0) {
              setCurrentSubId(firstMain.subProjects[0].id);
            } else {
              setCurrentSubId('');
            }
          }
        } else {
          setProjects([]);
          setCurrentMainId('');
          setCurrentSubId('');
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
