/* =========================================================
   VISUALOPS AI
   Main Application
   Supabase + UI
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://tdxtuanbgfmvzlbxjtxy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_O-_PpidZdPj1_Seww2cWeA_sO0bGiLH";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

console.log(
  "VisualOps AI → Supabase client initialized"
);


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
  document.getElementById(id);

let requests = [];

let currentFilter = "all";


function esc(value){

  return String(value ?? "")
    .replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[char]));

}


function formatDate(date){

  if(!date){
    return "TBD";
  }

  return new Date(
    date + "T00:00:00"
  ).toLocaleDateString(
    "id-ID",
    {
      day:"2-digit",
      month:"short",
      year:"numeric"
    }
  );

}


/* =========================================================
   PRIORITY
========================================================= */

function daysUntil(date){

  if(!date){
    return 999;
  }

  return Math.ceil(
    (
      new Date(date + "T23:59:59") -
      new Date()
    ) / 86400000
  );

}


function urgencyFor(date){

  const days = daysUntil(date);

  if(days <= 1){
    return {
      urgency:"urgent",
      score:95,
      priority:"P0"
    };
  }

  if(days <= 3){
    return {
      urgency:"high",
      score:82,
      priority:"P1"
    };
  }

  if(days <= 7){
    return {
      urgency:"normal",
      score:68,
      priority:"P2"
    };
  }

  return {
    urgency:"low",
    score:45,
    priority:"P3"
  };

}


/* =========================================================
   CATEGORY
========================================================= */

function categoryFor(channel){

  const categories = {

    social_media:"Social Media",

    digital_ads:"Digital Ads",

    packaging:"Packaging",

    print:"Print",

    branding:"Branding",

    photography:"Photography",

    video:"Video",

    illustration:"Illustration",

    presentation:"Presentation",

    other:"Other"

  };

  return categories[channel] || "Other";

}


/* =========================================================
   DATABASE
========================================================= */

async function loadRequests(){

  console.log(
    "Loading requests from Supabase..."
  );

  const {
    data,
    error
  } = await supabaseClient
    .from("requests")
    .select("*")
    .order(
      "created_at",
      {
        ascending:false
      }
    );


  if(error){

    console.error(
      "Supabase LOAD ERROR:",
      error
    );

    alert(
      "Gagal mengambil data request dari Supabase.\n\n" +
      error.message
    );

    return;

  }


  requests = data || [];

  console.log(
    "Requests loaded:",
    requests
  );

  renderAll();

}


/* =========================================================
   REQUEST CARD
========================================================= */

