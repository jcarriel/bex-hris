import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  targetRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
}

/**
 * Hook para infinite scroll usando Intersection Observer
 */
export const useInfiniteScroll = (
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && !isLoading) {
        setIsLoading(true);
        callback();
        setIsLoading(false);
      }
    },
    [callback, isLoading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '100px',
    });

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      if (targetRef.current) {
        observer.unobserve(targetRef.current);
      }
    };
  }, [handleIntersection, options.threshold, options.rootMargin]);

  return { targetRef, isLoading };
};

export default useInfiniteScroll;
