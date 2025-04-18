import { NextRequest, NextResponse } from "next/server";

// DELETE handler for deleting a summary by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summaryId = params.id;

    if (!summaryId) {
      return NextResponse.json(
        { success: false, error: "Summary ID is required" },
        { status: 400 }
      );
    }

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
      // Forward delete request to backend server
      const response = await fetch(`${serverUrl}/summary/${summaryId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || "Failed to delete summary" },
          { status: response.status }
        );
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        data: data.data || { id: summaryId },
      });
    } catch (fetchError) {
      console.error("Network error:", fetchError);
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

// GET handler for fetching a summary by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summaryId = params.id;

    if (!summaryId) {
      return NextResponse.json(
        { success: false, error: "Summary ID is required" },
        { status: 400 }
      );
    }

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
      // Forward get request to backend server
      const response = await fetch(`${serverUrl}/summary/${summaryId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Parse response
      const data = await response.json();

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: data.error || "Failed to fetch summary" },
          { status: response.status }
        );
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } catch (fetchError) {
      console.error("Network error:", fetchError);
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