function itemHTML(request){

  const score =
    request.priority === "P0"
      ? 95
      : request.priority === "P1"
      ? 82
      : request.priority === "P2"
      ? 68
      : 45;


  return `

    <article
      class="request-item"
      data-id="${request.id}"
    >

      <div class="request-top">

        <span class="request-title">
          ${esc(request.title)}
        </span>

        <span class="tag ${esc(request.urgency)}">
          ${esc(
            String(
              request.urgency || "normal"
            ).toUpperCase()
          )}
        </span>

      </div>


      <div class="request-meta">

        ${esc(request.category || "Other")}

        · Deadline

        ${formatDate(request.deadline)}

        ·

        ${esc(
          request.requester_name ||
          "Unknown"
        )}

      </div>


      <div class="request-bottom">

        <span class="tag status">
          ${esc(request.status || "New")}
        </span>

        <span class="request-meta">
          AI Priority ${score}/100
        </span>

      </div>

    </article>

  `;

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard(){

  const open =
    requests.filter(
      request =>
        !["Done","Approved"]
          .includes(request.status)
    ).length;


  const urgent =
    requests.filter(
      request =>
        request.urgency === "urgent"
    ).length;


  const approval =
    requests.filter(
      request =>
        request.status ===
        "Waiting Approval"
    ).length;


  const completed =
    requests.filter(
      request =>
        request.status === "Done" ||
        request.status === "Approved"
    ).length;


  $("openCount").textContent =
    open;

  $("urgentCount").textContent =
    urgent;

  $("approvalCount").textContent =
    approval;

  $("completedCount").textContent =
    completed;


  const priority =
    [...requests]
      .filter(
        request =>
          request.status !== "Done"
      )
      .sort(
        (a,b) =>
          priorityScore(b) -
          priorityScore(a)
      )
      .slice(0,5);


  $("priorityQueue").innerHTML =
    priority.length

      ? priority
          .map(itemHTML)
          .join("")

      : `
        <div class="empty">
          Belum ada request aktif.
        </div>
      `;


  const totalScore =
    requests.length

      ? requests.reduce(
          (sum, request) =>
            sum + priorityScore(request),
          0
        ) / requests.length

      : 0;


  const workload =
    Math.round(totalScore);


  $("workloadValue")
    .textContent =
    workload + "%";


  $("workloadBar")
    .style.width =
    workload + "%";


  $("aiInsight")
    .textContent =

    urgent

      ? `${urgent} request berada pada prioritas urgent. Kerjakan request dengan skor tertinggi terlebih dahulu.`

      : requests.length

      ? "Queue relatif aman. Fokus pada request dengan deadline terdekat."

      : "Belum ada request masuk.";

}


/* =========================================================
   PRIORITY SCORE
========================================================= */

function priorityScore(request){

  if(request.priority === "P0"){
    return 95;
  }

  if(request.priority === "P1"){
    return 82;
  }

  if(request.priority === "P2"){
    return 68;
  }

  if(request.priority === "P3"){
    return 45;
  }

  return 0;

}


/* =========================================================
   REQUEST QUEUE
========================================================= */

function renderQueue(){

  const search =
    (
      $("searchInput")?.value ||
      ""
    ).toLowerCase();


  const list =
    requests

      .filter(request => {

        const filterMatch =

          currentFilter === "all"

          ||

          request.urgency ===
          currentFilter

          ||

          request.type ===
          currentFilter;


        const textMatch =

          !search

          ||

          String(
            request.title || ""
          )
          .toLowerCase()
          .includes(search)

          ||

          String(
            request.category || ""
          )
          .toLowerCase()
          .includes(search)

          ||

          String(
            request.requester_name || ""
          )
          .toLowerCase()
          .includes(search);


        return (
          filterMatch &&
          textMatch
        );

      })

      .sort(
        (a,b) =>
          priorityScore(b) -
          priorityScore(a)
      );


  $("fullQueue").innerHTML =

    list.length

      ? list.map(itemHTML).join("")

      : `
        <div class="empty">
          Tidak ada request yang cocok.
        </div>
      `;


  bindRequestCards();

}


/* =========================================================
   ANALYTICS
========================================================= */

function renderAnalytics(){

  $("totalRequests")
    .textContent =
    requests.length;


  const average =

    requests.length

      ? Math.round(
          requests.reduce(
            (sum, request) =>
              sum +
              priorityScore(request),
            0
          ) /
          requests.length
        )

      : 0;


  $("avgPriority")
    .textContent =
    average;


  $("socialCount")
    .textContent =
    requests.filter(
      request =>
        request.category ===
        "Social Media"
    ).length;


  $("packagingCount")
    .textContent =
    requests.filter(
      request =>
        request.category ===
        "Packaging"
    ).length;


  const categories = {};


  requests.forEach(
    request => {

      const category =
        request.category ||
        "Other";

      categories[category] =
        (
          categories[category] ||
          0
        ) + 1;

    }
  );


  const values =
    Object.values(categories);


  const max =
    Math.max(
      1,
      ...values
    );


  $("categoryBars").innerHTML =

    Object.entries(categories)

      .map(
        ([name,count]) => `

          <div class="bar-row">

            <div class="bar-label">

              <span>
                ${esc(name)}
              </span>

              <b>
                ${count}
              </b>

            </div>

            <div class="bar-bg">

              <i
                style="
                  width:${count / max * 100}%
                "
              ></i>

            </div>

          </div>

        `
      )

      .join("");

}


/* =========================================================
   REQUEST DETAIL
========================================================= */

function openDetail(id){

  const request =
    requests.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if(!request){
    return;
  }


  const score =
    priorityScore(request);


  $("modalContent").innerHTML = `

    <span class="eyebrow">
      REQUEST DETAIL
    </span>

    <h2>
      ${esc(request.title)}
    </h2>


    <div class="detail-grid">

      <div class="detail-cell">

        <small>
          Category
        </small>

        <b>
          ${esc(
            request.category ||
            "Other"
          )}
        </b>

      </div>


      <div class="detail-cell">

        <small>
          Urgency
        </small>

        <b>
          ${esc(
            String(
              request.urgency ||
              "normal"
            ).toUpperCase()
          )}
        </b>

      </div>


      <div class="detail-cell">

        <small>
          Deadline
        </small>

        <b>
          ${formatDate(
            request.deadline
          )}
        </b>

      </div>


      <div class="detail-cell">

        <small>
          Status
        </small>

        <b>
          ${esc(
            request.status ||
            "New"
          )}
        </b>

      </div>


      <div class="detail-cell">

        <small>
          Requester
        </small>

        <b>
          ${esc(
            request.requester_name ||
            "Unknown"
          )}
        </b>

      </div>


      <div class="detail-cell">

        <small>
          AI Priority
        </small>

        <b>
          ${score}/100
        </b>

      </div>

    </div>


    <div
      class="ai-box"
      style="margin-top:14px"
    >

      <span class="ai-label">
        ✦ AI ASSESSMENT
      </span>

      <p>

        Request tersimpan di
        Supabase dan dapat diakses
        kembali dari device lain.

      </p>

    </div>


    <div
      style="
        display:flex;
        justify-content:flex-end;
        margin-top:15px;
      "
    >

      <button
        class="secondary-btn"
        id="deleteRequest"
      >
        Delete request
      </button>

    </div>

  `;


  $("requestModal")
    .classList
    .add("show");


  $("requestModal")
    .setAttribute(
      "aria-hidden",
      "false"
    );


  $("deleteRequest").onclick =
    async () => {

      if(
        !confirm(
          "Hapus request ini?"
        )
      ){
        return;
      }


      const {
        error
      } = await supabaseClient

        .from("requests")

        .delete()

        .eq(
          "id",
          request.id
        );


      if(error){

        console.error(
          "DELETE ERROR:",
          error
        );

        alert(
          "Request gagal dihapus.\n\n" +
          error.message
        );

        return;

      }


      closeModal();

      await loadRequests();

    };

}


/* =========================================================
   MODAL
========================================================= */

function closeModal(){

  $("requestModal")
    .classList
    .remove("show");


  $("requestModal")
    .setAttribute(
      "aria-hidden",
      "true"
    );

}


/* =========================================================
   AI ANALYSIS
========================================================= */

function analyze(){

  const title =
    $("title")
      .value
      .trim();


  const brief =
    $("brief")
      .value
      .trim();


  const deadline =
    $("deadline")
      .value;


  const channel =
    $("channel")
      .value;


  const result =
    urgencyFor(deadline);


  let completeness = 0;


  if(title){
    completeness += 25;
  }


  if(brief.length > 80){
    completeness += 35;

  }else if(brief){

    completeness += 20;

  }


  if(deadline){
    completeness += 20;
  }


  if(channel){
    completeness += 20;
  }


  const missing = [];


  if(!title){
    missing.push("title");
  }


  if(!brief){
    missing.push("brief");
  }


  if(!deadline){
    missing.push("deadline");
  }


  $("aiAnalysis").innerHTML = `

    <span class="ai-label">
      ✦ AI ANALYSIS
    </span>

    <p>
      <b>Category:</b>
      ${esc(
        categoryFor(channel)
      )}
    </p>

    <p>
      <b>Recommended urgency:</b>

      <span class="tag ${result.urgency}">
        ${result.urgency.toUpperCase()}
      </span>

    </p>

    <p>
      <b>Brief completeness:</b>
      ${completeness}/100
    </p>

    <p>

      ${
        missing.length

          ? `⚠ Missing: ${missing.join(", ")}`

          : "✓ Informasi dasar sudah tersedia. Request siap masuk queue."

      }

    </p>

  `;


  return {
    urgency:result.urgency,
    priority:result.priority,
    score:result.score,
    completeness
  };

}


/* =========================================================
   CREATE REQUEST
========================================================= */

async function createRequest(event){

  event.preventDefault();


  const analysis =
    analyze();


  const title =
    $("title")
      .value
      .trim() ||
    "Untitled Request";


  const brief =
    $("brief")
      .value
      .trim();


  const requester =
    $("requester")
      .value
      .trim() ||
    "Unknown";


  const email =
    $("requesterEmail")
      ?.value
      .trim() ||
    "";


  const deadline =
    $("deadline")
      .value ||
    null;


  const channel =
    $("channel")
      .value;


  const category =
    categoryFor(channel);


  const requestData = {

    title:title,

    description:brief,

    requester_name:requester,

    requester_email:email,

    category:category,

    deadline:deadline,

    urgency:analysis.urgency,

    priority:analysis.priority,

    status:"New",

    ai_summary:null,

    ai_reasoning:null,

    ai_estimated_hours:null

  };


  console.log(
    "Mengirim request:",
    requestData
  );


  const {
    data,
    error
  } = await supabaseClient

    .from("requests")

    .insert([
      requestData
    ])

    .select()

    .single();


  if(error){

    console.error(
      "INSERT ERROR:",
      error
    );


    alert(
      "Request gagal disimpan.\n\n" +
      error.message
    );


    return;

  }


  console.log(
    "Request berhasil:",
    data
  );


  event.target.reset();


  $("aiAnalysis").innerHTML = `

    <span class="ai-label">
      ✦ AI ANALYSIS
    </span>

    <p>
      ✓ Request berhasil disimpan
      ke VisualOps AI.
    </p>

  `;


  await loadRequests();


  location.hash =
    "requests";

}


/* =========================================================
   NAVIGATION
========================================================= */

function go(page){

  document
    .querySelectorAll(".page")
    .forEach(
      section =>
        section.classList.remove(
          "active-page"
        )
    );


  const target =
    $(page);


  if(target){

    target.classList.add(
      "active-page"
    );

  }


  document
    .querySelectorAll(".nav-link")
    .forEach(
      link =>
        link.classList.toggle(
          "active",
          link.dataset.page ===
          page
        )
    );


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });


  if(page === "dashboard"){
    renderDashboard();
  }

  if(page === "requests"){
    renderQueue();
  }

  if(page === "analytics"){
    renderAnalytics();
  }

}


