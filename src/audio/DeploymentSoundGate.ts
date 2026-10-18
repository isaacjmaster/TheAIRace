/** Session-local acknowledgement gate. No preferences or player data are stored here. */
export class DeploymentSoundGate{
 private heard=new Set<string>();
 accepted(raidId:string,requestId:string){const key=raidId+':'+requestId;if(this.heard.has(key))return false;this.heard.add(key);return true;}
}
