"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";

interface Summary {
  id: string;
  title: string;
  keyPoints: string[];
  fullSummary: string;
  sourceUrl: string;
  createdAt: string;
}

export default function SummaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const summaryId = params.id as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary details
  useEffect(() => {
    fetchSummary();
  }, [summaryId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Get auth token from cookie
      const token = Cookies.get("authToken");

      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(`/api/summary/${summaryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - redirect to login
          Cookies.remove("authToken");
          router.push("/auth/login");
          return;
        } else if (response.status === 404) {
          throw new Error("Summary not found");
        } else {
          throw new Error("Failed to fetch summary");
        }
      }

      const data = await response.json();

      if (data.success) {
        setSummary(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch summary");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Delete a summary and redirect to dashboard
  const deleteSummary = async () => {
    if (!confirm("Are you sure you want to delete this summary?")) {
      return;
    }

    setLoading(true);
    try {
      const token = Cookies.get("authToken");

      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(`/api/summary/${summaryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete summary");
      }

      const data = await response.json();

      if (data.success) {
        router.push("/dashboard");
      } else {
        throw new Error(data.error || "Failed to delete summary");
      }
    } catch (err) {
      console.error("Error deleting summary:", err);
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Summary Details</h1>
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-10">
              <svg
                className="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-500"
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
              <span className="text-lg font-medium text-gray-500">
                Loading summary...
              </span>
            </div>
          )}

          {/* Summary Details */}
          {!loading && summary && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {summary.title}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Created on {formatDate(summary.createdAt)}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link
                    href={summary.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                    View Source
                  </Link>
                  <button
                    onClick={deleteSummary}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg
                      className="-ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200">
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-6">
                  <div className="sm:col-span-1">
                    <div className="text-sm font-medium text-gray-500">
                      Source
                    </div>
                    <div className="mt-1 text-sm text-gray-900 break-all">
                      <Link
                        href={summary.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {summary.sourceUrl}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 sm:col-span-3">
                    <div className="text-sm font-medium text-gray-500">
                      Type
                    </div>
                    <div className="mt-1 text-sm text-gray-900">
                      YouTube Video Summary
                    </div>
                  </div>
                </div>

                {/* Key Points Section */}
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Key Points
                  </h3>
                  <div className="mt-4 space-y-3">
                    {summary.keyPoints.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-start bg-white p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex-shrink-0 text-indigo-500 mr-3">
                          <svg
                            className="h-6 w-6"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-700">{point}</p>
                      </div>
                    ))}
                    {summary.keyPoints.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No key points available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Full Summary Section */}
                <div className="bg-white px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Full Summary
                  </h3>
                  <div className="prose prose-indigo max-w-none">
                    <p className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">
                      {summary.fullSummary}
                    </p>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back to Dashboard
                  </Link>
                  <div className="flex space-x-3">
                    <Link
                      href={summary.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Source Video
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
