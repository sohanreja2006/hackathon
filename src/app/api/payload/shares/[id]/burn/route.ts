import { NextRequest, NextResponse } from "next/server";
import { payloadService } from "@/lib/payload/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Share ID or code is required" }, { status: 400 });
    }

    const result = payloadService.burnShare(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Share not found or already burned" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Share self-destructed and encrypted envelope permanently purged.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error burning share";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