function route(){

  const page =
    location.hash
      .replace("#","") ||
    "dashboard";


  go(
    $(page)
      ? page
      : "dashboard"
  );

}


/* =========================================================
   REQUEST CARD EVENTS
========================================================= */

function bindRequestCards(){

  document
    .querySelectorAll(
      ".request-item"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () =>
            openDetail(
              card.dataset.id
            )
        );

      }
    );

}


/* =========================================================
   SETTINGS
========================================================= */

const SETTINGS_KEY =
  "visualops_settings_v2";


function getSettings(){

  try{

    return JSON.parse(
      localStorage.getItem(
        SETTINGS_KEY
      ) || "{}"
    );

  }catch{

    return {};

  }

}


function saveSettingsData(data){

  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(data)
  );

}


function applyLogo(logo){

  const preview =
    $("logoPreview");

  const fallback =
    $("logoFallback");

  const sidebar =
    $("sidebarLogo");

  const sidebarFallback =
    $("sidebarLogoFallback");

  const loader =
    $("loaderLogo");

  const loaderFallback =
    $("loaderLogoFallback");


  if(logo){

    preview.src = logo;

    preview.style.display =
      "block";

    fallback.style.display =
      "none";


    sidebar.src = logo;

    sidebar.style.display =
      "block";

    sidebarFallback.style.display =
      "none";


    loader.src = logo;

    loader.style.display =
      "block";

    loaderFallback.style.display =
      "none";


  }else{

    preview.style.display =
      "none";

    fallback.style.display =
      "block";


    sidebar.style.display =
      "none";

    sidebarFallback.style.display =
      "block";


    loader.style.display =
      "none";

    loaderFallback.style.display =
      "block";

  }

}


