import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log(`API: Processing sign in request for ${email}`);

    // CHANGE: Determine which API URL to use
    const serverUrl = process.env.SERVER_API_URL || "http://localhost:3000/api";
    console.log(`Using server API URL: ${serverUrl}`);
    
    // Make a request to the backend server - using the fixed route
    const response = await fetch(`${serverUrl}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    // Check if we got a valid JSON response
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Non-JSON response from backend:", await response.text());
      return NextResponse.json(
        { error: "Invalid response from authentication server" },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log(`Sign in response status: ${response.status}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Authentication failed" },
        { status: response.status }
      );
    }

    // Validate expected data format
    if (!data.token) {
      console.error("Missing token in authentication response");
      return NextResponse.json(
        { error: "Invalid authentication response" },
        { status: 500 }
      );
    }

    // Return user data and token
    return NextResponse.json({
      user: data.user,
      token: data.token,
      expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000, // Add expiresAt if not provided
    });
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}