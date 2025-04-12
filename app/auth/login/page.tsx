"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null); // For debugging

  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const extensionId = searchParams.get("extensionId");

  function notifyExtension(userData: any, token: string) {
    try {
      if (extensionId && typeof chrome !== "undefined") {
        console.log("Attempting to communicate with extension:", extensionId);
        
        // Send message to extension with Supabase token
        chrome.runtime.sendMessage(
          extensionId,
          {
            type: "KNUGGET_AUTH_SUCCESS",
            payload: {
              ...userData,
              token: token,
              expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            },
          },
          function (response: any) {
            console.log("Extension response received:", response);
            if (response && response.success) {
              console.log("Successfully communicated with extension");
              // Close this tab after 1.5 seconds
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              console.error("Failed to communicate with extension:", response);
              setDebugInfo("Failed to communicate with extension: " + JSON.stringify(response));
            }
          }
        );
      } else {
        console.log("No extension ID found in URL or Chrome API not available");
        if (!extensionId) {
          setDebugInfo("No extension ID found in URL");
        } else if (typeof chrome === "undefined") {
          setDebugInfo("Chrome API not available");
        }
      }
    } catch (err) {
      console.error("Error communicating with extension:", err);
      setDebugInfo("Error communicating with extension: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDebugInfo(null);

    try {
      // Use full absolute URL to avoid any path resolution issues
      const response = await fetch(`${window.location.origin}/api/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // If this login came from the extension, use the new communication method
      if (source === "extension") {
        // Use the new method to communicate with the extension
        notifyExtension(data.user, data.token);
      } else {
        // Normal web app login flow
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError((err as Error).message || "Failed to login. Please try again.");
      
      // Add more debug info
      if (err instanceof Error && err.message.includes("Database error")) {
        setDebugInfo("There appears to be a database connection issue. Please check your environment variables and database configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          {source === "extension" && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to use the Knugget AI extension
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
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

        {debugInfo && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 8a1 1 0 000 2h2a1 1 0 100-2H9z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.293 7.707a1 1 0 011.414-1.414L6 7.586l1.293-1.293a1 1 0 011.414 1.414L7.414 9l1.293 1.293a1 1 0 01-1.414 1.414L6 10.414l-1.293 1.293a1 1 0 01-1.414-1.414L4.586 9 3.293 7.707z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">{debugInfo}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Don't have an account? Sign up
              </Link>
            </div>
            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative flex w-full justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}