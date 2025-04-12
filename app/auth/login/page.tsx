"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

  // CHANGE: Improved extension communication with better error handling
  function notifyExtension(userData: any, token: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        if (
          extensionId &&
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          chrome.runtime.sendMessage
        ) {
          console.log("Attempting to communicate with extension:", extensionId);

          // Make sure we have all required data
          const payload = {
            ...userData,
            token: token,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          };

          console.log("Sending auth data to extension:", {
            id: payload.id,
            email: payload.email,
            hasToken: !!token,
            expiresAt: new Date(payload.expiresAt).toISOString(),
          });

          // Send message to extension with Supabase token
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: "KNUGGET_AUTH_SUCCESS",
              payload: payload,
            },
            function (response: any) {
              console.log("Extension response received:", response);
              if (response && response.success) {
                console.log("Successfully communicated with extension");
                setSuccessMessage(
                  "Login successful! Returning to extension..."
                );
                resolve(true);

                // Close this tab after 1.5 seconds
                setTimeout(() => {
                  window.close();
                }, 1500);
              } else {
                console.error(
                  "Failed to communicate with extension:",
                  response
                );
                setDebugInfo(
                  "Failed to communicate with extension: " +
                    JSON.stringify(response)
                );
                resolve(false);
              }
            }
          );
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

      // If this login came from the extension, use the new communication method
      if (source === "extension") {
        const successfulNotify = await notifyExtension(data.user, data.token);

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
      if (err instanceof Error && err.message.includes("Database error")) {
        setDebugInfo(
          "There appears to be a database connection issue. Please check your environment variables and database configuration."
        );
      } else if (err instanceof Error) {
        setDebugInfo("Error details: " + err.message);
      }
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
      </div>
    </div>
  );
}
