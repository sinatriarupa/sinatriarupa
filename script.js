// =========================
// SLIDER GALERI JS
// =========================
const sliderIndices = {};
function moveSlide(sliderId, step) {
  const wrapper = document.getElementById(sliderId);
  if (!wrapper) return;
  const totalSlides = wrapper.children.length;
  if (sliderIndices[sliderId] === undefined) sliderIndices[sliderId] = 0;

  sliderIndices[sliderId] += step;
  if (sliderIndices[sliderId] < 0) sliderIndices[sliderId] = totalSlides - 1;
  else if (sliderIndices[sliderId] >= totalSlides) sliderIndices[sliderId] = 0;

  const translateX = -(sliderIndices[sliderId] * 100);
  wrapper.style.transform = `translateX(${translateX}%)`;
}

// =========================
// EmailJS init (PUBLIC KEY)
// =========================
emailjs.init({ publicKey: 'dLdHcee9nQkCWdVcY' });

// Send notification via EmailJS
function sendEmailNotifikasiPerbaikan(data) {
  return emailjs.send('service_4q1q0ai', 'template_xvtok0p', {
    to_email: "sinatriarupa@gmail.com",
    namaPemohon: data.namaPemohon || "",
    namaAset: data.namaAset || "",
    lokasiAset: data.lokasiAset || "",
    tingkat: data.tingkat || "",
    deskripsi: data.deskripsi || "",
    fotoFileId: data.fotoFileId || "",
    tanggal: data.tanggal || ""
  });
}

// =========================
// CONFIG
// =========================
const ASSET_API_URL = "https://script.google.com/macros/s/AKfycbzk1fXQhTh42go2G0wbOERkGdPCQUtc881RS2hNzWaAIBkH0x_DUlmnsRnXR8nJLks/exec";
const ADMIN_TOKEN_KEY = "sinatria_admin_token";
const PEGAWAI_TOKEN_KEY = "sinatria_pegawai_token";
const ASSET_STORAGE_KEY = "sinatria_assets_v1";

// =========================
// HELPERS
// =========================
function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function safeJsonParse(text) { try { return JSON.parse(text); } catch { return { ok: false, error: text }; } }
function apiPost(payload) {
  return fetch(ASSET_API_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload)
  }).then(async (res) => {
    const text = await res.text();
    return safeJsonParse(text);
  });
}

// Token & Auth
function getAdminToken() { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""; }
function setAdminToken(token) { sessionStorage.setItem(ADMIN_TOKEN_KEY, token); }
function clearAdminToken() { sessionStorage.removeItem(ADMIN_TOKEN_KEY); }
function isAdminLoggedIn() { return Boolean(getAdminToken()); }

function getPegawaiToken() { return sessionStorage.getItem(PEGAWAI_TOKEN_KEY) || ""; }
function setPegawaiToken(token) { sessionStorage.setItem(PEGAWAI_TOKEN_KEY, token); }
function clearPegawaiToken() { sessionStorage.removeItem(PEGAWAI_TOKEN_KEY); }
function isPegawai() { return Boolean(getPegawaiToken()); }

function isUnauthorizedError(msg) {
  const s = String(msg || "").toLowerCase();
  return s.includes("unauthorized") || s.includes("not logged in") || s.includes("session expired");
}

async function guardUnauthorizedAdmin(promise) {
  const out = await promise;
  if (out && out.ok === false && isUnauthorizedError(out.error)) forceAdminLogout(out.error);
  return out;
}

async function guardUnauthorizedPegawai(promise) {
  const out = await promise;
  if (out && out.ok === false && isUnauthorizedError(out.error)) forcePegawaiLogout(out.error);
  return out;
}

// Server Auth Calls
async function authLogin(email, password) { return apiPost({ mode: "authLogin", email, password }); }
async function authLogout() { const token = getAdminToken(); if (!token) return { ok: true }; return apiPost({ mode: "authLogout", sessionToken: token }); }

function forceAdminLogout(reason) {
  if (reason) console.warn("Admin logout:", reason);
  authLogout().catch(()=>{}); clearAdminToken(); applyAdminUI();
}

async function verifyAdminTokenOnLoad() {
  const token = getAdminToken();
  if (!token) return;
  try {
    const out = await apiPost({ mode: "authMe", sessionToken: token });
    if (!out.ok) forceAdminLogout(out.error || "Session invalid");
  } catch (err) { console.warn("authMe check failed:", err); }
}

async function pegawaiLogin(password) { return apiPost({ mode: "pegawaiLogin", password }); }
async function pegawaiLogout() { const token = getPegawaiToken(); if (!token) return { ok: true }; return apiPost({ mode: "pegawaiLogout", pegawaiToken: token }); }
function forcePegawaiLogout(reason) {
  if (reason) console.warn("Pegawai logout:", reason);
  pegawaiLogout().catch(()=>{}); clearPegawaiToken(); clearAdminToken(); applyPegawaiUI(); applyAdminUI();
}
async function verifyPegawaiTokenOnLoad() {
  const token = getPegawaiToken();
  if (!token) return;
  try {
    const out = await apiPost({ mode: "pegawaiMe", pegawaiToken: token });
    if (!out.ok) forcePegawaiLogout(out.error || "Pegawai session invalid");
  } catch (err) { console.warn("pegawaiMe check failed:", err); }
}

