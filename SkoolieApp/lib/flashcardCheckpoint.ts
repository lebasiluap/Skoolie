export type FlashcardCheckpoint={version:1;userId:string;requestId:string;itemIds:string[];answers:Record<string,boolean>;expiresAt:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const flashcardCheckpointKey=(uid:string)=>`skoolie:flashcard-checkpoint:v1:${uid}`
/** Metadata/ratings only. Content must be reissued and quarantine-checked online. */
export function parseFlashcardCheckpoint(raw:string|null,uid:string,now=Date.now()):FlashcardCheckpoint|null{
 try{
  const x=JSON.parse(raw??'null')
  if(!x||x.version!==1||x.userId!==uid||!uuid.test(x.requestId)||!Array.isArray(x.itemIds)||x.itemIds.length<1||x.itemIds.length>60||new Set(x.itemIds).size!==x.itemIds.length||!x.itemIds.every((id:unknown)=>typeof id==='string'&&uuid.test(id))||typeof x.expiresAt!=='string'||!Number.isFinite(Date.parse(x.expiresAt))||Date.parse(x.expiresAt)<=now||!x.answers||typeof x.answers!=='object'||Array.isArray(x.answers))return null
  const keys=Object.keys(x.answers)
  if(keys.some((id,i)=>id!==x.itemIds[i]||typeof x.answers[id]!=='boolean'))return null
  return {version:1,userId:uid,requestId:x.requestId,itemIds:[...x.itemIds],answers:{...x.answers},expiresAt:x.expiresAt}
 }catch{return null}
}
