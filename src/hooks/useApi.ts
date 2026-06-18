import { useEffect, useRef, useCallback, useState } from 'react';


export type RequestState<T> = {
    data: T | null;
    loading: boolean;
    error: string | null;
};

export function useApi<T>(
    fetchFn: (signal: AbortSignal) => Promise<T>,
    deps: any[] = []
): RequestState<T> {
    const abortRef = useRef<AbortController | null>(null);
    const [state, setState] = useState<RequestState<T>>({ data: null, loading: true, error: null });

    const fetchData = useCallback(async (signal: AbortSignal) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await fetchFn(signal);
            setState({ data, loading: false, error: null });
        } catch (e: any) {
            if (e.name === 'CanceledError' || e.name === 'AbortError') return;
            setState(prev => ({ ...prev, loading: false, error: e?.response?.data?.error || e?.message || 'Loi tai du lieu' }));
        }
    }, deps);

    useEffect(() => {
        abortRef.current = new AbortController();
        fetchData(abortRef.current.signal);
        return () => abortRef.current?.abort();
    }, deps);

    return state;
}

export function useMutation<T>(
    mutateFn: (signal: AbortSignal) => Promise<T>
): [(signal: AbortSignal) => Promise<T>, { loading: boolean; error: string | null; reset: () => void }] {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setError(null);
    }, []);

    const execute = useCallback(async (signal: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const result = await mutateFn(signal);
            return result;
        } catch (e: any) {
            if (e.name === 'CanceledError' || e.name === 'AbortError') throw e;
            setError(e?.response?.data?.error || e?.message || 'Loi thuc hien');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [mutateFn]);

    return [execute, { loading, error, reset }];
}
