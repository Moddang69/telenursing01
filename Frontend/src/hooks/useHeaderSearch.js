import { useEffect, useRef, useState } from 'react';
import { searchService } from '../services/searchService.js';

const DEBOUNCE_MS = 300;
export const MIN_QUERY_LENGTH = 2;

/**
 * useHeaderSearch — ค้นหาแบบหน่วงเวลา (debounce) และทิ้งผลของคำค้นเก่าที่ตอบช้ากว่า
 * @returns {{ groups, total, loading, error, searched }}
 */
export function useHeaderSearch(query, enabled = true) {
  const [state, setState] = useState({ groups: [], total: 0, loading: false, error: '', searched: '' });
  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    seqRef.current += 1;
    const seq = seqRef.current;

    if (!enabled || q.length < MIN_QUERY_LENGTH) {
      setState({ groups: [], total: 0, loading: false, error: '', searched: '' });
      return undefined;
    }

    setState((s) => ({ ...s, loading: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        const data = await searchService.search(q);
        if (seq !== seqRef.current) return; // มีคำค้นใหม่กว่าแล้ว
        setState({ groups: data.groups || [], total: data.total || 0, loading: false, error: '', searched: q });
      } catch (err) {
        if (seq !== seqRef.current) return;
        setState({ groups: [], total: 0, loading: false, error: err?.message || 'ค้นหาไม่สำเร็จ กรุณาลองใหม่', searched: q });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  return state;
}

export default useHeaderSearch;