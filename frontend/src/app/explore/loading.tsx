import React from 'react';

export default function ExploreLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 w-full max-w-4xl mx-auto space-y-6">
      <div className="skeleton w-full h-12 rounded-lg mb-8" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton w-full h-64 rounded-xl" />
      ))}
    </div>
  );
}
