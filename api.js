window.ShortForgeAPI={
 base:(location.protocol==='file:'?'':location.origin),
 async request(path,opts={}){const r=await fetch(this.base+path,{credentials:'same-origin',...opts});const ct=r.headers.get('content-type')||'';if(!r.ok){let d={};if(ct.includes('json'))d=await r.json().catch(()=>({}));throw Object.assign(new Error(d.error||`Request failed (${r.status})`),{status:r.status,data:d})}return r},
 async health(){if(!this.base)return {online:false,mode:'local'};try{return {...await (await this.request('/api/health')).json(),online:true}}catch{return {online:false,mode:'local'}}},
 async signup(name,email,password){return (await this.request('/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,password})})).json()},
 async login(email,password){return (await this.request('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})).json()},
 async logout(){return (await this.request('/api/auth/logout',{method:'POST'})).json()},async me(){return (await this.request('/api/me')).json()},
 async generate(payload){return (await this.request('/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})).json()},
 async tts(text){return (await this.request('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})})).blob()},
 async media(query){return (await this.request('/api/media?q='+encodeURIComponent(query))).json()},mediaProxy(url){return this.base+'/api/media-proxy?url='+encodeURIComponent(url)},
 async render(videoBlob){return (await this.request('/api/render',{method:'POST',headers:{'content-type':videoBlob.type||'video/webm'},body:videoBlob})).blob()},
 async checkout(){return (await this.request('/api/billing/checkout',{method:'POST'})).json()},
 async projects(){return (await this.request('/api/projects')).json()},async saveProject(project,name){return (await this.request('/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project,name})})).json()},async loadProject(id){return (await this.request('/api/projects/'+encodeURIComponent(id))).json()},async updateProject(id,project,name){return (await this.request('/api/projects/'+encodeURIComponent(id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({project,name})})).json()},async deleteProject(id){return (await this.request('/api/projects/'+encodeURIComponent(id),{method:'DELETE'})).json()}
};
