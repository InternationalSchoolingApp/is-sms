import { format, parseISO } from "date-fns";

export function formatNewsDate(value) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy");
}

// "1 year 10 months ago" / "3 months 10 days ago" style, shared by the
// single-article and all-articles views.
export function formatRelativeAgo(value) {
  if (!value) return "";
  const date = parseISO(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const totalMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const totalDays = Math.floor(totalMinutes / (60 * 24));

  if (totalDays >= 365) {
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"} ago`;
  }
  if (totalDays >= 30) {
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (totalDays > 0) return `${totalDays} day${totalDays === 1 ? "" : "s"} ago`;
  return "today";
}
