"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = Cookies.get("authToken");

    if (token) {
      // If token exists, redirect to dashboard
      router.push("/dashboard");
    } else {
      // If no token, redirect to login
      router.push("/auth/login");
    }
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="flex flex-col items-center justify-center">
        <svg
          className="h-16 w-16 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />
        </svg>
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          Knugget AI
        </h1>
        <p className="mt-2 text-gray-600">Loading your summaries...</p>
        <div className="mt-6">
          <svg
            className="animate-spin h-8 w-8 text-indigo-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
}
