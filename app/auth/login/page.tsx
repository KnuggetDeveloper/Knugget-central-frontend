"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const extensionId = searchParams.get("extensionId");

  function notifyExtension(
    userData: any,
    token: string,
    refreshToken: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        console.log("Attempting to notify extension about successful login");

        // Get the extension ID from URL parameters
        const extensionId = searchParams.get("extensionId");

        if (
          extensionId &&
          chrome &&
          chrome.runtime &&
          chrome.runtime.sendMessage
        ) {
          console.log(
            `Extension ID: ${extensionId}. Sending auth data to extension.`
          );

          // Create a properly structured user info object
          const userInfo = {
            id: userData.id,
            email: userData.email,
            name: userData.name || "",
            token: token,
            refreshToken: refreshToken, // Include refresh token
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
            credits: userData.credits || 0,
            plan: userData.plan || "free",
          };

          // Store in Chrome extension storage and notify
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: "AUTH_LOGIN_SUCCESS",
              payload: userInfo,
            },
            (response) => {
              const success = response && response.success;
              console.log(
                `Extension notification ${success ? "successful" : "failed"}`,
                response
              );

              if (success) {
                setSuccessMessage(
                  "Successfully logged in! You can close this tab and continue using YouTube."
                );
              }

              resolve(!!success);
            }
          );

          return; // Early return, will resolve in the callback
        } else {
          console.log(
            "No extension ID found in URL or Chrome API not available"
          );
          if (!extensionId) {
            setDebugInfo("No extension ID found in URL");
          } else if (typeof chrome === "undefined") {
            setDebugInfo("Chrome API not available");
          } else if (!chrome.runtime || !chrome.runtime.sendMessage) {
            setDebugInfo("Chrome runtime sendMessage not available");
          }
          resolve(false);
        }
      } catch (err) {
        console.error("Error communicating with extension:", err);
        setDebugInfo(
          "Error communicating with extension: " +
            (err instanceof Error ? err.message : String(err))
        );
        resolve(false);
      }
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDebugInfo(null);
    setSuccessMessage(null);

    try {
      // Use full absolute URL to avoid any path resolution issues
      const apiUrl = `${window.location.origin}/api/auth/signin`;
      console.log("Using API URL for login:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Check for non-JSON response
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Non-JSON response received: ${await response.text()}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Make sure we have the token
      if (!data.token) {
        throw new Error("No authentication token received");
      }

      console.log("Login successful:", {
        hasToken: !!data.token,
        hasRefreshToken: !!data.refreshToken,
        hasUser: !!data.user,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : "none",
      });

      // Store token in cookie
      Cookies.set("authToken", data.token, {
        expires: new Date(data.expiresAt || Date.now() + 24 * 60 * 60 * 1000),
        path: "/",
        secure: window.location.protocol === "https:",
        sameSite: "strict",
      });

      // Store refresh token if available
      if (data.refreshToken) {
        Cookies.set("refreshToken", data.refreshToken, {
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          path: "/",
          secure: window.location.protocol === "https:",
          sameSite: "strict",
        });
      }

      // If this is running in the extension's context, store token directly
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        console.log("Running in extension context, storing token directly");

        // Create a properly structured user info object
        const userInfo = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || "",
          token: data.token,
          refreshToken: data.refreshToken || data.token, // Use token as refresh token if not provided
          expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
          credits: data.user.credits || 0,
          plan: data.user.plan || "free",
        };

        // Store directly in Chrome storage
        (chrome.storage.local.set as any)(
          { knuggetUserInfo: userInfo },
          function () {
            console.log("Auth data stored directly in login page");
          }
        );
      }

      // If this login came from the extension, use communication method
      if (source === "extension") {
        const successfulNotify = await notifyExtension(
          data.user,
          data.token,
          data.refreshToken || data.token // Use token as refresh token if not provided
        );

        if (!successfulNotify) {
          // Show alternative success message if notifyExtension fails
          setSuccessMessage(
            "Login successful! However, we couldn't connect to the extension. Please close this tab and reload your YouTube page."
          );
        }
      } else {
        // Normal web app login flow
        setSuccessMessage("Login successful! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError((err as Error).message || "Failed to login. Please try again.");

      // Add more debug info
      if (err instanceof Error) {
        setDebugInfo("Error details: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-md bg-indigo-600 p-2 text-white">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {source === "extension"
                ? "Sign in to use the Knugget AI extension"
                : "Sign in to your account to continue"}
            </p>
          </div>

          {/* Alerts */}
          <div className="mt-8 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-100">
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
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {debugInfo && (
              <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      {debugInfo}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-md bg-green-50 p-4 border border-green-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
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
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Login Form */}
          <div className="mt-8">
            <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      href="/auth/forgot-password"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !!successMessage}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading || successMessage
                        ? "bg-indigo-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                        Signing in...
                      </div>
                    ) : successMessage ? (
                      "Signed in!"
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      New to Knugget?
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/auth/signup"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
