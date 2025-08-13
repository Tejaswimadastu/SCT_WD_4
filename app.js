const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const state={lists:[],tasks:[],activeList:null,focus:false,filterDate:null,search:"",reminders:{},calendar:{y:new Date().getFullYear(),m:new Date().getMonth()}};
const sid=x=>"id-"+Math.random().toString(36).slice(2,9);
function load(){try{const d=JSON.parse(localStorage.getItem("focusdo"));if(d){Object.assign(state,d);}}catch(e){}}
function save(){localStorage.setItem("focusdo",JSON.stringify(state));}
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1400);}
function ensureBase(){if(!state.lists.length){const a=[{id:sid(),name:"Inbox",color:"#7c5cff"},{id:sid(),name:"Work",color:"#00d4ff"},{id:sid(),name:"Personal",color:"#ff8a00"}];state.lists=a;state.activeList=a[0].id;} if(!state.tasks.length){state.tasks=[];}}
function renderLists(){const wrap=$("#lists");wrap.innerHTML="";state.lists.forEach(l=>{const d=document.createElement("div");d.className="list-item"+(l.id===state.activeList?" active":"");d.innerHTML=`<div class="dot" style="background:${l.color}"></div><div>${l.name}</div><div style="margin-left:auto;display:flex;gap:6px"><button class="icon" data-act="rename">✎</button><button class="icon" data-act="del">🗑</button></div>`;d.onclick=e=>{if(e.target.dataset.act==="del"){if(confirm("Delete list?")){state.tasks=state.tasks.filter(t=>t.listId!==l.id);state.lists=state.lists.filter(x=>x.id!==l.id);if(state.activeList===l.id)state.activeList=state.lists[0]?.id||null;save();render();}return;} if(e.target.dataset.act==="rename"){const n=prompt("List name",l.name);if(n){l.name=n;save();render();}return;} state.activeList=l.id;render();};wrap.appendChild(d);});const sel=$("#taskList");sel.innerHTML=state.lists.map(l=>`<option value="${l.id}">${l.name}</option>`).join("");sel.value=state.activeList||state.lists[0]?.id||"";}
function urgencyBadge(due){if(!due)return"";const ms=new Date(due)-new Date();if(ms<0)return`<span class="badge overdue">Overdue</span>`;if(ms<36e5*12)return`<span class="badge soon">Due soon</span>`;return"";}
function priorityPill(p){return`<span class="priority ${p}">${p}</span>`;}
function tagChips(tags){return`<div class="tags">${tags.map(t=>`<span class="tag" data-tag="${t}">${t}</span>`).join("")}</div>`;}
function scheduleReminder(t){if(!("Notification"in window))return;const due=t.due?new Date(t.due):null;if(!due)return;const lead=10*60*1000;const at=+due-lead;const wait=at-Date.now();if(wait<=0)return;const id=t.id;clearTimeout(state.reminders[id]);state.reminders[id]=setTimeout(()=>{if(Notification.permission==="granted"){new Notification("Due soon: "+t.title,{body:(t.desc||"")+" • in 10 minutes"});} },wait);}
function renderBoard(){const b=$("#boardColumns");b.innerHTML="";state.lists.forEach(l=>{const col=document.createElement("div");col.className="column";col.dataset.list=l.id;col.innerHTML=`<div class="col-header"><strong>${l.name}</strong><span style="color:${l.color}">●</span></div><div class="dropzone"></div>`;b.appendChild(col);});const zones=[...$$(".dropzone")];const tasks=filteredTasks();tasks.forEach(t=>{const el=document.createElement("div");el.className="task"+(t.completed?" completed":"");el.draggable=true;el.dataset.id=t.id;el.innerHTML=`
  <div class="left"><div class="checkbox"><input type="checkbox" ${t.completed?"checked":""}></div></div>
  <div class="content">
    <div class="title" contenteditable="false">${t.title}</div>
    <div class="desc" contenteditable="false">${t.desc||""}</div>
    <div class="meta">
      ${priorityPill(t.priority)}
      ${urgencyBadge(t.due)}
      <span>⏰ ${t.due?new Date(t.due).toLocaleString(): "-"}</span>
    </div>
    ${t.tags?.length?tagChips(t.tags):""}
    ${t.blockedBy?`<div class="meta">🔒 Blocked by: ${taskById(t.blockedBy)?.title||"Unknown"}</div>`:""}
  </div>
  <div class="actions">
    <button class="icon edit">✎</button>
    <button class="icon del">🗑</button>
  </div>`;const zone=b.querySelector(`.column[data-list="${t.listId}"] .dropzone`);zone?.appendChild(el);
  el.addEventListener("dragstart",e=>{el.classList.add("dragging");e.dataTransfer.setData("text/plain",t.id);});
  el.addEventListener("dragend",()=>el.classList.remove("dragging"));
  el.querySelector("input").onchange=()=>toggleComplete(t.id);
  el.querySelector(".edit").onclick=()=>toggleEdit(el,t.id);
  el.querySelector(".del").onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==t.id);save();render();};
  el.querySelectorAll(".tag").forEach(tag=>tag.onclick=()=>{state.search=tag.dataset.tag;$("#search").value=state.search;render();});
  });
  zones.forEach(z=>{
    z.ondragover=e=>{e.preventDefault();};
    z.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");const t=taskById(id);t.listId=z.closest(".column").dataset.list;save();render();};
  });
}
function taskById(id){return state.tasks.find(x=>x.id===id);}
function filteredTasks(){let a=[...state.tasks];if(state.activeList)a=a.filter(t=>t.listId===state.activeList);if(state.focus)a=a.filter(t=>{if(t.completed)return false;const due=t.due?new Date(t.due):null;const today=new Date();const sameDay=due?due.toDateString()===today.toDateString():false;return sameDay||t.priority==="high";});if(state.filterDate)a=a.filter(t=>t.due&&new Date(t.due).toDateString()===new Date(state.filterDate).toDateString());if(state.search){const q=state.search.toLowerCase();a=a.filter(t=>(t.title+t.desc).toLowerCase().includes(q)||t.tags?.some(x=>("#"+x).includes(q)));}return a;}
function renderStats(){const total=state.tasks.length;const done=state.tasks.filter(t=>t.completed).length;const pct=total?Math.round(done*100/total):0;$("#progressBar").style.width=pct+"%";$("#progressText").textContent=pct+"%";$("#streakText").textContent="Streak: "+calcStreak()+"🔥";state.tasks.forEach(scheduleReminder);}
function calcStreak(){const days={};state.tasks.filter(t=>t.completedAt).forEach(t=>{const d=new Date(t.completedAt);const key=d.toDateString();days[key]=true;});let streak=0;let cur=new Date();while(days[cur.toDateString()]){streak++;cur.setDate(cur.getDate()-1);}return streak;}
function addList(){const name=$("#newListName").value.trim();const color=$("#newListColor").value;s=$("#newListName").value="";if(!name)return;const l={id:sid(),name,color};state.lists.push(l);state.activeList=l.id;save();render();}
function addTaskFromForm(){const title=$("#title").value.trim();if(!title){toast("Title required");return;}const d=$("#dueDate").value;const t=$("#dueTime").value;const due=d?new Date(d+"T"+(t||"23:59")).toISOString():null;const priority=$("#priority").value;const listId=$("#taskList").value;const tags=$("#tags").value.split(",").map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^#/,"#")).map(x=>x.slice(1));const dep=$("#dependency").value||null;const desc=$("#desc").value;["#title","#desc","#tags"].forEach(s=>$(s).value="");const task={id:sid(),title,desc,priority,due,listId,tags,completed:false,blockedBy:dep||null,createdAt:new Date().toISOString(),completedAt:null};state.tasks.unshift(task);save();render();toast("Task added");}
function toggleComplete(id){const t=taskById(id);if(t.blockedBy){const b=taskById(t.blockedBy);if(b&&!b.completed){toast("Complete dependency first");render();return;}}t.completed=!t.completed;t.completedAt=t.completed?new Date().toISOString():null;save();render();}
function toggleEdit(el,id){const t=taskById(id);const titleEl=el.querySelector(".title");const descEl=el.querySelector(".desc");const editing=titleEl.getAttribute("contenteditable")==="true";if(editing){titleEl.setAttribute("contenteditable","false");descEl.setAttribute("contenteditable","false");t.title=titleEl.textContent.trim();t.desc=descEl.textContent.trim();save();render();}else{titleEl.setAttribute("contenteditable","true");descEl.setAttribute("contenteditable","true");titleEl.focus();}}
function renderDependencies(){const s=$("#dependency");s.innerHTML=`<option value="">No dependency</option>`+state.tasks.map(t=>`<option value="${t.id}">${t.title}</option>`).join("");}
function bind(){$("#addListBtn").onclick=addList;$("#addTaskBtn").onclick=addTaskFromForm;$("#search").oninput=e=>{state.search=e.target.value;renderBoard();};$("#focusToggle").onclick=()=>{state.focus=!state.focus;$("#focusToggle").setAttribute("aria-pressed",state.focus?"true":"false");render();};$("#clearDateFilter").onclick=()=>{state.filterDate=null;renderCalendar();renderBoard();};$("#notifyBtn").onclick=async()=>{if(!("Notification"in window))return;let p=Notification.permission;if(p!=="granted"){try{p=await Notification.requestPermission();}catch{} }toast(p==="granted"?"Reminders on":"Reminders blocked");};$("#micBtn").onclick=voiceAdd;}
function render(){renderLists();renderBoard();renderStats();renderDependencies();renderCalendar();}
function genCalendar(y,m){const d=new Date(y,m,1);const days=[];const start=d.getDay();for(let i=0;i<start;i++)days.push(null);const last=new Date(y,m+1,0).getDate();for(let i=1;i<=last;i++)days.push(new Date(y,m,i));return days;}
function renderCalendar(){const {y,m}=state.calendar;$("#calTitle").textContent=new Date(y,m,1).toLocaleString(undefined,{month:"long",year:"numeric"});const grid=$("#calGrid");grid.innerHTML="";genCalendar(y,m).forEach(day=>{const cell=document.createElement("div");cell.className="cal-cell";if(day){cell.textContent=day.getDate();const has=state.tasks.some(t=>t.due&&new Date(t.due).toDateString()===day.toDateString());if(has){const dot=document.createElement("div");dot.className="dot";cell.appendChild(dot);}cell.onclick=()=>{state.filterDate=day.toISOString();renderBoard();grid.querySelectorAll(".cal-cell").forEach(c=>c.classList.remove("active"));cell.classList.add("active");};}grid.appendChild(cell);});$("#prevMonth").onclick=()=>{let y=state.calendar.y,m=state.calendar.m-1;if(m<0){m=11;y--;}state.calendar={y,m};renderCalendar();};$("#nextMonth").onclick=()=>{let y=state.calendar.y,m=state.calendar.m+1;if(m>11){m=0;y++;}state.calendar={y,m};renderCalendar();};}
function voiceAdd(){try{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast("Speech not supported");return;}const r=new SR();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>{$("#title").value=e.results[0][0].transcript;toast("Heard: "+$("#title").value);};r.start();}catch(e){toast("Voice error");}}
function registerSW(){if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");}
load();ensureBase();document.addEventListener("DOMContentLoaded",()=>{bind();render();registerSW();});
