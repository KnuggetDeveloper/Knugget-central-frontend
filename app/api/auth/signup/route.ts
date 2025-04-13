// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Server URL (make sure this is correct)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      // Forward request to backend server
      const response = await fetch(`${serverUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      // Parse JSON response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Registration failed" },
          { status: response.status }
        );
      }

      // Return successful response
      return NextResponse.json({
        user: data.user,
        token: data.token,
        expiresAt: data.expiresAt,
      });
    } catch (fetchError) {
      console.error("Network error:", fetchError);
      return NextResponse.json(
        { error: "Could not connect to the server. Please try again later." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
