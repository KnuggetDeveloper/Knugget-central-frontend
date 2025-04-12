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

    // Make a request to the backend server - FIX: Changed /auth/login to /auth/signin
    const response = await fetch(`${process.env.SERVER_API_URL}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Authentication failed" },
        { status: response.status }
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