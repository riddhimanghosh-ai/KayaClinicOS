import { NextResponse } from "next/server";
import { lookupCatalogPrice } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") ?? "").trim();
  if (!name) return NextResponse.json({ price: null });
  const price = lookupCatalogPrice(name);
  return NextResponse.json({ price });
}
