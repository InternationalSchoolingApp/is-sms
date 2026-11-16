import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * The buddy's voice for one sentence: asks the backend (PicoVoiceController -> TtsService) and answers {url, times},
 * an MP3 on S3 and when each word is said. The backend makes a sentence once and keeps it; the TTS key never leaves
 * the backend. A route (not a server action) so the page can get several sentences ready at the same time.
 */
export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID) return NextResponse.json({ message: "Your session has been logged out" }, { status: 401 });
  if (!hasBackendOrigin()) return NextResponse.json({ message: "The backend is not configured." }, { status: 500 });
  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!text) return NextResponse.json({ message: "Nothing to say." }, { status: 400 });
  // The backend checks both against its own list of voices and speeds.
  const voice = typeof body?.voice === "string" ? body.voice.slice(0, 40) : undefined;
  const speed = typeof body?.speed === "number" ? body.speed : undefined;

  try {
    const base = await resolveServerBackendOrigin();
    const response = await fetch(`${base}/${me.schoolUUID}/tts/pico/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      body: JSON.stringify({ text, voice, speed }),
      cache: "no-store",
    });
    const answer = response.ok ? await response.json().catch(() => null) : null;
    const clip = answer?.status === "1" ? answer.clip : null;
    // The backend answered but has no clip on purpose (no TTS key in SETTINGS, too many new sentences, nothing to say):
    // not a server failure, so no red 502 in the console — the page just uses the browser voice.
    if (answer?.status === "0") {
      return NextResponse.json({ url: null, times: [], message: answer.message || "No voice for this sentence." });
    }
    if (!clip || !/^https?:\/\//i.test(clip.url || "")) {
      return NextResponse.json({ message: answer?.message || `HTTP ${response.status}` }, { status: 502 });
    }
    return NextResponse.json({ url: clip.url, times: Array.isArray(clip.times) ? clip.times : [] });
  } catch {
    return NextResponse.json({ message: "The server could not be reached." }, { status: 502 });
  }
}
