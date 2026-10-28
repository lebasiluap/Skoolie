/** Never translate a transport failure into an authoritative signed-out session. */
export function createSessionBootstrap<T>(read:()=>PromiseLike<{data:{session:T|null};error:unknown}>,accept:(session:T|null)=>void,failed:()=>void) {
  let generation=0
  let pending:Promise<void>|null=null
  return {
    invalidate(){generation++;pending=null},
    recover():Promise<void>{
      if(pending)return pending
      const gen=generation
      const task=Promise.resolve().then(read).then(result=>{
        if(gen!==generation)return
        if(result.error){failed();return}
        accept(result.data.session)
      }).catch(()=>{if(gen===generation)failed()}).finally(()=>{if(pending===task)pending=null})
      pending=task;return task
    },
  }
}