function applySettings(){

  const settings =
    getSettings();


  document.documentElement
    .style
    .setProperty(
      "--primary",
      settings.primary ||
      "#111111"
    );


  document.documentElement
    .style
    .setProperty(
      "--accent",
      settings.accent ||
      "#B7D66A"
    );


  document.documentElement
    .style
    .setProperty(
      "--sidebar-bg",
      settings.sidebarBg ||
      "#111111"
    );


  document.documentElement
    .style
    .setProperty(
      "--sidebar-active",
      settings.sidebarActive ||
      "#242424"
    );


  document.documentElement
    .style
    .setProperty(
      "--sidebar-width",
      (
        settings.sidebarWidth ||
        245
      ) + "px"
    );


  document.documentElement
    .style
    .setProperty(
      "--sidebar-bg-image",
      settings.sidebarBackground
        ? `url("${settings.sidebarBackground}")`
        : "none"
    );


  $("brandTitle")
    .textContent =
    settings.brand ||
    "VisualOps AI";


  $("brandTagline")
    .textContent =
    settings.tagline ||
    "AI Request Center";


  $("brandName")
    .value =
    settings.brand ||
    "VisualOps AI";


  $("brandTagline")
    .value =
    settings.tagline ||
    "AI Request Center";


  $("primaryColor")
    .value =
    settings.primary ||
    "#111111";


  $("accentColor")
    .value =
    settings.accent ||
    "#B7D66A";


  $("sidebarBgColor")
    .value =
    settings.sidebarBg ||
    "#111111";


  $("sidebarActiveColor")
    .value =
    settings.sidebarActive ||
    "#242424";


  $("sidebarWidth")
    .value =
    settings.sidebarWidth ||
    245;


  $("sidebarWidthValue")
    .textContent =
    (
      settings.sidebarWidth ||
      245
    ) + " px";


  $("sidebarPreview")
    .style.backgroundImage =
    settings.sidebarBackground
      ? `url("${settings.sidebarBackground}")`
      : "none";


  applyLogo(
    settings.logo || ""
  );


  document.title =
    (
      settings.brand ||
      "VisualOps AI"
    ) +
    " — Request Center";

}


