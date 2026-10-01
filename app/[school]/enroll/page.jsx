import { notFound } from "next/navigation";
import { EnrollRedirect } from "./EnrollRedirect";

const VALID_LEARNING_PROGRAMS = new Set([
  "O",
  "DD",
  "ONE_TO_ONE_FLEX",
  "G",
  "SCHOLARSHIP",
  "SSP",
]);

function getFirstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function decodePayload(value) {
  if (typeof value !== "string" || !value) return null;

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(paddedBase64, "base64").toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default async function EnrollPage({ params, searchParams }) {
  const { school } = await params;
  const queryParams = await searchParams;
  const payload = getFirstValue(queryParams?.payload);
  const decodedPayload = decodePayload(payload);
  const learningProgram = decodedPayload?.learningProgram;

  if (!school || !VALID_LEARNING_PROGRAMS.has(learningProgram)) notFound();

  return (
    <EnrollRedirect
      school={school}
      learningProgram={learningProgram}
      payload={payload}
      decodedPayload={decodedPayload}
    />
  );
}
