const OPEN_MINUTES = 8 * 60
const CLOSE_MINUTES = 17 * 60
const SLOT_MINUTES = 30

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

export function latestManualStart(durationMinutes: number) {
  const latestMinutes =
    Math.floor((CLOSE_MINUTES - durationMinutes) / SLOT_MINUTES) * SLOT_MINUTES
  return latestMinutes >= OPEN_MINUTES ? formatTime(latestMinutes) : null
}

export function manualTimeIsValid(time: string, durationMinutes: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return false
  const minutes = Number(match[2])
  const startMinutes = Number(match[1]) * 60 + minutes
  return (
    minutes % SLOT_MINUTES === 0 &&
    startMinutes >= OPEN_MINUTES &&
    startMinutes + durationMinutes <= CLOSE_MINUTES
  )
}
