import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Server URL (from env or default to localhost)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      console.log("Attempting to refresh token");

      // Forward request to backend server
      const response = await fetch(`${serverUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      // Parse JSON response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        console.error("Token refresh failed:", data);
        return NextResponse.json(
          {
            success: false,
            error: data.error || "Failed to refresh token",
          },
          { status: response.status }
        );
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        user: data.user,
      });
    } catch (fetchError) {
      console.error("Network error refreshing token:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not connect to the server. Please try again later.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