/* =========================================================
   SAVE BRAND SETTINGS
========================================================= */

function saveAppearance(){

  const old =
    getSettings();


  const settings = {

    ...old,

    brand:
      $("brandName")
        .value
        .trim() ||
      "VisualOps AI",

    tagline:
      $("brandTagline")
        .value
        .trim() ||
      "AI Request Center",

    primary:
      $("primaryColor")
        .value,

    accent:
      $("accentColor")
        .value,

    sidebarBg:
      $("sidebarBgColor")
        .value,

    sidebarActive:
      $("sidebarActiveColor")
        .value,

    sidebarWidth:
      Number(
        $("sidebarWidth")
          .value
      )

  };


  saveSettingsData(
    settings
  );


  applySettings();


  alert(
    "Appearance tersimpan."
  );

}


/* =========================================================
   LOGO UPLOAD
========================================================= */

$("logoInput")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target
          .files?.[0];


      if(!file){
        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        () => {

          const settings =
            getSettings();


          settings.logo =
            reader.result;


          saveSettingsData(
            settings
          );


          applyLogo(
            settings.logo
          );

        };


      reader.readAsDataURL(
        file
      );

    }
  );


$("removeLogo")
  .addEventListener(
    "click",
    () => {

      const settings =
        getSettings();


      delete settings.logo;


      saveSettingsData(
        settings
      );


      applyLogo("");

    }
  );


/* =========================================================
   SIDEBAR BACKGROUND
========================================================= */

