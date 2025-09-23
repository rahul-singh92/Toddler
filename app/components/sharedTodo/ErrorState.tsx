"use client";
import { useRouter } from "next/navigation";
import { IconX } from "@tabler/icons-react";

interface ErrorStateProps {
  error: string;
}

export default function ErrorState({ error }: ErrorStateProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-700">
          <IconX size={32} className="text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Error Loading Shared Todos</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <div className="space-x-3">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#C8A2D6] text-white rounded-md hover:bg-[#B591C8] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
