import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// DEV ONLY (temporary debugging aid for components/add-enrollment/DevApiSequenceLog.jsx): maps a Server Action id
// to "file#exportName" using Next's own server-reference manifest, so the browser console can print readable names.
export function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".next", "dev", "server", "server-reference-manifest.json"), "utf8")
    );
    const names = {};
    for (const [id, entry] of Object.entries(manifest.node || {})) names[id] = `${entry.exportedName}  (${entry.filename})`;
    return NextResponse.json(names);
  } catch {
    return NextResponse.json({});
  }
}
