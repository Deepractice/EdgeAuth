export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isPast = diffMs < 0;

  if (diffSeconds < 10) {
    return "just now";
  }

  if (diffSeconds < 60) {
    return isPast ? `${diffSeconds} seconds ago` : `in ${diffSeconds} seconds`;
  }

  if (diffMinutes < 60) {
    return isPast
      ? `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`
      : `in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
  }

  if (diffHours < 24) {
    return isPast
      ? `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
      : `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  }

  return isPast
    ? `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    : `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
}
