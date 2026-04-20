// src/hooks/useFirestoreQuery.js
// Custom hook for Firestore data fetching with loading/error states

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for fetching data from Firestore with loading/error states
 * Usage:
 * const { data, loading, error } = useFirestoreQuery(
 *   () => getCourses({ sectorId: '123' }),
 *   [sectorId]  // dependencies
 * );
 */
export const useFirestoreQuery = (queryFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Hook for single document fetching
 */
export const useFirestoreDoc = (docFn, dependencies = []) => {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await docFn();
        setDoc(result);
      } catch (err) {
        setError(err.message || 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, dependencies);

  return { doc, loading, error };
};

export default useFirestoreQuery;
