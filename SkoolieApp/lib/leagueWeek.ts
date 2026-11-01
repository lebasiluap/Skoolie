/** ISO Monday using the same UTC week boundary as the server. */
export function weekStartKey(now=new Date()):string {
  const monday=new Date(now)
  monday.setUTCDate(now.getUTCDate()-((now.getUTCDay()+6)%7))
  return monday.toISOString().slice(0,10)
}
