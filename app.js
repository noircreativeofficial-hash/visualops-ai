/* VisualOps AI — CLEAN app.js
   Replace the ENTIRE old app.js with this file.
   Then make index.html load this file once only.
*/

const SUPABASE_URL = "https://tdxtuanbgfmvzlbxjtxy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_O-_PpidZdPj1_Seww2cWeA_sO0bGiLH";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const SETTINGS_KEY = "visualops_settings_v3";
let requests = [];
let currentFilter = "all";

const $ = (id) => document.getElementById(id);

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function formatDate(value){
  if(!value) return "TBD";
  return new Date(value + "T00:00:00").toLocaleDateString("id-ID", {
    day:"2-digit", month:"short", year:"numeric"
  });
}

function urgencyFor(deadline){
  if(!deadline) return ["normal", 60];
  const days = Math.ceil(
    (new Date(deadline + "T23:59:59") - new Date()) / 86400000
  );
  if(days <= 1) return ["urgent", 95];
  if(days <= 3) return ["high", 82];
  if(days <= 7) return ["normal", 68];
  return ["low", 45];
}

function categoryFor(channel){
  const known = {
    social_media:"Social Media",
    print:"Print",
    packaging:"Packaging",
    presentation:"Presentation",
    other:"Other"
  };
  return known[channel] || channel || "Other";
}

function showMessage(message){
  const el = $("aiAnalysis");
  if(el){
    el.innerHTML = `<span class="ai-label">✦ SYSTEM</span><p>${esc(message)}</p>`;
  }
}

/* =========================
   SUPABASE DATA
   ========================= */

async function loadRequests(){
  const { data, error } = await supabaseClient
    .from("requests")
    .select("*")
    .order("created_at", { ascending:false });

  if(error){
    console.error("Supabase load error:", error);
    alert("Gagal mengambil data request dari Supabase.\n\n" + error.message);
    return;
  }

  requests = data || [];
  renderAll();
}

async function insertRequest(payload){
  const [urgency, priority] = urgencyFor(payload.deadline);

  const row = {
    title: payload.title,
    description: payload.description,
    requester_name: payload.requester_name || "Unknown",
    requester_email: payload.requester_email || null,
    category: payload.category,
    deadline: payload.deadline || null,
    urgency,
    priority,
    status: "New"
  };

  const { data, error } = await supabaseClient
    .from("requests")
    .insert(row)
    .select()
    .single();

  if(error){
    console.error("Supabase insert error:", error);
    alert("Request gagal disimpan.\n\n" + error.message);
    return false;
  }

  requests.unshift(data);
  renderAll();
  return true;
}

async function removeRequest(id){
  const { error } = await supabaseClient
    .from("requests")
    .delete()
    .eq("id", id);

  if(error){
    console.error("Supabase delete error:", error);
    alert("Request gagal dihapus.\n\n" + error.message);
    return;
  }

  requests = requests.filter(r => String(r.id) !== String(id));
  closeModal();
  renderAll();
}

/* =========================
   RENDER
   ========================= */

function itemHTML(r){
  const urgency = String(r.urgency || "normal").toLowerCase();

  return `
    <article class="request-item" data-id="${esc(r.id)}">
      <div class="request-top">
        <span class="request-title">${esc(r.title)}</span>
        <span class="tag ${esc(urgency)}">${esc(urgency.toUpperCase())}</span>
      </div>

      <div class="request-meta">
        ${esc(r.category || "Other")} · Deadline ${formatDate(r.deadline)} · ${esc(r.requester_name || r.requester || "Unknown")}
      </div>

      <div class="request-bottom">
        <span class="tag status">${esc(r.status || "New")}</span>
        <span class="request-meta">AI Priority ${Number(r.priority || 0)}/100</span>
      </div>
    </article>
  `;
}

function bindItems(){
  document.querySelectorAll(".request-item").forEach(item => {
    item.addEventListener("click", () => openDetail(item.dataset.id));
  });
}

function renderDashboard(){
  const open = requests.filter(r => !["Done","Approved"].includes(r.status)).length;
  const urgent = requests.filter(r => String(r.urgency).toLowerCase() === "urgent").length;
  const approval = requests.filter(r => r.status === "Waiting Approval").length;
  const completed = requests.filter(r => ["Done","Approved"].includes(r.status)).length;

  $("openCount").textContent = open;
  $("urgentCount").textContent = urgent;
  $("approvalCount").textContent = approval;
  $("completedCount").textContent = completed;

  const priority = [...requests]
    .filter(r => r.status !== "Done")
    .sort((a,b) => Number(b.priority || 0) - Number(a.priority || 0))
    .slice(0,5);

  $("priorityQueue").innerHTML = priority.length
    ? priority.map(itemHTML).join("")
    : `<div class="empty">Belum ada request aktif.</div>`;

  bindItems();

  const workload = requests.length
    ? Math.min(100, Math.round(
        requests
          .filter(r => r.status !== "Done")
          .reduce((sum,r) => sum + Number(r.priority || 0), 0) / requests.length
      ))
    : 0;

  $("workloadValue").textContent = workload + "%";
  $("workloadBar").style.width = workload + "%";

  $("aiInsight").textContent = urgent
    ? `${urgent} request berada pada prioritas urgent. Fokus pada request dengan skor tertinggi.`
    : "Queue relatif aman. Fokus pada request dengan deadline terdekat.";
}

