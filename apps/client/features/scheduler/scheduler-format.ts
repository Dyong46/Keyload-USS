export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}

export function endTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number)
  const total = hours * 60 + minutes + durationMinutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}
