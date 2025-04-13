import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Server URL (make sure this is correct)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      // Forward request to backend server
      const response = await fetch(`${serverUrl}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Parse JSON response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Authentication failed" },
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