function renderQueue(){
  const query = ($("searchInput")?.value || "").toLowerCase();

  const list = requests
    .filter(r => {
      const filterMatch =
        currentFilter === "all" ||
        String(r.urgency || "").toLowerCase() === currentFilter ||
        String(r.category || "").toLowerCase().replace(/\s+/g,"_") === currentFilter;

      const text = [
        r.title,
        r.category,
        r.requester_name,
        r.requester,
        r.description
      ].join(" ").toLowerCase();

      return filterMatch && (!query || text.includes(query));
    })
    .sort((a,b) => Number(b.priority || 0) - Number(a.priority || 0));

  $("fullQueue").innerHTML = list.length
    ? list.map(itemHTML).join("")
    : `<div class="empty">Tidak ada request yang cocok.</div>`;

  bindItems();
}

function renderAnalytics(){
  $("totalRequests").textContent = requests.length;

  const avg = requests.length
    ? Math.round(requests.reduce((s,r) => s + Number(r.priority || 0), 0) / requests.length)
    : 0;

  $("avgPriority").textContent = avg;
  $("socialCount").textContent =
    requests.filter(r => r.category === "Social Media").length;
  $("packagingCount").textContent =
    requests.filter(r => r.category === "Packaging").length;

  const counts = {};
  requests.forEach(r => {
    const key = r.category || "Other";
    counts[key] = (counts[key] || 0) + 1;
  });

  const max = Math.max(1, ...Object.values(counts));

  $("categoryBars").innerHTML = Object.entries(counts)
    .map(([name,count]) => `
      <div class="bar-row">
        <div class="bar-label"><span>${esc(name)}</span><b>${count}</b></div>
        <div class="bar-bg"><i style="width:${(count/max)*100}%"></i></div>
      </div>
    `).join("");
}

function renderAll(){
  renderDashboard();
  renderQueue();
  renderAnalytics();
}

/* =========================
   ROUTING
   ========================= */

function go(page){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));

  const target = $(page);
  if(target) target.classList.add("active-page");

  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.page === page);
  });

  window.scrollTo({top:0, behavior:"smooth"});
}

function route(){
  const page = location.hash.replace("#","") || "dashboard";
  go($(page) ? page : "dashboard");
}

/* =========================
   REQUEST DETAIL
   ========================= */

function openDetail(id){
  const r = requests.find(x => String(x.id) === String(id));
  if(!r) return;

  $("modalContent").innerHTML = `
    <span class="eyebrow">REQUEST DETAIL</span>
    <h2>${esc(r.title)}</h2>

    <div class="detail-grid">
      <div class="detail-cell"><small>Category</small><b>${esc(r.category)}</b></div>
      <div class="detail-cell"><small>Urgency</small><b>${esc(String(r.urgency || "").toUpperCase())}</b></div>
      <div class="detail-cell"><small>Deadline</small><b>${formatDate(r.deadline)}</b></div>
      <div class="detail-cell"><small>Status</small><b>${esc(r.status || "New")}</b></div>
      <div class="detail-cell"><small>Requester</small><b>${esc(r.requester_name || r.requester || "Unknown")}</b></div>
      <div class="detail-cell"><small>AI Priority</small><b>${Number(r.priority || 0)}/100</b></div>
    </div>

    <div style="margin-top:14px">
      <small style="color:#999">Description</small>
      <p style="margin-top:6px;line-height:1.6;color:#444">${esc(r.description || r.brief || "Tidak ada deskripsi.")}</p>
    </div>

    <div class="ai-box" style="margin-top:14px">
      <span class="ai-label">✦ AI ASSESSMENT</span>
      <p>AI layer akan dihubungkan ke ChatGPT pada tahap integrasi AI berikutnya.</p>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:15px">
      <button class="secondary-btn" id="deleteRequest">Delete request</button>
    </div>
  `;

  $("requestModal").classList.add("show");
  $("requestModal").setAttribute("aria-hidden","false");

  $("deleteRequest").onclick = () => {
    if(confirm("Hapus request ini dari database Supabase?")){
      removeRequest(r.id);
    }
  };
}

function closeModal(){
  $("requestModal").classList.remove("show");
  $("requestModal").setAttribute("aria-hidden","true");
}

