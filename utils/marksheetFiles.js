"use client";

/**
 * Prepares marksheet files in the browser before upload (AI Course Advisor).
 * Photos are scaled down to MAX_EDGE px JPEG: phone photos are often 5-10 MB,
 * while the upload route (Vercel) takes ~4.5 MB per request and the AI reads
 * text fine at this size. PDFs are sent as they are, within PDF_MAX_BYTES.
 */

const MAX_EDGE = 1800;
const JPEG_QUALITY = 0.85;
const PDF_MAX_BYTES = 4 * 1024 * 1024;
const TOTAL_MAX_BYTES = 4.4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isPdf(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
}

function isImage(file) {
  return IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name || "");
}

async function downscale(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black in JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Could not process the photo");
  const name = (file.name || "marksheet").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/**
 * Returns { files } ready to upload, or { error } with a message for the student.
 * `alreadyStored` counts files kept from earlier uploads toward `maxFiles`.
 */
export async function prepareMarksheetFiles(fileList, { maxFiles = 3, alreadyStored = 0 } = {}) {
  const picked = Array.from(fileList || []);
  if (picked.length === 0) return { error: "Please choose a PDF or photo of your marksheet." };
  if (picked.length + alreadyStored > maxFiles) {
    return { error: `You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}.` };
  }

  const files = [];
  for (const file of picked) {
    if (isPdf(file)) {
      if (file.size > PDF_MAX_BYTES) return { error: "Each PDF must be under 4 MB. Try a photo of the page instead." };
      files.push(file);
    } else if (isImage(file)) {
      try {
        files.push(await downscale(file));
      } catch {
        return { error: "We couldn't open that photo. Please try a JPG or PNG." };
      }
    } else {
      return { error: "Please upload a PDF, JPG, PNG or WEBP file." };
    }
  }

  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > TOTAL_MAX_BYTES) {
    return { error: "These files are too large together. Please upload fewer or smaller files." };
  }
  return { files };
}
