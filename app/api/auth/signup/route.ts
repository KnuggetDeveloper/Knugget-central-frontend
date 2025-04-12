// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Add logging to help debug
    console.log("API: Signup request received:", { name, email, passwordLength: password?.length });

    // Validate inputs
    if (!name || !email || !password) {
      console.log("Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.log("Validation failed: Password too short");
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Get the server URL from environment or use a fallback for development
    const serverUrl = process.env.SERVER_API_URL || "http://localhost:3000/api";
    console.log("Forwarding request to server at:", serverUrl);

    // Make a request to the backend server with detailed error logging
    try {
      const response = await fetch(
        `${serverUrl}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password }),
        }
      );

      // Log the status of the response
      console.log("Backend response status:", response.status);
      
      // For non-OK responses, try to get the error message
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error details:", errorData);
        return NextResponse.json(
          { error: errorData.error || "Registration failed" },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log("Backend response data:", data);

      // Return user data and token with expiresAt
      return NextResponse.json({
        user: data.user,
        token: data.token,
        expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000
      });
    } catch (fetchError) {
      console.error("Error communicating with backend:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to authentication server" },
        { status: 503 }
      );
    }
  } catch (error) {
    // Improved error logging
    console.error("Sign up error:", error);
    console.error("Error details:", error instanceof Error ? error.stack : "No stack trace");
    
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}