/* =========================
   SETTINGS
   ========================= */

function getSettings(){
  try{
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  }catch{
    return {};
  }
}

function saveSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applyLogo(logo){
  const preview = $("logoPreview");
  const fallback = $("logoFallback");
  const sidebarLogo = $("sidebarLogo");
  const sidebarFallback = $("sidebarLogoFallback");
  const loaderLogo = $("loaderLogo");
  const loaderFallback = $("loaderLogoFallback");

  if(logo){
    preview.src = logo;
    preview.style.display = "block";
    fallback.style.display = "none";

    sidebarLogo.src = logo;
    sidebarLogo.style.display = "block";
    sidebarFallback.style.display = "none";

    loaderLogo.src = logo;
    loaderLogo.style.display = "block";
    loaderFallback.style.display = "none";
  }else{
    preview.removeAttribute("src");
    preview.style.display = "none";
    fallback.style.display = "grid";

    sidebarLogo.removeAttribute("src");
    sidebarLogo.style.display = "none";
    sidebarFallback.style.display = "block";

    loaderLogo.removeAttribute("src");
    loaderLogo.style.display = "none";
    loaderFallback.style.display = "block";
  }
}

function applySidebarSettings(s){
  const root = document.documentElement;

  root.style.setProperty("--sidebar-bg", s.sidebarBg || "#111111");
  root.style.setProperty("--sidebar-active", s.sidebarActive || "#242424");
  root.style.setProperty("--sidebar-text", s.sidebarText || "#969696");
  root.style.setProperty("--sidebar-hover", s.sidebarHover || "#1c1c1c");
  root.style.setProperty("--sidebar-width", (s.sidebarWidth || 245) + "px");
  root.style.setProperty(
    "--sidebar-bg-image",
    s.sidebarBackground ? `url("${s.sidebarBackground}")` : "none"
  );

  const preview = $("sidebarDesignPreview");
  if(preview){
    preview.style.backgroundColor = s.sidebarBg || "#111111";
    preview.style.backgroundImage =
      s.sidebarBackground ? `url("${s.sidebarBackground}")` : "none";
  }

  if($("sidebarBgColor")) $("sidebarBgColor").value = s.sidebarBg || "#111111";
  if($("sidebarActiveColor")) $("sidebarActiveColor").value = s.sidebarActive || "#242424";
  if($("sidebarTextColor")) $("sidebarTextColor").value = s.sidebarText || "#969696";
  if($("sidebarHoverColor")) $("sidebarHoverColor").value = s.sidebarHover || "#1c1c1c";
  if($("sidebarWidth")){
    $("sidebarWidth").value = s.sidebarWidth || 245;
    $("sidebarWidthValue").textContent = (s.sidebarWidth || 245) + " px";
  }
}

function loadSettings(){
  const s = getSettings();

  document.documentElement.style.setProperty("--primary", s.primary || "#111111");
  document.documentElement.style.setProperty("--accent", s.accent || "#B7D66A");
  document.documentElement.style.setProperty("--bg", s.background || "#F5F5F2");

  if($("brandName")) $("brandName").value = s.brand || "DesignOps AI";
  if($("brandTagline")) $("brandTagline").value = s.tagline || "AI Request Center";
  if($("primaryColor")) $("primaryColor").value = s.primary || "#111111";
  if($("accentColor")) $("accentColor").value = s.accent || "#B7D66A";
  if($("backgroundColor")) $("backgroundColor").value = s.background || "#F5F5F2";

  const brand = s.brand || "DesignOps AI";
  const brandEl = document.querySelector(".brand strong");
  if(brandEl){
    brandEl.innerHTML = esc(brand).replace(/Ops/i, "<span>Ops</span>");
  }

  const small = document.querySelector(".brand small");
  if(small) small.textContent = s.tagline || "AI Request Center";

  const loaderBrand = document.querySelector(".loader-brand");
  if(loaderBrand){
    loaderBrand.innerHTML = esc(brand).replace(/Ops/i, "<span>Ops</span>");
  }

  document.title = brand + " — Request Center";

  applyLogo(s.logo || "");
  applySidebarSettings(s);
}

/* =========================
   EVENTS
   ========================= */

document.querySelectorAll(".nav-link").forEach(a => {
  a.addEventListener("click", () => {
    location.hash = a.dataset.page;
  });
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => {
    location.hash = btn.dataset.go;
  });
});

window.addEventListener("hashchange", route);

$("queueFilters").addEventListener("click", (e) => {
  if(!e.target.matches(".filter")) return;

  document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  currentFilter = e.target.dataset.filter;
  renderQueue();
});

$("searchInput").addEventListener("input", renderQueue);

