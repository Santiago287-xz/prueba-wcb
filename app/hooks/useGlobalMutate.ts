import { mutate as globalMutate } from 'swr';

export function useGlobalMutate() {
  const mutateAll = async () => {    
    await globalMutate(
      (key) => typeof key === 'string' && key.includes('/api/bookings'),
      undefined,
      { revalidate: true }
    );
    
    return true;
  };

  return { mutateAll };
}