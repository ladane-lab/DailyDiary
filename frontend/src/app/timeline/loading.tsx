import React from 'react';

export default function TimelineLoading() {
  return (
    <div className="flex flex-col items-center min-h-screen p-8 w-full max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between w-full items-center mb-8">
        <div className="skeleton w-48 h-8 rounded-lg" />
        <div className="skeleton w-32 h-10 rounded-full" />
      </div>
      
      <div className="w-full relative pl-8 border-l-2 border-gray-200 dark:border-gray-800 space-y-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[41px] top-4 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="skeleton w-32 h-4 mb-2 rounded" />
            <div className="skeleton w-full h-48 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
