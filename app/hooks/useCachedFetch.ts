import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(r => r.json());

export function useCachedFetch(url: string | null) {
  const dataCache = useRef<Record<string, any>>({});
  
  const { data, error, isLoading, mutate } = useSWR(
    url, 
    async (url) => {
      // Check cache first
      if (dataCache.current[url]) {
        return dataCache.current[url];
      }
      
      // Fetch data
      const response = await fetcher(url);
      
      // Update cache
      dataCache.current[url] = response;
      
      return response;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false
    }
  );
  
  return { data, error, isLoading, mutate };
}