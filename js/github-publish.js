/* GitHub 发布：凭证只在内存中；图片、正文、索引合并为一次提交。 */
window.seolGitHub=(()=>{
  let settings={owner:'chenqy6969-beep',repo:'chenqy6969-beep.github.io',branch:'main'},enabled=false,token='';
  try{Object.assign(settings,JSON.parse(localStorage.getItem('seol-github-settings')||'{}'));}catch{}
  const enc=encodeURIComponent;
  function configure(value,secret){
    if(!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(value.owner)||! /^[\w.-]+$/.test(value.repo)||!value.branch.trim())throw Error('请填写有效的 GitHub 用户名、仓库和分支');
    settings={owner:value.owner,repo:value.repo,branch:value.branch};token=secret.trim();enabled=true;
    try{localStorage.setItem('seol-github-settings',JSON.stringify(settings));}catch{}
  }
  async function api(path,{method='GET',body}={}){
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(token)headers.Authorization='Bearer '+token;
    if(body)headers['Content-Type']='application/json';
    let response;try{response=await fetch(`https://api.github.com/repos/${enc(settings.owner)}/${enc(settings.repo)}/${path}`,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(45000)});}catch{throw Error('网络连接中断，请保留草稿后重试；重复提交同一草稿不会新增副本');}
    if(!response.ok){const e=Error(response.status===401?'发布凭证无效或已过期':response.status===403?'没有所需权限，或 GitHub 请求次数受限':response.status===404?'未找到仓库、分支或文件，请先完成首次部署':response.status===409||response.status===422?'线上版本已变化，请重试，系统不会强制覆盖':'GitHub 请求失败（'+response.status+'）');e.status=response.status;throw e;}
    return response.status===204?null:response.json();
  }
  const head=()=>api('git/ref/heads/'+settings.branch.split('/').map(enc).join('/'));
  async function read(path,ref){const result=await api('contents/'+path.replace(/^\.\//,'').split('/').map(enc).join('/')+'?ref='+enc(ref||settings.branch));if(result.encoding!=='base64')throw Error('索引文件太大或格式不支持');return new TextDecoder().decode(Uint8Array.from(atob(result.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
  const json=text=>JSON.parse(text.replace(/^\uFEFF/,''));
  // 只合并本次改动的记录。其他设备新增的文章保留，同一篇的并发修改明确报错。
  function merge(base,next,latest,source){
    const array=d=>source==='posts'?d:d.articles;
    const a=array(base),b=array(next),c=array(latest);if(![a,b,c].every(Array.isArray))throw Error('线上索引格式无效');
    const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),old=new Map(a.map(p=>[p.id,p])),wanted=new Map(b.map(p=>[p.id,p])),live=new Map(c.map(p=>[p.id,p]));
    for(const id of new Set([...old.keys(),...wanted.keys()])){const before=old.get(id),after=wanted.get(id);if(same(before,after))continue;const current=live.get(id);if(!same(current,before)&&!same(current,after))throw Error('这篇文章已在其他设备修改，请先保存草稿并重新连接，核对后再编辑');if(after)live.set(id,after);else live.delete(id);}
    const result=[...live.values()].sort((x,y)=>y.date.localeCompare(x.date));return source==='posts'?result:{...latest,articles:result};
  }
  function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
  async function publish({source,base,next,files,message}){
    if(!token)throw Error('请先填写发布凭证，再点击“连接并读取线上文章”');
    const ref=await head(),sha=ref.object.sha,target=`data/${source}.json`;
    const latestText=await read(target,sha),merged=merge(json(base),json(next),json(latestText),source),text=JSON.stringify(merged,null,2)+'\n';
    if(JSON.stringify(json(latestText))===JSON.stringify(merged))return {text,sha,unchanged:true};
    const commit=await api('git/commits/'+sha),tree=[];
    for(const [original,blob] of files){const path=original.replace(/^\.\//,'');if(!/^(posts|images)\/[a-z\d_.-]+$/i.test(path))throw Error('拒绝发布非文章或图片路径');const result=await api('git/blobs',{method:'POST',body:{content:base64(new Uint8Array(await blob.arrayBuffer())),encoding:'base64'}});tree.push({path,mode:'100644',type:'blob',sha:result.sha});}
    tree.push({path:target,mode:'100644',type:'blob',content:text});
    // 同一次提交更新标签计数，避免主页与标签页不同步。
    const other=json(await read(source==='posts'?'data/thoughts.json':'data/posts.json',sha));const articles=source==='posts'?[...merged,...other.articles]:[...other,...merged.articles],counts=new Map();articles.forEach(p=>new Set(p.tags||[]).forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
    tree.push({path:'data/tags.json',mode:'100644',type:'blob',content:JSON.stringify([...counts].map(([name,count])=>({name,count})),null,2)+'\n'});
    const newTree=await api('git/trees',{method:'POST',body:{base_tree:commit.tree.sha,tree}});
    const saved=await api('git/commits',{method:'POST',body:{message:message||'更新生活记录',tree:newTree.sha,parents:[sha]}});
    await api('git/refs/heads/'+settings.branch.split('/').map(enc).join('/'),{method:'PATCH',body:{sha:saved.sha,force:false}});
    return {text,sha:saved.sha};
  }
  return {configure,read,publish,merge,active:()=>enabled,disable:()=>{enabled=false;token='';},forget:()=>{token='';},settings:()=>({...settings}),buildURL:()=>`https://github.com/${enc(settings.owner)}/${enc(settings.repo)}/actions`};
})();
