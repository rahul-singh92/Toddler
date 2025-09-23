"use client";

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-[#C8A2D6] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">Loading shared todos...</p>
      </div>
    </div>
  );
}
