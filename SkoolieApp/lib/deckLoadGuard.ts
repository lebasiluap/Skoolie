/** Single-flight screen loads. Invalidating never cancels Auth or changes content access. */
export function createDeckLoadGuard() {
  let generation=0
  let busy=false
  return {
    start(): number | null { if(busy)return null;busy=true;return ++generation },
    current(token:number) { return token===generation },
    finish(token:number) { if(token!==generation)return false;busy=false;return true },
    invalidate() { generation++;busy=false },
  }
}
