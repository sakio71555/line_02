export type TimelineMessageDisplayInput = {
  created_at: string;
};

const adminDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric"
});

export function sortTimelineMessagesNewestFirst<T extends TimelineMessageDisplayInput>(
  messages: readonly T[]
): T[] {
  return messages
    .map((message, index) => ({
      index,
      message,
      timestamp: getSortableTimestamp(message.created_at)
    }))
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index)
    .map(({ message }) => message);
}

export function formatAdminDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = Object.fromEntries(
    adminDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function getSortableTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
