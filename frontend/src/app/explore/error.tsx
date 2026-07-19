"use client";
import React, { useEffect } from 'react';

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Something went wrong!</h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        We encountered an error loading the Explore feed. Please try again or check back later.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 mt-4 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-colors"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        Try again
      </button>
    </div>
  );
}
