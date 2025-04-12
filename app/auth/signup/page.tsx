"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const extensionId = searchParams.get("extensionId");
  const referrer = searchParams.get("referrer");

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

    try {
      // For debugging, display API URL we're using
      console.log("Using API URL:", `${window.location.origin}/api/auth/signup`);
      
      // First try directly to backend if in development
      let response;
      try {
        // Try directly to backend first (for development)
        response = await fetch("http://localhost:3000/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        });
        console.log("Direct backend response status:", response.status);
      } catch (directError) {
        console.log("Direct backend request failed, trying through Next.js API route");
        // If direct request fails, try through Next.js API route
        response = await fetch(`${window.location.origin}/api/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        });
        console.log("Next.js API route response status:", response.status);
      }

      const data = await response.json();
      console.log("Response data keys:", Object.keys(data));

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // If this signup came from the extension, use the communication method
      if (source === "extension") {
        notifyExtension(data.user, data.token);
        
        // Show success message
        setDebugInfo("Account created successfully! Redirecting back to the extension...");
      } else {
        // Show success message and redirect
        setDebugInfo("Account created successfully! Redirecting to dashboard...");
        
        // Normal web app registration flow - redirect after short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError((err as Error).message || "Failed to register. Please try again.");
      
      // Add more debug info
      if (err instanceof Error) {
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
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
              <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor"/>
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
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
              <Link href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
                Privacy Policy
              </Link>
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative flex w-full justify-center rounded-md border border-transparent py-3 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? "Creating account..." : "Create account"}
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