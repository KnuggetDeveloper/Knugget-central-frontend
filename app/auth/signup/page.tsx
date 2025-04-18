"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const extensionId = searchParams.get("extensionId");
  const referrer = searchParams.get("referrer");

  // CHANGE: Improved extension communication with better error handling
  function notifyExtension(
    userData: any,
    token: string,
    refreshToken: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        console.log("Attempting to notify extension about successful signup");

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
              type: "AUTH_SIGNUP_SUCCESS",
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
                  "Account created and extension connected successfully! You can close this tab and continue using YouTube."
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

  const validateForm = () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setDebugInfo(null);
    setSuccessMessage(null);

    try {
      // For debugging, display API URL we're using
      const apiUrl = `${window.location.origin}/api/auth/signup`;
      console.log("Using API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      console.log("Signup response status:", response.status);

      // Check for a non-JSON response
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Non-JSON response received: ${await response.text()}`);
      }

      const data = await response.json();
      console.log("Response data keys:", Object.keys(data));

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Check for required data
      if (!data.token || !data.user || !data.user.id) {
        setDebugInfo(
          "Registration succeeded but incomplete data received. Contact support."
        );
        console.error("Incomplete registration data:", data);
        throw new Error("Incomplete registration data received");
      }

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
            console.log("Auth data stored directly in signup page");
          }
        );
      }

      // If this signup came from the extension, use the communication method
      if (source === "extension") {
        const successfulNotify = await notifyExtension(
          data.user,
          data.token,
          data.refreshToken || data.token // Use token as refresh token if not provided
        );

        if (successfulNotify) {
          // Already set in notifyExtension
        } else {
          // Show failure message for extension communication
          setSuccessMessage(
            "Account created successfully! However, we couldn't connect to the extension. Please close this tab and reload your YouTube page."
          );
        }
      } else {
        // Show success message and redirect
        setSuccessMessage(
          "Account created successfully! Redirecting to dashboard..."
        );

        // Normal web app registration flow - redirect after short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err) {
      console.error("Error during signup:", err);
      setError((err as Error).message || "Registration failed");
      setDebugInfo(
        "Error details: " + ((err as Error).message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-indigo-600"
            >
              <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your Knugget account
          </h2>
          {source === "extension" && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign up to start generating AI summaries of your videos
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

        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
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
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="text-sm text-left">
            <p className="text-gray-500">
              By signing up, you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Privacy Policy
              </Link>
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !!successMessage}
              className={`group relative flex w-full justify-center rounded-md border border-transparent py-3 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                loading || successMessage
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading
                ? "Creating account..."
                : successMessage
                ? "Account created!"
                : "Create account"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
