import { format, parseISO } from "date-fns";

// `locale` (optional): a date-fns locale (useDateFnsLocale()) for the month name.
export function formatNewsDate(value, { locale } = {}) {
  if (!value) return "";
  const parsed = parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "MMM d, yyyy", locale && typeof locale === "object" ? { locale } : undefined);
}

// "1 year 10 months ago" / "3 months 10 days ago" style, shared by the
// single-article and all-articles views. Pass `t` = useTranslations("news") for the
// dashboard language (news.relative.*); without it the text is English.
export function formatRelativeAgo(value, t) {
  if (!value) return "";
  const date = parseISO(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const totalMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const totalDays = Math.floor(totalMinutes / (60 * 24));

  if (totalDays >= 365) {
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    if (t) return t("relative.yearsMonths", { years, months });
    return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"} ago`;
  }
  if (totalDays >= 30) {
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    if (t) return t("relative.monthsDays", { months, days });
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (totalDays > 0) return t ? t("relative.days", { days: totalDays }) : `${totalDays} day${totalDays === 1 ? "" : "s"} ago`;
  return t ? t("relative.today") : "today";
}
