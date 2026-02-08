import { NextResponse } from "next/server";

export function ok<T>(data: T): NextResponse<T> {
  return NextResponse.json(data);
}

export function fail(error: unknown, status = 500): NextResponse<{ error: string }> {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status });
}
