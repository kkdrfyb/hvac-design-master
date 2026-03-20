import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { COMMON_ERRORS, MANDATORY_CLAUSES } from '../constants';
import { CommonError, MandatoryClause } from '../types';

const shuffleList = <T,>(items: T[]): T[] => [...items].sort(() => 0.5 - Math.random());

interface UseKnowledgePanelsOptions {
  isAdmin: boolean;
}

export const useKnowledgePanels = ({ isAdmin }: UseKnowledgePanelsOptions) => {
  const [mandatoryClauses, setMandatoryClauses] = useState<MandatoryClause[]>(MANDATORY_CLAUSES);
  const [shuffledClauses, setShuffledClauses] = useState<MandatoryClause[]>([]);
  const [clauseSearch, setClauseSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(4);

  const [errors, setErrors] = useState<CommonError[]>(COMMON_ERRORS);
  const [shuffledErrors, setShuffledErrors] = useState<CommonError[]>([]);
  const [errorSearch, setErrorSearch] = useState('');
  const [errorDisplayCount, setErrorDisplayCount] = useState(4);

  const [knowledgeError, setKnowledgeError] = useState('');

  const refreshRandomClauses = useCallback(() => {
    setShuffledClauses(shuffleList(mandatoryClauses));
  }, [mandatoryClauses]);

  const refreshRandomErrors = useCallback(() => {
    setShuffledErrors(shuffleList(errors));
  }, [errors]);

  const loadClauses = useCallback(async () => {
    try {
      const data = await api.get('/knowledge/clauses');
      if (Array.isArray(data) && data.length > 0) {
        setMandatoryClauses(
          data.map(item => ({
            id: item.id,
            code: item.code,
            clauseNumber: item.clauseNumber,
            content: item.content,
          }))
        );
      }
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : '规范条文加载失败');
    }
  }, []);

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
    } catch (err) {
      setKnowledgeError(err instanceof Error ? err.message : '常见问题加载失败');
    }
  }, []);

  useEffect(() => {
    loadClauses();
    loadErrors();
  }, [loadClauses, loadErrors]);

  useEffect(() => {
    refreshRandomClauses();
  }, [refreshRandomClauses]);

  useEffect(() => {
    refreshRandomErrors();
  }, [refreshRandomErrors]);

  const displayedClauses = useMemo(() => {
    if (clauseSearch.trim()) {
      return mandatoryClauses.filter(clause => clause.content.includes(clauseSearch) || clause.code.includes(clauseSearch));
    }
    return shuffledClauses.slice(0, displayCount);
  }, [clauseSearch, displayCount, mandatoryClauses, shuffledClauses]);

  const displayedErrors = useMemo(() => {
    if (errorSearch.trim()) {
      return errors.filter(error => error.title.includes(errorSearch) || error.description.includes(errorSearch));
    }
    return shuffledErrors.slice(0, errorDisplayCount);
  }, [errorDisplayCount, errorSearch, errors, shuffledErrors]);

  const createClause = async (payload: Omit<MandatoryClause, 'id'>) => {
    if (!isAdmin) return;
    await api.post('/knowledge/clauses', payload);
    await loadClauses();
  };

  const deleteClause = async (id: string) => {
    if (!isAdmin) return;
    await api.delete(`/knowledge/clauses/${id}`);
    await loadClauses();
  };

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
    clauseSearch,
    setClauseSearch,
    displayCount,
    setDisplayCount,
    displayedClauses,
    refreshRandomClauses,
    errorSearch,
    setErrorSearch,
    errorDisplayCount,
    setErrorDisplayCount,
    displayedErrors,
    refreshRandomErrors,
    knowledgeError,
    isAdmin,
    createClause,
    deleteClause,
    createError,
    deleteError,
  };
};