// Format Helpers
function driveViewUrlFromFileId(fileId) { const id = String(fileId || "").trim(); return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` : ""; }
function formatIso(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "-");

    // Mengambil komponen tanggal secara manual agar formatnya konsisten
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch { 
    return String(iso || "-"); 
  }
}
function getStatusClass(status) { const s = String(status || "").toLowerCase(); if (s === "dilaporkan") return "status-dilaporkan"; if (s === "proses") return "status-proses"; return "status-selesai"; }
function normalizeStatus(status) { const s = String(status || "").toLowerCase(); if (s === "dilaporkan") return "Dilaporkan"; if (s === "proses") return "Proses"; return "Sudah di perbaiki"; }

async function compressImageToDataUrl(file, maxSizePx = 200, quality = 0.7) {
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = imgUrl; });
    const w = img.naturalWidth || img.width; const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSizePx / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale)); const nh = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas"); canvas.width = nw; canvas.height = nh;
    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, nw, nh);
    return canvas.toDataURL("image/jpeg", quality);
  } finally { URL.revokeObjectURL(imgUrl); }
}

// =========================
// MOBILE NAV TOGGLE
// =========================
const navToggleBtn = document.getElementById("navToggleBtn");
const mobileNav = document.getElementById("mobileNav");
const mobileNavCloseBtn = document.getElementById("mobileNavCloseBtn");

function openMobileNav() { mobileNav.classList.add("show"); mobileNav.setAttribute("aria-hidden", "false"); navToggleBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; }
function closeMobileNav() { mobileNav.classList.remove("show"); mobileNav.setAttribute("aria-hidden", "true"); navToggleBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }
navToggleBtn.addEventListener("click", () => mobileNav.classList.contains("show") ? closeMobileNav() : openMobileNav());
mobileNavCloseBtn.addEventListener("click", closeMobileNav);
mobileNav.addEventListener("click", (e) => { if (e.target === mobileNav) closeMobileNav(); });
document.querySelectorAll(".mobile-link").forEach(a => { a.addEventListener("click", () => { const href = a.getAttribute("href") || ""; if (href.startsWith("#")) closeMobileNav(); }); });

// =========================
// UI APPLY (Hiding Access Menu & Show Internal Menus)
// =========================
const pegawaiAccessLink = document.getElementById("pegawaiAccessLink");
const mobilePegawaiAccessLink = document.getElementById("mobilePegawaiAccessLink");
const pegawaiLogoutBtn = document.getElementById("pegawaiLogoutBtn");
const mobilePegawaiLogoutBtn = document.getElementById("mobilePegawaiLogoutBtn");
const riwayatSection = document.getElementById("riwayat");
const riwayatNavLink = document.getElementById("riwayatNavLink");
const mobileRiwayatNavLink = document.getElementById("mobileRiwayatNavLink");

function applyPegawaiUI() {
  const ok = isPegawai();
  
  // Desktop Menu: Sembunyikan "Akses Pegawai" dan Tampilkan Internal jika Login
  document.getElementById("kelolaAsetLink").parentElement.style.display = ok ? "" : "none";
  document.getElementById("inputAsetLink").parentElement.style.display = ok ? "" : "none";
  document.getElementById("requestPerbaikanLink").parentElement.style.display = ok ? "" : "none";
  document.getElementById("riwayatNavLink").parentElement.style.display = ok ? "" : "none";
  document.getElementById("pegawaiAccessLink").parentElement.style.display = ok ? "none" : "";

  // Mobile Menu
  document.getElementById("mobileKelolaAsetLink").style.display = ok ? "flex" : "none";
  document.getElementById("mobileInputAsetLink").style.display = ok ? "flex" : "none";
  document.getElementById("mobileRequestPerbaikanLink").style.display = ok ? "flex" : "none";
  document.getElementById("mobileRiwayatNavLink").style.display = ok ? "flex" : "none";
  document.getElementById("mobilePegawaiAccessLink").style.display = ok ? "none" : "flex";

  if (!ok) riwayatSection.classList.remove("show"); else riwayatSection.classList.add("show");
  
  pegawaiLogoutBtn.style.display = ok ? "inline-flex" : "none";
  mobilePegawaiLogoutBtn.style.display = ok ? "flex" : "none";
  adminLoginBtn.style.display = ok && !isAdminLoggedIn() ? "inline-flex" : "none";
  adminLogoutBtn.style.display = ok && isAdminLoggedIn() ? "inline-flex" : "none";
  mobileAdminLoginBtn.style.display = ok && !isAdminLoggedIn() ? "flex" : "none";
  mobileAdminLogoutBtn.style.display = ok && isAdminLoggedIn() ? "flex" : "none";

  if (!ok) { document.getElementById("kelola-aset").classList.remove("show"); document.getElementById("input-aset").style.display = "none"; }
}

// Pegawai Modal
const pegawaiOverlay = document.getElementById("pegawaiModalOverlay");
const pegawaiCloseBtn = document.getElementById("pegawaiModalCloseBtn");
const pegawaiCancelBtn = document.getElementById("pegawaiModalCancelBtn");
const pegawaiForm = document.getElementById("pegawaiAccessForm");
const pegawaiPassInput = document.getElementById("pegawaiPassword");
const pegawaiErr = document.getElementById("pegawaiAccessError");

function openPegawaiModal() { pegawaiOverlay.classList.add("show"); pegawaiOverlay.setAttribute("aria-hidden", "false"); pegawaiErr.style.display = "none"; pegawaiForm.reset(); setTimeout(() => pegawaiPassInput.focus(), 50); }
function closePegawaiModal() { pegawaiOverlay.classList.remove("show"); pegawaiOverlay.setAttribute("aria-hidden", "true"); }
pegawaiAccessLink.addEventListener("click", (e) => { e.preventDefault(); openPegawaiModal(); });
mobilePegawaiAccessLink.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); openPegawaiModal(); });
pegawaiCloseBtn.addEventListener("click", closePegawaiModal);
pegawaiCancelBtn.addEventListener("click", closePegawaiModal);
pegawaiOverlay.addEventListener("click", (e) => { if (e.target === pegawaiOverlay) closePegawaiModal(); });

pegawaiForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = String(pegawaiPassInput.value || "").trim();
  pegawaiErr.style.display = "none";
  try {
    const out = await pegawaiLogin(pass);
    if (!out.ok) { pegawaiErr.style.display = "block"; return; }
    setPegawaiToken(out.pegawaiToken);
    closePegawaiModal();
    applyPegawaiUI();
    applyAdminUI();
    await refreshReports().catch(()=>{});
    alert("Akses pegawai dibuka.");
  } catch (err) { pegawaiErr.textContent = "Login pegawai gagal: " + String(err); pegawaiErr.style.display = "block"; }
});

async function logoutPegawaiFlow() { const ok = confirm("Logout pegawai?"); if (!ok) return; forcePegawaiLogout("manual logout pegawai"); alert("Logout pegawai berhasil."); }
pegawaiLogoutBtn.addEventListener("click", logoutPegawaiFlow);
mobilePegawaiLogoutBtn.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); logoutPegawaiFlow(); });

function requirePegawai_(e) {
  if (isPegawai()) return true;
  if(e) e.preventDefault();
  openPegawaiModal(); return false;
}

// Admin Modal
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const mobileAdminLoginBtn = document.getElementById("mobileAdminLoginBtn");
const mobileAdminLogoutBtn = document.getElementById("mobileAdminLogoutBtn");
const adminOverlay = document.getElementById("adminModalOverlay");
const adminCloseBtn = document.getElementById("adminModalCloseBtn");
const adminCancelBtn = document.getElementById("adminModalCancelBtn");
const adminForm = document.getElementById("adminLoginForm");
const adminEmailInput = document.getElementById("adminEmail");
const adminPassInput = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");

let adminAfterLoginTarget = "";
function openAdminModal(targetAfterLogin) { adminAfterLoginTarget = targetAfterLogin || ""; adminOverlay.classList.add("show"); adminOverlay.setAttribute("aria-hidden", "false"); adminLoginError.style.display = "none"; adminForm.reset(); setTimeout(() => adminEmailInput.focus(), 50); }
function closeAdminModal() { adminOverlay.classList.remove("show"); adminOverlay.setAttribute("aria-hidden", "true"); }
adminCloseBtn.addEventListener("click", closeAdminModal);
adminCancelBtn.addEventListener("click", closeAdminModal);
adminOverlay.addEventListener("click", (e) => { if (e.target === adminOverlay) closeAdminModal(); });
adminLoginBtn.addEventListener("click", () => openAdminModal(""));
mobileAdminLoginBtn.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); openAdminModal(""); });

adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (adminEmailInput.value || "").trim(); const pass = (adminPassInput.value || "").trim();
  adminLoginError.style.display = "none";
  try {
    const out = await authLogin(email, pass);
    if (!out.ok) { adminLoginError.style.display = "block"; return; }
    setAdminToken(out.sessionToken);
    closeAdminModal(); applyAdminUI();
    if (adminAfterLoginTarget === "input-aset") showInputAsetSection();
    if (adminAfterLoginTarget === "kelola-aset") goKelolaAset();
  } catch (err) { adminLoginError.textContent = "Login gagal: " + String(err); adminLoginError.style.display = "block"; }
});

async function logoutAdminFlow() { const ok = confirm("Logout admin?"); if (!ok) return; forceAdminLogout("manual logout"); }
adminLogoutBtn.addEventListener("click", logoutAdminFlow);
mobileAdminLogoutBtn.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); logoutAdminFlow(); });

// =========================
// NAVIGASI INTERNAL (DIPERBAIKI)
// =========================
const kelolaAsetSection = document.getElementById("kelola-aset");
const inputAsetSection = document.getElementById("input-aset");
const inputAsetLink = document.getElementById("inputAsetLink");
const mobileInputAsetLink = document.getElementById("mobileInputAsetLink");
const kelolaAsetLink = document.getElementById("kelolaAsetLink");
const mobileKelolaAsetLink = document.getElementById("mobileKelolaAsetLink");
const requestLink = document.getElementById("requestPerbaikanLink");
const mobileRequestPerbaikanLink = document.getElementById("mobileRequestPerbaikanLink");

function showInputAsetSection() {
  const asetMsg = document.getElementById("asetMsg"); if (asetMsg) { asetMsg.style.display = "none"; asetMsg.textContent = ""; }
  inputAsetSection.style.display = "block"; location.hash = "#input-aset"; inputAsetSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
function goHome() { inputAsetSection.style.display = "none"; location.hash = "#beranda"; window.scrollTo({ top: 0, behavior: "smooth" }); }
function goKelolaAset() { kelolaAsetSection.classList.add("show"); renderAssetsManager(); location.hash = "#kelola-aset"; kelolaAsetSection.scrollIntoView({ behavior: "smooth", block: "start" }); }

function handleInputAsetClick(e) { if(e) e.preventDefault(); if (!requirePegawai_(e)) return; if (isAdminLoggedIn()) showInputAsetSection(); else openAdminModal("input-aset"); }
function handleKelolaAsetClick(e) { if(e) e.preventDefault(); if (!requirePegawai_(e)) return; if (isAdminLoggedIn()) goKelolaAset(); else openAdminModal("kelola-aset"); }
function handleRequestClick(e) { if(e) e.preventDefault(); if (!requirePegawai_(e)) return; openRequestModal(); }

inputAsetLink.addEventListener("click", handleInputAsetClick);
kelolaAsetLink.addEventListener("click", handleKelolaAsetClick);
requestLink.addEventListener("click", handleRequestClick);

mobileInputAsetLink.addEventListener("click", (e) => { closeMobileNav(); handleInputAsetClick(e); });
mobileKelolaAsetLink.addEventListener("click", (e) => { closeMobileNav(); handleKelolaAsetClick(e); });
mobileRequestPerbaikanLink.addEventListener("click", (e) => { closeMobileNav(); handleRequestClick(e); });
riwayatNavLink.addEventListener("click", (e) => { requirePegawai_(e); });
mobileRiwayatNavLink.addEventListener("click", (e) => { if (!requirePegawai_(e)) return; closeMobileNav(); });

// =========================
// Monitoring from localStorage (aset)
// =========================
function loadAssets() { try { const raw = localStorage.getItem(ASSET_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveAssets(assets) { localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(assets)); }
function computeMonitoringFromAssets(assets) {
  let baik = 0, perbaiki = 0, rusak = 0;
  for (const a of assets) { if (a.kondisi === "baik") baik++; else if (a.kondisi === "diperbaiki") perbaiki++; else if (a.kondisi === "rusak") rusak++; }
  return { total: assets.length, baik, perbaiki, rusak };
}
function setDonutSegments({ baik, perbaiki, rusak, total }) {
  const r = 42; const C = 2 * Math.PI * r; const safeTotal = Math.max(total, 1);
  const pBaik = baik / safeTotal, pPer = perbaiki / safeTotal, pRus = rusak / safeTotal;
  const lenBaik = C * pBaik, lenPer = C * pPer, lenRus = C * pRus;
  document.getElementById("seg-baik").style.strokeDasharray = `${lenBaik} ${C - lenBaik}`;
  document.getElementById("seg-perbaiki").style.strokeDasharray = `${lenPer} ${C - lenPer}`;
  document.getElementById("seg-rusak").style.strokeDasharray = `${lenRus} ${C - lenRus}`;
  document.getElementById("seg-baik").style.strokeDashoffset = `0`;
  document.getElementById("seg-perbaiki").style.strokeDashoffset = `${-lenBaik}`;
  document.getElementById("seg-rusak").style.strokeDashoffset = `${-(lenBaik + lenPer)}`;
  document.getElementById("legend-baik").textContent = baik; document.getElementById("legend-perbaiki").textContent = perbaiki; document.getElementById("legend-rusak").textContent = rusak;
  document.getElementById("pct-baik").textContent = `(${Math.round(pBaik * 100)}%)`; document.getElementById("pct-perbaiki").textContent = `(${Math.round(pPer * 100)}%)`; document.getElementById("pct-rusak").textContent = `(${Math.round(pRus * 100)}%)`;
  document.getElementById("donut-total").textContent = total;
}
function setMonitoringData({ total, baik, perbaiki, rusak }) {
  document.getElementById("kpi-total").textContent = total; document.getElementById("kpi-baik").textContent = baik; document.getElementById("kpi-perbaiki").textContent = perbaiki; document.getElementById("kpi-rusak").textContent = rusak;
  setDonutSegments({ baik, perbaiki, rusak, total });
}
function refreshMonitoringFromAssets() { const assets = loadAssets(); setMonitoringData(computeMonitoringFromAssets(assets)); }

// =========================
// ASET CRUD
// =========================
const inputAsetForm = document.getElementById("inputAsetForm");
const btnTidakSimpan = document.getElementById("btnTidakSimpan");
const asetMsg = document.getElementById("asetMsg");
const btnSimpanAset = document.getElementById("btnSimpanAset");

function showAsetMsg(text, ok) { asetMsg.style.display = "block"; asetMsg.style.color = ok ? "#166534" : "#b91c1c"; asetMsg.textContent = text; }
btnTidakSimpan.addEventListener("click", () => { inputAsetForm.reset(); goHome(); });
function makeAssetId() { if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID(); return "asset_" + Date.now() + "_" + Math.random().toString(16).slice(2); }

inputAsetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isPegawai()) { openPegawaiModal(); return; }
  if (!isAdminLoggedIn()) { showAsetMsg("Akses ditolak. Silakan login admin.", false); openAdminModal("input-aset"); return; }
  if (!ASSET_API_URL) { showAsetMsg("ASSET_API_URL belum diisi.", false); return; }

  const ok = confirm("Simpan data aset ke Google Spreadsheet?"); if (!ok) return;
  const assetId = makeAssetId();
  const payload = {
    mode: "create", sessionToken: getAdminToken(), assetId,
    namaAset: document.getElementById("asetNama").value.trim(), merek: document.getElementById("merek").value.trim(),
    lokasiAset: document.getElementById("asetLokasi").value.trim(), kondisi: document.getElementById("asetKondisi").value,
    keterangan: document.getElementById("asetKeterangan").value.trim()
  };

  btnSimpanAset.disabled = true; btnSimpanAset.textContent = "Menyimpan...";
  try {
    const data = await guardUnauthorizedAdmin(apiPost(payload));
    if (!data.ok) { showAsetMsg("Gagal menyimpan: " + (data.error || "Unknown error"), false); return; }
    const assets = loadAssets();
    assets.unshift({ assetId, tanggal: new Date().toISOString(), namaAset: payload.namaAset, merek: payload.merek, lokasiAset: payload.lokasiAset, kondisi: payload.kondisi, keterangan: payload.keterangan });
    saveAssets(assets); refreshMonitoringFromAssets(); renderAssetsManager();
    showAsetMsg("Berhasil disimpan.", true); inputAsetForm.reset(); setTimeout(goHome, 500);
  } catch (err) { showAsetMsg("Gagal menyimpan: " + String(err), false); } 
  finally { btnSimpanAset.disabled = false; btnSimpanAset.textContent = "Simpan"; }
});

const assetsTbody = document.getElementById("assetsTbody");
const selectAllAssetsBtn = document.getElementById("selectAllAssetsBtn");
const unselectAllAssetsBtn = document.getElementById("unselectAllAssetsBtn");
const deleteSelectedAssetsBtn = document.getElementById("deleteSelectedAssetsBtn");

function renderAssetsManager() {
  if (!isPegawai()) { assetsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:18px;white-space:normal;">Silakan login pegawai untuk mengakses fitur internal.</td></tr>`; return; }
  if (!isAdminLoggedIn()) { assetsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:18px;white-space:normal;">Silakan login admin untuk melihat data aset.</td></tr>`; return; }
  const assets = loadAssets();
  assetsTbody.innerHTML = "";
  if (assets.length === 0) { assetsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:18px;white-space:normal;">Belum ada data aset (lokal).</td></tr>`; return; }
  assets.forEach((a, idx) => {
    const tr = document.createElement("tr"); const chipClass = a.kondisi === "baik" ? "baik" : (a.kondisi === "diperbaiki" ? "diperbaiki" : "rusak");
    tr.innerHTML = `<td><input type="checkbox" class="asset-checkbox" data-index="${idx}"></td><td>${escapeHtml(a.assetId || "-")}</td><td>${formatIso(a.tanggal)}</td><td class="wrap">${escapeHtml(a.namaAset || "-")}</td><td class="wrap">${escapeHtml(a.merek || "-")}</td><td class="wrap">${escapeHtml(a.lokasiAset || "-")}</td><td><span class="chip ${chipClass}">${escapeHtml(a.kondisi || "-")}</span></td><td class="wrap">${escapeHtml(a.keterangan || "-")}</td>`;
    assetsTbody.appendChild(tr);
  });
}

function setAllAssetCheckboxes(checked) { document.querySelectorAll(".asset-checkbox").forEach(c => { c.checked = checked; }); }
function getSelectedAssetIndexes() { return Array.from(document.querySelectorAll(".asset-checkbox")).filter(c => c.checked).map(c => Number(c.getAttribute("data-index"))).filter(n => Number.isFinite(n)); }
selectAllAssetsBtn.addEventListener("click", () => { if (isAdminLoggedIn()) setAllAssetCheckboxes(true); });
unselectAllAssetsBtn.addEventListener("click", () => { if (isAdminLoggedIn()) setAllAssetCheckboxes(false); });

deleteSelectedAssetsBtn.addEventListener("click", async () => {
  if (!isPegawai()) { openPegawaiModal(); return; } if (!isAdminLoggedIn()) { alert("Akses ditolak. Silakan login admin."); openAdminModal("kelola-aset"); return; }
  const selected = getSelectedAssetIndexes(); if (selected.length === 0) { alert("Belum ada aset yang dipilih."); return; }
  const ok = confirm(`Yakin hapus ${selected.length} aset? Ini akan menghapus di Sheet dan lokal.`); if (!ok) return;

  const assets = loadAssets(); const idxDesc = [...selected].sort((a,b)=>b-a);
  deleteSelectedAssetsBtn.disabled = true; const oldText = deleteSelectedAssetsBtn.textContent; deleteSelectedAssetsBtn.textContent = "Menghapus...";

  try {
    for (const idx of idxDesc) {
      const assetId = String((assets[idx] || {}).assetId || "").trim(); if (!assetId) continue;
      const out = await guardUnauthorizedAdmin(apiPost({ mode: "delete", sessionToken: getAdminToken(), assetId }));
      if (!out.ok) { alert("Gagal hapus assetId: " + assetId + "\n" + (out.error || "Unknown error")); return; }
    }
    for (const idx of idxDesc) assets.splice(idx, 1);
    saveAssets(assets); renderAssetsManager(); refreshMonitoringFromAssets(); alert("Berhasil menghapus.");
  } catch (err) { alert("Error hapus: " + String(err)); } finally { deleteSelectedAssetsBtn.disabled = false; deleteSelectedAssetsBtn.textContent = oldText || "Hapus yang Dipilih"; }
});

// =========================
// PENGAJUAN PERBAIKAN
// =========================
const requestOverlay = document.getElementById("requestModalOverlay");
const requestCloseBtn = document.getElementById("requestModalCloseBtn");
const requestCancelBtn = document.getElementById("requestModalCancelBtn");
const requestForm = document.getElementById("requestPerbaikanForm");
const fotoInput = document.getElementById("fotoAset");
const previewWrap = document.getElementById("fotoPreview");
const previewImg = document.getElementById("fotoPreviewImg");
const btnKirimRequest = document.getElementById("btnKirimRequest");

function openRequestModal() { requestOverlay.classList.add("show"); requestOverlay.setAttribute("aria-hidden", "false"); setTimeout(() => document.getElementById("namaPemohon")?.focus(), 50); }
function closeRequestModal() { requestOverlay.classList.remove("show"); requestOverlay.setAttribute("aria-hidden", "true"); }
requestCloseBtn.addEventListener("click", closeRequestModal); requestCancelBtn.addEventListener("click", closeRequestModal); requestOverlay.addEventListener("click", (e) => { if (e.target === requestOverlay) closeRequestModal(); });
fotoInput.addEventListener("change", () => {
  const file = fotoInput.files && fotoInput.files[0]; if (!file) { previewWrap.classList.remove("show"); previewImg.removeAttribute("src"); return; }
  const url = URL.createObjectURL(file); previewImg.src = url; previewWrap.classList.add("show");
});

requestForm.addEventListener("submit", async (e) => {
  e.preventDefault(); if (!isPegawai()) { openPegawaiModal(); return; } if (!ASSET_API_URL) { alert("ASSET_API_URL belum diisi."); return; }
  const data = new FormData(requestForm); const file = fotoInput.files && fotoInput.files[0]; if (!file) { alert("Foto wajib diisi."); return; }
  btnKirimRequest.disabled = true; btnKirimRequest.textContent = "Mengirim...";

  try {
    const fotoBase64 = await compressImageToDataUrl(file, 200, 0.7);
    const payload = {
      mode: "reportCreate", pegawaiToken: getPegawaiToken(), namaPemohon: String(data.get("namaPemohon") || "").trim(),
      namaAset: String(data.get("namaAset") || "").trim(), lokasiAset: String(data.get("lokasiAset") || "").trim(),
      tingkat: String(data.get("tingkatKerusakan") || "").trim(), deskripsi: String(data.get("deskripsiKerusakan") || "").trim(), fotoBase64
    };
    const serverResp = await guardUnauthorizedPegawai(apiPost(payload));
    if (!serverResp.ok) { alert("Gagal kirim pengajuan: " + (serverResp.error || "Unknown error")); return; }
    if (serverResp.report) { sendEmailNotifikasiPerbaikan(serverResp.report).catch(function(e){ console.warn("EmailJS warning:", e); }); }
    requestForm.reset(); previewWrap.classList.remove("show"); previewImg.removeAttribute("src"); closeRequestModal(); await refreshReports(); alert("Pengajuan perbaikan berhasil dikirim.");
  } catch (err) { alert("Error saat kirim pengajuan: " + String(err)); } finally { btnKirimRequest.disabled = false; btnKirimRequest.textContent = "Kirim Pengajuan"; }
});

// =========================
// REPORTS
// =========================
const reportsTbody = document.getElementById("reportsTbody");
const clearReportsBtn = document.getElementById("clearReportsBtn");
const reportsCards = document.getElementById("reportsCards");
const selectAllReportsBtn = document.getElementById("selectAllReportsBtn");
const deleteSelectedReportsBtn = document.getElementById("deleteSelectedReportsBtn");
const deleteAllReportsBtn = document.getElementById("deleteAllReportsBtn");

async function fetchReportsFromSheet() {
  const data = await guardUnauthorizedPegawai(apiPost({ mode: "reportList", pegawaiToken: getPegawaiToken() }));
  if (!data.ok) throw new Error(data.error || "Gagal mengambil laporan");
  return Array.isArray(data.reports) ? data.reports : [];
}

function setAllReportCheckboxes(checked) { document.querySelectorAll(".report-checkbox").forEach(cb => { cb.checked = checked; }); }
function getSelectedReportIds() {
  return Array.from(document.querySelectorAll(".report-checkbox"))
    .filter(cb => cb.checked)
    .map(cb => cb.getAttribute("data-reportid"))
    .filter(Boolean);
}
function bindReportCheckboxSync() {
  document.querySelectorAll(".report-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-reportid");
      const checked = e.target.checked;
      if (!id) return;
      const selector = `.report-checkbox[data-reportid="${CSS.escape(id)}"]`;
      document.querySelectorAll(selector).forEach(x => { if (x !== e.target) x.checked = checked; });
    });
  });
}

