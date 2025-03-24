import { useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

export function useCachedFetch(url: string | null) {
  const dataCache = useRef<Record<string, any>>({});
  
  const { data, error, isLoading } = useSWR(
    url, 
    async (url) => {
      if (dataCache.current[url]) {
        return dataCache.current[url];
      }
      
      const response = await fetcher(url);
      
      dataCache.current[url] = response;
      
      return response;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false
    }
  );
  
  const mutate = async (data?: any, options?: any) => {
    // Clear local cache
    Object.keys(dataCache.current).forEach(cachedUrl => {
      if (cachedUrl.includes('/api/bookings')) {
        delete dataCache.current[cachedUrl];
      }
    });
    
    await globalMutate(
      (key) => typeof key === 'string' && key.includes('/api/bookings'),
      undefined,
      { revalidate: true }
    );
    
    if (url) {
      return globalMutate(url, data, { ...options, revalidate: true });
    }
    
    return true;
  };
  return { data, error, isLoading, mutate };
}