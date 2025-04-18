import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get("authToken")?.value;

    if (!authToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Server URL (from env or default to localhost)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      // Forward request to backend server with the token
      const response = await fetch(`${serverUrl}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Parse JSON response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        console.error("Auth check failed:", data);
        return NextResponse.json(
          { error: data.error || "Authentication failed" },
          { status: response.status }
        );
      }

      // Return successful response with user data
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error("Network error checking auth:", fetchError);
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