async function deleteManyReportsFromSheet(reportIds) {
  return guardUnauthorizedAdmin(apiPost({ mode: "reportDeleteMany", sessionToken: getAdminToken(), reportIds }));
}
async function deleteAllReportsFromSheet() {
  return guardUnauthorizedAdmin(apiPost({ mode: "reportDeleteAll", sessionToken: getAdminToken() }));
}

function renderReportsFromData(reports) {
  reportsTbody.innerHTML = "";
  reportsCards.innerHTML = "";
  if (!reports || reports.length === 0) {
    reportsTbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#6b7280;padding:18px;">Belum ada laporan.</td></tr>`;
    reportsCards.innerHTML = `<div style="text-align:center;color:#6b7280;font-weight:900;padding:12px;">Belum ada laporan.</div>`;
    return;
  }

  const isAdmin = isAdminLoggedIn();

  reports.forEach((r) => {
    const status = normalizeStatus(r.status || "Dilaporkan");
    const tingkat = String(r.tingkat || "").toLowerCase();
    const badgeClass = tingkat === "ringan" ? "ringan" : (tingkat === "sedang" ? "sedang" : "berat");

    const fotoUrl = driveViewUrlFromFileId(r.fotoFileId);
    const fotoCell = fotoUrl ? `<a href="${escapeHtml(fotoUrl)}" target="_blank" rel="noopener noreferrer">Buka Foto</a>` : "-";
    const statusCell = `<span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>`;

    const selectCell = isAdmin
      ? `<input type="checkbox" class="report-checkbox" data-reportid="${escapeHtml(r.reportId)}">`
      : `<span style="color:#64748b;font-weight:900;">-</span>`;

    const adminActionCell = isAdmin
      ? `<select class="report-status-select" data-reportid="${escapeHtml(r.reportId)}">
           <option value="Dilaporkan" ${status === "Dilaporkan" ? "selected" : ""}>Dilaporkan</option>
           <option value="Proses" ${status === "Proses" ? "selected" : ""}>Proses</option>
           <option value="Sudah di perbaiki" ${status === "Sudah di perbaiki" ? "selected" : ""}>Sudah di perbaiki</option>
         </select>`
      : `<span style="color:#64748b;font-weight:900;">-</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${selectCell}</td>
      <td>${formatIso(r.tanggal)}</td>
      <td>${escapeHtml(r.namaPemohon || "-")}</td>
      <td>${escapeHtml(r.namaAset || "-")}</td>
      <td>${escapeHtml(r.lokasiAset || "-")}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(tingkat || "-")}</span></td>
      <td>${statusCell}</td>
      <td>${escapeHtml(r.deskripsi || "-")}</td>
      <td>${fotoCell}</td>
      <td>${adminActionCell}</td>
    `;
    reportsTbody.appendChild(tr);
  });

  reports.forEach((r) => {
    const status = normalizeStatus(r.status || "Dilaporkan");
    const tingkat = String(r.tingkat || "").toLowerCase();
    const badgeClass = tingkat === "ringan" ? "ringan" : (tingkat === "sedang" ? "sedang" : "berat");

    const fotoUrl = driveViewUrlFromFileId(r.fotoFileId);
    const fotoBlock = fotoUrl
      ? `<div class="rc-row"><div class="k">Foto</div><div class="v"><a href="${escapeHtml(fotoUrl)}" target="_blank" rel="noopener noreferrer">Buka Foto</a></div></div>`
      : `<div class="rc-row"><div class="k">Foto</div><div class="v">-</div></div>`;

    const selectBlock = isAdmin
      ? `<div class="rc-row"><div class="k">Pilih</div><div class="v rc-select"><label for="rcb_${escapeHtml(r.reportId)}">Centang</label><input id="rcb_${escapeHtml(r.reportId)}" type="checkbox" class="report-checkbox" data-reportid="${escapeHtml(r.reportId)}"></div></div>`
      : ``;

    const actionBlock = isAdmin
      ? `<div class="rc-row"><div class="k">Aksi</div><div class="v"><select class="report-status-select" data-reportid="${escapeHtml(r.reportId)}"><option value="Dilaporkan" ${status === "Dilaporkan" ? "selected" : ""}>Dilaporkan</option><option value="Proses" ${status === "Proses" ? "selected" : ""}>Proses</option><option value="Sudah di perbaiki" ${status === "Sudah di perbaiki" ? "selected" : ""}>Sudah di perbaiki</option></select></div></div>`
      : `<div class="rc-row"><div class="k">Aksi</div><div class="v">-</div></div>`;

    const card = document.createElement("div");
    card.className = "report-card";
    card.innerHTML = `
      <div class="rc-head">
        <div class="date">${formatIso(r.tanggal)}</div>9
        <div class="meta">
          <span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span>
          <span class="badge ${badgeClass}">${escapeHtml(tingkat || "-")}</span>
        </div>
      </div>
      <div class="rc-body">
        <div class="rc-row"><div class="k">Pemohon</div><div class="v">${escapeHtml(r.namaPemohon || "-")}</div></div>
        <div class="rc-row"><div class="k">Nama Aset</div><div class="v">${escapeHtml(r.namaAset || "-")}</div></div>
        <div class="rc-row"><div class="k">Lokasi</div><div class="v">${escapeHtml(r.lokasiAset || "-")}</div></div>
        <div><div class="k" style="margin-bottom:6px;">Deskripsi</div><div class="rc-desc">${escapeHtml(r.deskripsi || "-")}</div></div>
        ${fotoBlock}
        ${selectBlock}
        ${actionBlock}
      </div>
    `;
    reportsCards.appendChild(card);
  });

  if (isAdminLoggedIn()) {
    document.querySelectorAll(".report-status-select").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const reportId = e.target.getAttribute("data-reportid");
        const status = normalizeStatus(e.target.value);
        try {
          const out = await guardUnauthorizedAdmin(apiPost({ mode: "reportUpdateStatus", sessionToken: getAdminToken(), reportId, status }));
          if (!out.ok) throw new Error(out.error || "Gagal update status");
          await refreshReports();
        } catch (err) {
          alert("Gagal update status: " + String(err));
        }
      });
    });
    bindReportCheckboxSync();
  }
}

