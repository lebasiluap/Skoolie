/** Local feedback is presentation only. Confirmed timeout/answer wins on arrival. */
export function rapidFeedback(confirmed:string|null,pending:string|null,correct:string|null) {
  const answer=confirmed??pending
  return {answer,label:answer===null?null:answer===''?'TIME’S UP':correct===null?'ANSWER SELECTED':answer===correct?'CORRECT!':'NOT QUITE'}
}
/** The server trip runs inside the feedback interval, not before it. */
export function rapidAdvanceWait(feedbackAt:number,now:number,interval=700) {
  return Math.max(0,interval-Math.max(0,now-feedbackAt))
}
