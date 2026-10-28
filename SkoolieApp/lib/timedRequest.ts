import { readWithDeadline } from './readWithDeadline'

/** Both timer RPCs are idempotent. A lost response must replay the SAME args. */
export async function timedRequest<T>(call: (signal: AbortSignal) => PromiseLike<{data:T;error:unknown}>, timeoutMs=6000) {
  for (let attempt=0; ; attempt++) {
    try {
      const response=await readWithDeadline(call,timeoutMs)
      if(response.error)throw response.error
      return response.data
    } catch(error) {
      const code=(error as {code?:string})?.code
      if(attempt===1 || code==='22023' || code==='42501')throw error
    }
  }
}
