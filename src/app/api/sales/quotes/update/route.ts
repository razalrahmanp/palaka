import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Quote ID is required" }, { status: 400 });
    }

    const { id, items, ...updateData } = body;

    const { error } = await supabase
      .from("quotes")
      .update({
        ...updateData,
        items, // Update the items JSON
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating quote:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unhandled error in PUT /api/sales/quotes/update:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
