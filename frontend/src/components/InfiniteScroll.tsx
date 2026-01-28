import React from 'react';
import { useThemeStore } from '../stores/themeStore';
import useInfiniteScroll from '../hooks/useInfiniteScroll';

interface InfiniteScrollProps {
  children: React.ReactNode;
  onLoadMore: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  loadingComponent?: React.ReactNode;
  endComponent?: React.ReactNode;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  onLoadMore,
  isLoading = false,
  hasMore = true,
  loadingComponent,
  endComponent,
}) => {
  const { theme } = useThemeStore();
  const { targetRef } = useInfiniteScroll(onLoadMore, {
    threshold: 0.1,
    rootMargin: '100px',
  });

  const textColor = theme === 'light' ? 'text-gray-600' : 'text-gray-400';

  return (
    <div>
      {children}

      {hasMore && (
        <div ref={targetRef} className="py-8 text-center">
          {isLoading ? (
            loadingComponent || (
              <div className="flex justify-center items-center gap-2">
                <div className="animate-spin">
                  <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className={textColor}>Cargando más...</span>
              </div>
            )
          ) : null}
        </div>
      )}

      {!hasMore && endComponent && (
        <div className="py-8 text-center">
          {endComponent}
        </div>
      )}

      {!hasMore && !endComponent && (
        <div className={`py-8 text-center ${textColor}`}>
          <p>No hay más datos para cargar</p>
        </div>
      )}
    </div>
  );
};

export default InfiniteScroll;
