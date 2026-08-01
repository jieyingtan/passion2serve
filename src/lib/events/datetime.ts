const singaporeOffsetMilliseconds = 8 * 60 * 60 * 1000;
const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function singaporeLocalToIso(value: string) {
  if (!localDateTimePattern.test(value)) {
    throw new Error("Invalid Singapore local date and time.");
  }

  const date = new Date(`${value}:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid Singapore local date and time.");
  }

  const roundTripValue = new Date(date.getTime() + singaporeOffsetMilliseconds)
    .toISOString()
    .slice(0, 16);
  if (roundTripValue !== value) {
    throw new Error("Invalid Singapore calendar date.");
  }

  return date.toISOString();
}

export function isoToSingaporeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid event date and time.");
  }
  return new Date(date.getTime() + singaporeOffsetMilliseconds).toISOString().slice(0, 16);
}
