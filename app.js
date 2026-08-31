const STORAGE_KEY="designops_requests_v1";
const SETTINGS_KEY="designops_settings_v1";

const seedRequests=[
 {id:1,title:"Promo September — Instagram Feed",category:"Social Media",type:"social_media",urgency:"urgent",priority:96,deadline:"2026-08-31",status:"In Progress",requester:"Marketing",brief:"Promo September untuk Instagram Feed.",created:"2026-08-30"},
 {id:2,title:"School Cooking Class Poster",category:"Social Media",type:"social_media",urgency:"high",priority:82,deadline:"2026-09-02",status:"New",requester:"Marketing",brief:"Poster untuk campaign cooking class.",created:"2026-08-30"},
 {id:3,title:"Membership Card Update",category:"Print",type:"print",urgency:"normal",priority:71,deadline:"2026-09-07",status:"Waiting Approval",requester:"Marketing",brief:"Update membership card.",created:"2026-08-29"},
 {id:4,title:"New Kebab Packaging Artwork",category:"Packaging",type:"packaging",urgency:"high",priority:89,deadline:"2026-09-03",status:"Revision",requester:"Product",brief:"Artwork packaging baru.",created:"2026-08-28"},
 {id:5,title:"October Anniversary Key Visual",category:"Social Media",type:"social_media",urgency:"normal",priority:64,deadline:"2026-09-15",status:"New",requester:"Marketing",brief:"Key visual anniversary.",created:"2026-08-27"}
];

let requests=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||seedRequests;
let currentFilter="all";

const $=id=>document.getElementById(id);
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(requests));

function daysUntil(date){return Math.ceil((new Date(date+"T23:59:59")-new Date())/86400000)}
function urgencyFor(date){
 const d=daysUntil(date);
 if(d<=1)return ["urgent",95];
 if(d<=3)return ["high",82];
 if(d<=7)return ["normal",68];
 return ["low",45];
}
function categoryFor(channel){
 return {social_media:"Social Media",print:"Print",packaging:"Packaging",presentation:"Presentation",other:"Other"}[channel]||"Other";
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function formatDate(d){if(!d||d==="TBD")return "TBD";return new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}

function itemHTML(r){
 return `<article class="request-item" data-id="${r.id}">
  <div class="request-top"><span class="request-title">${esc(r.title)}</span><span class="tag ${r.urgency}">${r.urgency.toUpperCase()}</span></div>
  <div class="request-meta">${esc(r.category)} · Deadline ${formatDate(r.deadline)} · ${esc(r.requester||"Unknown")}</div>
  <div class="request-bottom"><span class="tag status">${esc(r.status)}</span><span class="request-meta">AI Priority ${r.priority}/100</span></div>
 </article>`;
}
function bindItems(){document.querySelectorAll(".request-item").forEach(x=>x.addEventListener("click",()=>openDetail(Number(x.dataset.id))))}

function renderDashboard(){
 const open=requests.filter(r=>!["Done","Approved"].includes(r.status)).length;
 const urgent=requests.filter(r=>r.urgency==="urgent").length;
 const approval=requests.filter(r=>r.status==="Waiting Approval").length;
 const completed=requests.filter(r=>r.status==="Done"||r.status==="Approved").length;
 $("openCount").textContent=open;$("urgentCount").textContent=urgent;$("approvalCount").textContent=approval;$("completedCount").textContent=completed;
 const priority=[...requests].filter(r=>r.status!=="Done").sort((a,b)=>b.priority-a.priority).slice(0,5);
 $("priorityQueue").innerHTML=priority.length?priority.map(itemHTML).join(""):`<div class="empty">Belum ada request aktif.</div>`;
 bindItems();
 const workload=Math.min(100,Math.round(requests.filter(r=>r.status!=="Done").reduce((s,r)=>s+r.priority,0)/Math.max(1,requests.length)));
 $("workloadValue").textContent=workload+"%";$("workloadBar").style.width=workload+"%";
 $("aiInsight").textContent=urgent?`${urgent} request berada pada prioritas urgent. Kerjakan request dengan skor tertinggi terlebih dahulu.`:"Queue relatif aman. Fokus pada request dengan deadline terdekat.";
}
function renderQueue(){
 let list=requests.filter(r=>{
   const filter=currentFilter==="all"||r.urgency===currentFilter||r.type===currentFilter;
   const q=($("searchInput")?.value||"").toLowerCase();
   return filter&&(!q||r.title.toLowerCase().includes(q)||r.category.toLowerCase().includes(q)||r.requester.toLowerCase().includes(q));
 }).sort((a,b)=>b.priority-a.priority);
 $("fullQueue").innerHTML=list.length?list.map(itemHTML).join(""):`<div class="empty">Tidak ada request yang cocok.</div>`;
 bindItems();
}
function renderAnalytics(){
 $("totalRequests").textContent=requests.length;
 $("avgPriority").textContent=Math.round(requests.reduce((s,r)=>s+r.priority,0)/Math.max(1,requests.length));
 $("socialCount").textContent=requests.filter(r=>r.type==="social_media").length;
 $("packagingCount").textContent=requests.filter(r=>r.type==="packaging").length;
 const cats={};requests.forEach(r=>cats[r.category]=(cats[r.category]||0)+1);
 const max=Math.max(1,...Object.values(cats));
 $("categoryBars").innerHTML=Object.entries(cats).map(([name,count])=>`<div class="bar-row"><div class="bar-label"><span>${esc(name)}</span><b>${count}</b></div><div class="bar-bg"><i style="width:${count/max*100}%"></i></div></div>`).join("");
}
function openDetail(id){
 const r=requests.find(x=>x.id===id);if(!r)return;
 $("modalContent").innerHTML=`<span class="eyebrow">REQUEST DETAIL</span><h2>${esc(r.title)}</h2>
 <div class="detail-grid">
 <div class="detail-cell"><small>Category</small><b>${esc(r.category)}</b></div>
 <div class="detail-cell"><small>Urgency</small><b>${r.urgency.toUpperCase()}</b></div>
 <div class="detail-cell"><small>Deadline</small><b>${formatDate(r.deadline)}</b></div>
 <div class="detail-cell"><small>Status</small><b>${esc(r.status)}</b></div>
 <div class="detail-cell"><small>Requester</small><b>${esc(r.requester)}</b></div>
 <div class="detail-cell"><small>AI Priority</small><b>${r.priority}/100</b></div></div>
 <div class="ai-box" style="margin-top:14px"><span class="ai-label">✦ AI ASSESSMENT</span><p>Priority dihitung dari deadline, kategori dan konteks request. Pada versi production, assessment ini akan menggunakan LLM API.</p></div>
 <div style="display:flex;justify-content:flex-end;margin-top:15px"><button class="secondary-btn" id="deleteRequest">Delete request</button></div>`;
 $("requestModal").classList.add("show");$("requestModal").setAttribute("aria-hidden","false");
 $("deleteRequest").onclick=()=>{if(confirm("Hapus request ini?")){requests=requests.filter(x=>x.id!==id);save();closeModal();renderAll()}};
}
function closeModal(){$("requestModal").classList.remove("show");$("requestModal").setAttribute("aria-hidden","true")}

function analyze(){
 const title=$("title").value.trim(),brief=$("brief").value.trim(),deadline=$("deadline").value,channel=$("channel").value;
 const [urg,base]=deadline?urgencyFor(deadline):["normal",60];
 let completeness=0;if(title)completeness+=25;if(brief.length>80)completeness+=35;else if(brief)completeness+=20;if(deadline)completeness+=20;if(channel)completeness+=20;
 const missing=[];if(!title)missing.push("title");if(!brief)missing.push("brief");if(!deadline)missing.push("deadline");
 $("aiAnalysis").innerHTML=`<span class="ai-label">✦ AI ANALYSIS</span>
 <p><b>Category:</b> ${esc(categoryFor(channel))}</p>
 <p><b>Recommended urgency:</b> <span class="tag ${urg}">${urg.toUpperCase()}</span></p>
 <p><b>Brief completeness:</b> ${completeness}/100</p>
 <p>${missing.length?`⚠ Missing: ${missing.join(", ")}`:"✓ Informasi dasar sudah tersedia. Request siap masuk queue."}</p>`;
 return {urg,priority:Math.min(100,base+(brief.length>160?3:0)),completeness};
}

function renderAll(){renderDashboard();renderQueue();renderAnalytics()}
function go(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
 const target=$(page);if(target)target.classList.add("active-page");
 document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
 if(page==="dashboard")renderDashboard();if(page==="requests")renderQueue();if(page==="analytics")renderAnalytics();
 window.scrollTo({top:0,behavior:"smooth"});
}
function route(){const page=location.hash.replace("#","")||"dashboard";go($(page)?page:"dashboard")}

document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{location.hash=b.dataset.go}));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>{location.hash=a.dataset.page}));
window.addEventListener("hashchange",route);

