import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      supplier_id = null,
      supplier_name,
      product_id = null,
      product_name,
      quantity,
      created_by,
      custom_type = "custom-sales",
      description = "",
      total,
    } = body;

    // Basic validation
    if (!quantity || !created_by || total == null) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 🔍 Resolve supplier_id by name
    let resolvedSupplierId = supplier_id;
    if (!resolvedSupplierId && supplier_name) {
      const { data: supplier, error: supplierErr } = await supabase
        .from("suppliers")
        .select("id")
        .ilike("name", supplier_name.trim())
        .single();

      if (supplierErr) {
        console.warn(`Supplier not found: "${supplier_name}"`);
      } else {
        resolvedSupplierId = supplier?.id ?? null;
      }
    }

    // 🔍 Resolve product_id by name
    let resolvedProductId = product_id;
    if (!resolvedProductId && product_name) {
      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("id")
        .ilike("name", product_name.trim())
        .single();

      if (productErr) {
        console.warn(`Product not found: "${product_name}"`);
      } else {
        resolvedProductId = product?.id ?? null;
      }
    }

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert([
        {
          supplier_id: resolvedSupplierId,
          product_id: resolvedProductId,
          quantity,
          status: "pending",
          created_by,
          is_custom: true,
          custom_type,
          description,
          total,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Unexpected Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
