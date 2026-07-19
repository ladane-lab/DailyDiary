import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen p-8 w-full max-w-6xl mx-auto space-y-8">
      <div className="skeleton w-64 h-10 rounded-lg mb-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="skeleton h-96 rounded-xl" />
        <div className="skeleton h-96 rounded-xl" />
      </div>
    </div>
  );
}