$("sidebarBgInput")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target
          .files?.[0];


      if(!file){
        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        () => {

          const settings =
            getSettings();


          settings.sidebarBackground =
            reader.result;


          saveSettingsData(
            settings
          );


          applySettings();

        };


      reader.readAsDataURL(
        file
      );

    }
  );


$("removeSidebarBg")
  .addEventListener(
    "click",
    () => {

      const settings =
        getSettings();


      delete settings.sidebarBackground;


      saveSettingsData(
        settings
      );


      applySettings();

    }
  );


/* =========================================================
   SIDEBAR LIVE CONTROLS
========================================================= */

$("sidebarBgColor")
  .addEventListener(
    "input",
    event => {

      document.documentElement
        .style
        .setProperty(
          "--sidebar-bg",
          event.target.value
        );

    }
  );


$("sidebarActiveColor")
  .addEventListener(
    "input",
    event => {

      document.documentElement
        .style
        .setProperty(
          "--sidebar-active",
          event.target.value
        );

    }
  );


$("sidebarWidth")
  .addEventListener(
    "input",
    event => {

      const value =
        Number(
          event.target.value
        );


      $("sidebarWidthValue")
        .textContent =
        value + " px";


      document.documentElement
        .style
        .setProperty(
          "--sidebar-width",
          value + "px"
        );

    }
  );


$("resetSidebar")
  .addEventListener(
    "click",
    () => {

      const settings =
        getSettings();


      delete settings.sidebarBackground;


      settings.sidebarBg =
        "#111111";


      settings.sidebarActive =
        "#242424";


      settings.sidebarWidth =
        245;


      saveSettingsData(
        settings
      );


      applySettings();

    }
  );


/* =========================================================
   EVENTS
========================================================= */

document
  .querySelectorAll(
    "[data-go]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          location.hash =
            button.dataset.go;

        }
      );

    }
  );


document
  .querySelectorAll(
    ".nav-link"
  )
  .forEach(
    link => {

      link.addEventListener(
        "click",
        () => {

          location.hash =
            link.dataset.page;

        }
      );

    }
  );


window.addEventListener(
  "hashchange",
  route
);


$("queueFilters")
  .addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".filter"
        );


      if(!button){
        return;
      }


      document
        .querySelectorAll(
          ".filter"
        )
        .forEach(
          item =>
            item.classList.remove(
              "active"
            )
        );


      button.classList.add(
        "active"
      );


      currentFilter =
        button.dataset.filter;


      renderQueue();

    }
  );


$("searchInput")
  .addEventListener(
    "input",
    renderQueue
  );


$("analyzeBtn")
  .addEventListener(
    "click",
    analyze
  );


$("requestForm")
  .addEventListener(
    "submit",
    createRequest
  );


$("saveSettings")
  .addEventListener(
    "click",
    saveAppearance
  );


$("closeModal")
  .addEventListener(
    "click",
    closeModal
  );


$("requestModal")
  .addEventListener(
    "click",
    event => {

      if(
        event.target.id ===
        "requestModal"
      ){

        closeModal();

      }

    }
  );


$("notificationBtn")
  .addEventListener(
    "click",
    () => {

      alert(
        "Notification center akan dihubungkan pada tahap berikutnya."
      );

    }
  );


/* =========================================================
   RENDER
========================================================= */

function renderAll(){

  renderDashboard();

  renderQueue();

  renderAnalytics();

}


/* =========================================================
   LOADER
========================================================= */

function closeLoader(){

  const loader =
    $("appLoader");


  if(!loader){
    return;
  }


  loader.classList.add(
    "hide"
  );

}


$("loaderSkip")
  .addEventListener(
    "click",
    closeLoader
  );


/*
  Maksimal 5 detik.
  Tidak akan mentok.
*/

setTimeout(
  closeLoader,
  5000
);


/* =========================================================
   COPYRIGHT
========================================================= */

$("copyrightYear")
  .textContent =
  new Date()
    .getFullYear();


/* =========================================================
   INITIALIZE
========================================================= */

applySettings();

route();

loadRequests();