$("queueFilters").addEventListener("click",e=>{if(!e.target.matches(".filter"))return;document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));e.target.classList.add("active");currentFilter=e.target.dataset.filter;renderQueue()});
$("searchInput").addEventListener("input",renderQueue);

$("analyzeBtn").addEventListener("click",analyze);
$("requestForm").addEventListener("submit",e=>{
 e.preventDefault();const analysis=analyze();const r={id:Date.now(),title:$("title").value.trim()||"Untitled Request",category:categoryFor($("channel").value),type:$("channel").value,urgency:analysis.urg,priority:analysis.priority,deadline:$("deadline").value,status:"New",requester:$("requester").value.trim()||"Unknown",brief:$("brief").value.trim(),created:new Date().toISOString()};
 requests.unshift(r);save();e.target.reset();$("aiAnalysis").innerHTML="<span class='ai-label'>✦ AI ANALYSIS</span><p>Request berhasil dimasukkan ke queue.</p>";renderAll();location.hash="requests";
});

$("closeModal").addEventListener("click",closeModal);$("requestModal").addEventListener("click",e=>{if(e.target.id==="requestModal")closeModal()});
$("notificationBtn").addEventListener("click",()=>alert("Prototype: notification center akan dihubungkan ke backend pada versi production."));

function loadSettings(){
 const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"null");if(!s)return;
 document.documentElement.style.setProperty("--primary",s.primary);document.documentElement.style.setProperty("--accent",s.accent);
 $("brandName").value=s.brand||"DesignOps AI";document.title=s.brand||"DesignOps AI — Request Center";
}
$("saveSettings").addEventListener("click",()=>{
 const s={brand:$("brandName").value.trim()||"DesignOps AI",primary:$("primaryColor").value,accent:$("accentColor").value};
 localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));loadSettings();alert("Appearance tersimpan di browser ini.");
});
loadSettings();renderAll();route();
