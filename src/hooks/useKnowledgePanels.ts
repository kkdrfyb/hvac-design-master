import { useCallback, useEffect, useMemo, useState } from 'react';
import { COMMON_ERRORS, MANDATORY_CLAUSES } from '../constants';
import { CommonError, MandatoryClause } from '../types';

const shuffleList = <T,>(items: T[]): T[] => [...items].sort(() => 0.5 - Math.random());

export const useKnowledgePanels = () => {
  const [mandatoryClauses] = useState<MandatoryClause[]>(MANDATORY_CLAUSES);
  const [shuffledClauses, setShuffledClauses] = useState<MandatoryClause[]>([]);
  const [clauseSearch, setClauseSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(4);

  const [errors] = useState<CommonError[]>(COMMON_ERRORS);
  const [shuffledErrors, setShuffledErrors] = useState<CommonError[]>([]);
  const [errorSearch, setErrorSearch] = useState('');
  const [errorDisplayCount, setErrorDisplayCount] = useState(4);

  const refreshRandomClauses = useCallback(() => {
    setShuffledClauses(shuffleList(mandatoryClauses));
  }, [mandatoryClauses]);

  const refreshRandomErrors = useCallback(() => {
    setShuffledErrors(shuffleList(errors));
  }, [errors]);

  useEffect(() => {
    refreshRandomClauses();
    refreshRandomErrors();
  }, [refreshRandomClauses, refreshRandomErrors]);

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
  };
};
