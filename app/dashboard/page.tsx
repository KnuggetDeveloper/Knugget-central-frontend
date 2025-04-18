"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";

interface Summary {
  id: string;
  title: string;
  keyPoints: string[];
  fullSummary: string;
  sourceUrl: string;
  createdAt: string;
  transcript?: string;
  videoId?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const itemsPerPage = 10;
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Fetch summaries from the API
  useEffect(() => {
    fetchSummaries();
  }, [currentPage]);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      // Get auth token from cookie
      const token = Cookies.get("authToken");

      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(
        `/api/summary?page=${currentPage}&limit=${itemsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - redirect to login
          Cookies.remove("authToken");
          router.push("/auth/login");
          return;
        }
        throw new Error("Failed to fetch summaries");
      }

      const data = await response.json();

      if (data.success) {
        // Set summaries without mock transcripts
        setSummaries(data.data.summaries);
        setTotalPages(Math.ceil(data.data.total / itemsPerPage));
      } else {
        throw new Error(data.error || "Failed to fetch summaries");
      }
    } catch (err) {
      console.error("Error fetching summaries:", err);
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transcript
  const fetchTranscript = async (summaryId: string) => {
    setLoadingTranscript(true);
    try {
      console.log(`Fetching transcript for summary ID: ${summaryId}`);

      const token = Cookies.get("authToken");

      if (!token) {
        router.push("/auth/login");
        return;
      }

      // Check if we already have a transcript
      const existingSummary = summaries.find((s) => s.id === summaryId);
      if (existingSummary?.transcript) {
        console.log(`Using existing transcript for summary ID: ${summaryId}`);
        return existingSummary.transcript;
      }

      const response = await fetch(`/api/summary/${summaryId}/transcript`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error(
          `Transcript fetch failed with status: ${response.status}`
        );
        throw new Error("Failed to fetch transcript");
      }

      const data = await response.json();
      console.log("Transcript fetch response:", JSON.stringify(data, null, 2));

      if (data.success && data.data) {
        const transcriptText =
          data.data.transcript || "No transcript available.";
        const titleFromTranscript = data.data.title;

        console.log(
          `Got transcript with length: ${transcriptText.length} characters`
        );

        // Update the summary with the fetched transcript
        setSummaries((prevSummaries) =>
          prevSummaries.map((summary) =>
            summary.id === summaryId
              ? {
                  ...summary,
                  transcript: transcriptText,
                  // Only update title if it was provided and the current title is missing
                  title: summary.title || titleFromTranscript || summary.title,
                }
              : summary
          )
        );

        return transcriptText;
      } else {
        console.error("Transcript fetch succeeded but data is invalid:", data);
        throw new Error(data.error || "Failed to fetch transcript");
      }
    } catch (err) {
      console.error("Error fetching transcript:", err);
      return null;
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Delete a summary
  const deleteSummary = async (id: string) => {
    setIsDeleting(id);
    try {
      const token = Cookies.get("authToken");

      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(`/api/summary/${id}`, {
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
        // Remove the deleted summary from the state
        setSummaries(summaries.filter((summary) => summary.id !== id));
        // If this was the last item on the page and not the first page, go back a page
        if (summaries.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          // Refresh the current page
          fetchSummaries();
        }
      } else {
        throw new Error(data.error || "Failed to delete summary");
      }
    } catch (err) {
      console.error("Error deleting summary:", err);
      setError((err as Error).message || "An error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchSummaries();
  };

  // Filter summaries by search query
  const filteredSummaries = searchQuery
    ? summaries.filter(
        (summary) =>
          summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          summary.fullSummary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : summaries;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // View transcript
  const handleViewTranscript = async (summary: Summary) => {
    setSelectedSummary(summary);
    setShowTranscript(true);

    // If transcript is not already loaded, fetch it
    if (!summary.transcript) {
      console.log(
        `No transcript loaded for "${summary.title}". Fetching now...`
      );
      const transcript = await fetchTranscript(summary.id);
      if (transcript) {
        console.log(`Transcript fetched successfully for "${summary.title}"`);
        setSelectedSummary((prev) => (prev ? { ...prev, transcript } : null));
      } else {
        console.log(`Failed to fetch transcript for "${summary.title}"`);
      }
    } else {
      console.log(`Using existing transcript for "${summary.title}"`);
    }
  };

  // Close transcript modal
  const closeTranscript = () => {
    setShowTranscript(false);
    setSelectedSummary(null);
  };

  // Extract YouTube video ID from URL
  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;

    // Try to extract video ID from YouTube URL patterns
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    return match && match[2].length === 11 ? match[2] : null;
  };

  // Play YouTube video
  const playVideo = (summary: Summary) => {
    const videoId = summary.videoId || getYoutubeVideoId(summary.sourceUrl);
    if (videoId) {
      setPlayingVideo(videoId);
    } else {
      // If we can't get a video ID, just open the source URL
      window.open(summary.sourceUrl, "_blank");
    }
  };

  // Close video player
  const closeVideo = () => {
    setPlayingVideo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <svg
              className="h-8 w-8 text-orange-500 mr-3"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L22 12L12 22L2 12L12 2Z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900">Knugget</h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-orange-500">
              3 Free Credits Left
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <div className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <Link
              href="/account"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              My Account
            </Link>
            <span className="mx-2 text-gray-300">|</span>
            <button
              onClick={() => {
                Cookies.remove("authToken");
                router.push("/auth/login");
              }}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Search Section */}
        <div className="px-4 py-2 sm:px-0">
          <div className="relative w-full mb-6">
            <input
              type="text"
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search your summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

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
                Loading summaries...
              </span>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredSummaries.length === 0 && (
            <div className="text-center py-10">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No summaries found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : "You haven't created any summaries yet"}
              </p>
            </div>
          )}

          {/* Summaries Grid */}
          {!loading && filteredSummaries.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.map((summary) => {
                // Extract videoId from sourceUrl if not already available
                const videoId =
                  summary.videoId || getYoutubeVideoId(summary.sourceUrl);

                return (
                  <div
                    key={summary.id}
                    className="bg-white overflow-hidden shadow rounded-lg"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3 flex-1">
                          {summary.title}
                        </h3>
                        <Link
                          href={summary.sourceUrl || "#"}
                          className="text-gray-400 hover:text-gray-500"
                          aria-label="External link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </Link>
                      </div>

                      {/* Video Thumbnail */}
                      <div
                        className="mb-4 relative bg-gray-200 rounded-md overflow-hidden cursor-pointer"
                        onClick={() => playVideo(summary)}
                      >
                        {videoId ? (
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                            alt="Video thumbnail"
                            className="w-full h-40 object-cover"
                          />
                        ) : (
                          <img
                            src="https://via.placeholder.com/640x360?text=Video+Not+Available"
                            alt="Video thumbnail"
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center hover:bg-black hover:bg-opacity-10 transition-colors">
                          <div className="h-16 w-16 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-800"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-2">
                        Key Takeaways
                      </h4>
                      <ul className="mb-4 space-y-2">
                        {summary.keyPoints && summary.keyPoints.length > 0 ? (
                          summary.keyPoints.slice(0, 3).map((point, idx) => (
                            <li key={idx} className="flex items-start">
                              <svg
                                className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <circle cx="10" cy="10" r="3" />
                              </svg>
                              <span className="text-sm text-gray-600">
                                {point}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-500 italic">
                            No key points available
                          </li>
                        )}
                      </ul>

                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => handleViewTranscript(summary)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <svg
                            className="h-4 w-4 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          View Transcript
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                      <Link
                        href={`/summary/${summary.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View Details
                      </Link>
                      <span className="text-xs text-gray-500">
                        {formatDate(summary.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
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
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === totalPages
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </main>

      {/* YouTube Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={closeVideo}
            >
              <div className="absolute inset-0 bg-gray-900 opacity-90"></div>
            </div>

            <div className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
                <button
                  type="button"
                  className="text-white hover:text-gray-200 focus:outline-none"
                  onClick={closeVideo}
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="w-full">
                <div className="relative pb-[56.25%] h-0 overflow-hidden">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {showTranscript && selectedSummary && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={closeTranscript}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={closeTranscript}
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900"
                      id="modal-title"
                    >
                      Transcript: {selectedSummary.title}
                    </h3>
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      {loadingTranscript ? (
                        <div className="flex justify-center py-8">
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
                      ) : (
                        <>
                          {selectedSummary.transcript &&
                          selectedSummary.transcript.trim() !== "" ? (
                            <p className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">
                              {selectedSummary.transcript}
                            </p>
                          ) : (
                            <div className="text-center py-8">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <h3 className="mt-2 text-sm font-medium text-gray-900">
                                No transcript available
                              </h3>
                              <p className="mt-1 text-sm text-gray-500">
                                This video doesn't have a transcript or it
                                couldn't be processed.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
