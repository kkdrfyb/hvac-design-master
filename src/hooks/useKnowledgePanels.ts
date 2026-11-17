import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { COMMON_ERRORS } from '../constants';
import { CommonError } from '../types';

const shuffleList = <T,>(items: T[]): T[] => [...items].sort(() => 0.5 - Math.random());

interface UseKnowledgePanelsOptions {
  isAdmin: boolean;
}

export const useKnowledgePanels = ({ isAdmin }: UseKnowledgePanelsOptions) => {
  const [errors, setErrors] = useState<CommonError[]>(COMMON_ERRORS);
  const [shuffledErrors, setShuffledErrors] = useState<CommonError[]>([]);
  const [errorSearch, setErrorSearch] = useState('');
  const [errorDisplayCount, setErrorDisplayCount] = useState(4);
  const [knowledgeError, setKnowledgeError] = useState('');

  const refreshRandomErrors = useCallback(() => {
    setShuffledErrors(shuffleList(errors));
  }, [errors]);

  const loadErrors = useCallback(async () => {
    try {
      const data = await api.get('/knowledge/errors');
      if (Array.isArray(data) && data.length > 0) {
        setErrors(
          data.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            description: item.description,
            solution: item.solution,
          }))
        );
      }
      setKnowledgeError('');
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : '常见问题加载失败');
    }
  }, []);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  useEffect(() => {
    refreshRandomErrors();
  }, [refreshRandomErrors]);

  const displayedErrors = useMemo(() => {
    if (errorSearch.trim()) {
      return errors.filter(
        error => error.title.includes(errorSearch) || error.description.includes(errorSearch)
      );
    }
    return shuffledErrors.slice(0, errorDisplayCount);
  }, [errorDisplayCount, errorSearch, errors, shuffledErrors]);

  const createError = async (payload: Omit<CommonError, 'id'>) => {
    if (!isAdmin) return;
    await api.post('/knowledge/errors', payload);
    await loadErrors();
  };

  const deleteError = async (id: string) => {
    if (!isAdmin) return;
    await api.delete(`/knowledge/errors/${id}`);
    await loadErrors();
  };

  return {
    errorSearch,
    setErrorSearch,
    errorDisplayCount,
    setErrorDisplayCount,
    displayedErrors,
    refreshRandomErrors,
    knowledgeError,
    isAdmin,
    createError,
    deleteError,
  };
};
