import React from 'react';

/**
 * LoadingSkeleton - Reusable skeleton components for loading states
 * Provides better UX than spinners by showing content structure
 */

// Pulse animation for skeleton elements
const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Card skeleton for dashboard cards
export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
    <div className="animate-pulse">
      <SkeletonPulse className="h-4 w-1/3 mb-4" />
      <SkeletonPulse className="h-8 w-1/2 mb-2" />
      <SkeletonPulse className="h-3 w-2/3" />
    </div>
  </div>
);

// Table row skeleton
export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-b border-gray-200">
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx} className="px-6 py-4">
        <SkeletonPulse className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

// Full table skeleton
export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow-sm">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, idx) => (
              <th key={idx} className="px-6 py-3 text-left">
                <SkeletonPulse className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, idx) => (
            <TableRowSkeleton key={idx} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Building/Directory card skeleton
export const BuildingCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <SkeletonPulse className="h-48 w-full" />
    <div className="p-4">
      <SkeletonPulse className="h-6 w-3/4 mb-2" />
      <SkeletonPulse className="h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <SkeletonPulse className="h-8 w-20" />
        <SkeletonPulse className="h-8 w-20" />
      </div>
    </div>
  </div>
);

// Grid of building cards
export const BuildingGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, idx) => (
      <BuildingCardSkeleton key={idx} />
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx}>
        <SkeletonPulse className="h-4 w-1/4 mb-2" />
        <SkeletonPulse className="h-10 w-full" />
      </div>
    ))}
    <SkeletonPulse className="h-10 w-32 mt-6" />
  </div>
);

// Announcement card skeleton
export const AnnouncementSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-4">
    <div className="flex items-start gap-4">
      <SkeletonPulse className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <SkeletonPulse className="h-6 w-3/4 mb-2" />
        <SkeletonPulse className="h-4 w-full mb-2" />
        <SkeletonPulse className="h-4 w-5/6 mb-4" />
        <SkeletonPulse className="h-3 w-1/4" />
      </div>
    </div>
  </div>
);

// Progress bar for uploads
export const ProgressBar = ({ progress = 0, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
    <div
      className="bg-udm-maroon h-2.5 rounded-full transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

// Loading spinner (fallback for when skeleton doesn't make sense)
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-udm-maroon rounded-full animate-spin`}
      />
    </div>
  );
};

// Full page loading
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <LoadingSpinner size="xl" className="mb-4" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// Search skeleton
export const SearchSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, idx) => (
      <div key={idx} className="bg-white rounded-lg shadow-sm p-4">
        <SkeletonPulse className="h-5 w-2/3 mb-2" />
        <SkeletonPulse className="h-4 w-full mb-1" />
        <SkeletonPulse className="h-4 w-4/5" />
      </div>
    ))}
  </div>
);

export default {
  CardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  BuildingCardSkeleton,
  BuildingGridSkeleton,
  FormSkeleton,
  AnnouncementSkeleton,
  ProgressBar,
  LoadingSpinner,
  PageLoader,
  SearchSkeleton
};
