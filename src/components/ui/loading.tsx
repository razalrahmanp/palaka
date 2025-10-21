import React from 'react';

// Loading skeleton component
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="h-96 bg-gray-200 rounded"></div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }) {
  // Predefined grid classes for Tailwind compilation
  const gridClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2', 
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  };
  
  const gridCols = gridClasses[Math.min(cols, 12)] || 'grid-cols-4';
  
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className={`grid gap-4 ${gridCols}`}>
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-6 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// HOC for adding loading states
export function withLoading<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  LoadingComponent = PageSkeleton
) {
  return function LoadingWrapper(props: T & { loading?: boolean }) {
    const { loading, ...rest } = props;
    
    if (loading) {
      return <LoadingComponent />;
    }
    
    return <WrappedComponent {...(rest as T)} />;
  };
}