async function refreshReports() {
  if (!isPegawai()) return;
  const reports = await fetchReportsFromSheet();
  renderReportsFromData(reports);
}

clearReportsBtn.addEventListener("click", async () => {
  if (!isPegawai()) { openPegawaiModal(); return; }
  try { await refreshReports(); }
  catch (err) { alert("Gagal refresh: " + String(err)); }
});

selectAllReportsBtn.addEventListener("click", () => { if (isAdminLoggedIn()) setAllReportCheckboxes(true); });

deleteSelectedReportsBtn.addEventListener("click", async () => {
  if (!isAdminLoggedIn()) return;
  const ids = getSelectedReportIds();
  if (ids.length === 0) { alert("Belum ada laporan yang dipilih."); return; }

  const ok = confirm(`Yakin hapus ${ids.length} laporan yang dipilih?`);
  if (!ok) return;

  deleteSelectedReportsBtn.disabled = true;
  const old = deleteSelectedReportsBtn.innerHTML;
  deleteSelectedReportsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menghapus...`;

  try {
    const out = await deleteManyReportsFromSheet(ids);
    if (!out.ok) throw new Error(out.error || "Gagal menghapus");
    await refreshReports();
    alert(`Berhasil menghapus ${out.deleted || 0} laporan.`);
  } catch (err) {
    alert("Gagal hapus laporan: " + String(err));
  } finally {
    deleteSelectedReportsBtn.disabled = false;
    deleteSelectedReportsBtn.innerHTML = old;
  }
});

deleteAllReportsBtn.addEventListener("click", async () => {
  if (!isAdminLoggedIn()) return;
  const ok = confirm("Yakin hapus SEMUA riwayat laporan?");
  if (!ok) return;

  deleteAllReportsBtn.disabled = true;
  const old = deleteAllReportsBtn.innerHTML;
  deleteAllReportsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menghapus...`;

  try {
    const out = await deleteAllReportsFromSheet();
    if (!out.ok) throw new Error(out.error || "Gagal menghapus semua");
    await refreshReports();
    alert(`Semua riwayat terhapus (${out.deleted || 0} baris).`);
  } catch (err) {
    alert("Gagal hapus semua: " + String(err));
  } finally {
    deleteAllReportsBtn.disabled = false;
    deleteAllReportsBtn.innerHTML = old;
  }
});

function applyAdminUI() {
  const ok = isAdminLoggedIn();
  selectAllReportsBtn.style.display = ok ? "inline-flex" : "none";
  deleteSelectedReportsBtn.style.display = ok ? "inline-flex" : "none";
  deleteAllReportsBtn.style.display = ok ? "inline-flex" : "none";

  renderAssetsManager();
  refreshReports().catch(()=>{});
  applyPegawaiUI();
}

(async function init() {
  refreshMonitoringFromAssets();
  await verifyPegawaiTokenOnLoad();
  await verifyAdminTokenOnLoad();
  applyPegawaiUI();
  applyAdminUI();
  refreshReports().catch(()=>{});
})();