$("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = $("title").value.trim();
  const brief = $("brief").value.trim();
  const deadline = $("deadline").value;
  const channel = $("channel").value;
  const requester = $("requester").value.trim();

  if(!title || !brief || !deadline){
    alert("Title, deadline, dan brief wajib diisi.");
    return;
  }

  const ok = await insertRequest({
    title,
    description: brief,
    requester_name: requester || "Unknown",
    category: categoryFor(channel),
    deadline
  });

  if(ok){
    e.target.reset();
    $("aiAnalysis").innerHTML =
      "<span class='ai-label'>✦ AI ANALYSIS</span><p>Request berhasil disimpan ke Supabase.</p>";
    location.hash = "requests";
  }
});

$("analyzeBtn").addEventListener("click", () => {
  const title = $("title").value.trim();
  const brief = $("brief").value.trim();
  const deadline = $("deadline").value;
  const channel = $("channel").value;

  const [urgency, priority] = urgencyFor(deadline);

  let completeness = 0;
  if(title) completeness += 25;
  if(brief.length > 80) completeness += 35;
  else if(brief) completeness += 20;
  if(deadline) completeness += 20;
  if(channel) completeness += 20;

  $("aiAnalysis").innerHTML = `
    <span class="ai-label">✦ AI ANALYSIS</span>
    <p><b>Category:</b> ${esc(categoryFor(channel))}</p>
    <p><b>Recommended urgency:</b> <span class="tag ${urgency}">${urgency.toUpperCase()}</span></p>
    <p><b>Brief completeness:</b> ${completeness}/100</p>
    <p><b>Priority:</b> ${priority}/100</p>
  `;
});

$("closeModal").addEventListener("click", closeModal);
$("requestModal").addEventListener("click", e => {
  if(e.target.id === "requestModal") closeModal();
});

$("notificationBtn")?.addEventListener("click", () => {
  alert("Notification center akan dihubungkan pada tahap berikutnya.");
});

/* logo */
$("logoInput").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const s = getSettings();
    s.logo = reader.result;
    saveSettings(s);
    applyLogo(s.logo);
  };
  reader.readAsDataURL(file);
});

$("removeLogo").addEventListener("click", () => {
  const s = getSettings();
  delete s.logo;
  saveSettings(s);
  applyLogo("");
  $("logoInput").value = "";
});

/* sidebar artwork */
$("sidebarBgInput").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const s = getSettings();
    s.sidebarBackground = reader.result;
    saveSettings(s);
    applySidebarSettings(s);
  };
  reader.readAsDataURL(file);
});

$("removeSidebarBg").addEventListener("click", () => {
  const s = getSettings();
  delete s.sidebarBackground;
  saveSettings(s);
  applySidebarSettings(s);
  $("sidebarBgInput").value = "";
});

$("sidebarWidth").addEventListener("input", () => {
  const s = getSettings();
  s.sidebarWidth = Number($("sidebarWidth").value);
  saveSettings(s);
  applySidebarSettings(s);
});

["sidebarBgColor","sidebarActiveColor","sidebarTextColor","sidebarHoverColor"].forEach(id => {
  $(id).addEventListener("input", () => {
    const s = getSettings();
    const map = {
      sidebarBg:"sidebarBgColor",
      sidebarActive:"sidebarActiveColor",
      sidebarText:"sidebarTextColor",
      sidebarHover:"sidebarHoverColor"
    };
    const key = Object.keys(map).find(k => map[k] === id);
    s[key] = $(id).value;
    saveSettings(s);
    applySidebarSettings(s);
  });
});

$("resetSidebar").addEventListener("click", () => {
  const s = getSettings();

  s.sidebarBg = "#111111";
  s.sidebarActive = "#242424";
  s.sidebarText = "#969696";
  s.sidebarHover = "#1c1c1c";
  s.sidebarWidth = 245;
  delete s.sidebarBackground;

  saveSettings(s);
  applySidebarSettings(s);
});

/* appearance */
$("saveSettings").addEventListener("click", () => {
  const s = getSettings();

  s.brand = $("brandName").value.trim() || "DesignOps AI";
  s.tagline = $("brandTagline").value.trim() || "AI Request Center";
  s.primary = $("primaryColor").value;
  s.accent = $("accentColor").value;
  s.background = $("backgroundColor").value;

  saveSettings(s);
  loadSettings();
  alert("Appearance tersimpan di browser ini.");
});

/* loader */
function closeLoader(){
  const loader = $("appLoader");
  if(loader) loader.classList.add("hide");
}

$("loaderSkip")?.addEventListener("click", closeLoader);

/* year */
const year = new Date().getFullYear();
if($("copyrightYear")) $("copyrightYear").textContent = year;

/* =========================
   BOOT
   ========================= */

async function boot(){
  loadSettings();
  route();

  /* Maximum 1.5 seconds. It cannot get stuck. */
  setTimeout(closeLoader, 1500);

  await loadRequests();
}

boot();
