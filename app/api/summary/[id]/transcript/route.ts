import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summaryId = params.id;
    if (!summaryId) {
      return NextResponse.json(
        { error: "Summary ID is required" },
        { status: 400 }
      );
    }

    // Get authorization token from headers
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Server URL (from env or default to localhost)
    const serverUrl = process.env.SERVER_URL || "http://localhost:3000/api";

    try {
      console.log(`Fetching transcript for summary ID: ${summaryId}`);

      // Forward request to backend server
      const response = await fetch(
        `${serverUrl}/summary/${summaryId}/transcript`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Parse JSON response
      const data = await response.json();
      console.log("Transcript API response:", JSON.stringify(data, null, 2));

      // Handle error response
      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: data.error || "Failed to get transcript",
          },
          { status: response.status }
        );
      }

      // Return successful response with more explicit payload structure
      return NextResponse.json({
        success: true,
        data: {
          title: data.title || "",
          transcript: data.transcript || "",
        },
      });
    } catch (fetchError) {
      console.error("Network error fetching transcript:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not connect to the server. Please try again later.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Unexpected error fetching transcript:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
