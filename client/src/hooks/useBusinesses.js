import { useState, useCallback } from 'react';

// Loads the list of Manager businesses available to the current user/session.
export function useBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { managerApi } = await import('../serverjs/managerFuncs.js');
      const response = await managerApi('GET', '/api4/businesses', null);
      const raw = response?.body?.businesses ?? [];

      const mapped = raw.map((item) => {
        const href = item?._links?.self?.href ?? '';
        const key = href.split('/').pop() || item.name;
        return { key, name: item.name };
      });

      setBusinesses(mapped);
      return mapped;
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { businesses, loading, error, loadBusinesses };
}
