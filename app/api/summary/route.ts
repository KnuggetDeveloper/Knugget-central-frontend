import { NextRequest, NextResponse } from "next/server";

// GET handler for fetching summaries with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for pagination and search
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";

    // Get authorization token from headers
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Server URL (from env or default to localhost)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", page);
      queryParams.append("limit", limit);
      if (search) {
        queryParams.append("search", search);
      }

      // Forward request to backend server
      const response = await fetch(`${serverUrl}/summary?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || "Failed to fetch summaries" },
          { status: response.status }
        );
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        data: data.data || data,
      });
    } catch (fetchError) {
      console.error("Network error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Could not connect to the server. Please try again later." },
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