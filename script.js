// =========================
// =========================

// FUNGSI: Mengubah tampilan menu navigasi atas (navbar) menjadi gelap atau memunculkan bayangan saat halaman digeser (scroll) ke bawah.
// Navbar Scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// FUNGSI: Membuat efek animasi angka berjalan dari angka 0 menuju angka target (digunakan untuk menampilkan total aset di dashboard).
// Count-Up Animation
function animateValue(id, target) {
  const obj = document.getElementById(id);
  if (!obj) return;
  obj.innerHTML = "0";
  if (target === 0) return;
  
  let start = 0;
  const duration = 1500;
  const step = Math.max(1, Math.ceil(target / (duration / 16)));
  
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      obj.innerHTML = target;
      clearInterval(timer);
    } else {
      obj.innerHTML = start;
    }
  }, 16);
}

// =========================
// SLIDER GALERI JS
// =========================
// FUNGSI: Mengatur tombol panah kiri-kanan untuk menggeser foto-foto pada bagian Galeri Fasilitas.
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
// EmailJS init
// =========================
// FUNGSI: Menghubungkan website dengan layanan pengirim email agar otomatis mengirim email notifikasi ke "sinatriarupa@gmail.com" saat ada laporan kerusakan baru.
emailjs.init({ publicKey: 'dLdHcee9nQkCWdVcY' });

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
// FUNGSI: Menyimpan link alamat database (Google Apps Script) dan nama kunci untuk menyimpan status login (token) di browser.
const ASSET_API_URL = "https://script.google.com/macros/s/AKfycbxuljT0z6zX62O1tooLzMhzID7X7vPnKgf0AT5ntKNFwHMzboovkwtgTBWC-coyzIAi/exec";
const ADMIN_TOKEN_KEY = "sinatria_admin_token";
const PEGAWAI_TOKEN_KEY = "sinatria_pegawai_token";
const ASSET_STORAGE_KEY = "sinatria_assets_v1";

// =========================
// HELPERS
// =========================
// FUNGSI: Kumpulan kode bantuan. escapeHtml untuk mencegah kode berbahaya, safeJsonParse untuk membaca data tanpa error, dan apiPost untuk tugas mengirim data ke database Google Sheet.
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
// FUNGSI: Menyimpan, mengambil, dan menghapus kunci akses (token) login Admin dan Pegawai agar tidak perlu login berulang kali.
function getAdminToken() { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ""; }
function setAdminToken(token) { sessionStorage.setItem(ADMIN_TOKEN_KEY, token); }
function clearAdminToken() { sessionStorage.removeItem(ADMIN_TOKEN_KEY); }
function isAdminLoggedIn() { return Boolean(getAdminToken()); }

function getPegawaiToken() { return sessionStorage.getItem(PEGAWAI_TOKEN_KEY) || ""; }
function setPegawaiToken(token) { sessionStorage.setItem(PEGAWAI_TOKEN_KEY, token); }
function clearPegawaiToken() { sessionStorage.removeItem(PEGAWAI_TOKEN_KEY); }
function isPegawai() { return Boolean(getPegawaiToken()); }

// FUNGSI: Mengecek apakah sesi login sudah habis (kedaluwarsa) dan memaksa pengguna keluar (logout) jika sudah habis.
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
// FUNGSI: Mengirim data email dan password ke server untuk dicek apakah benar saat login, dan memberitahu server saat logout.
async function authLogin(email, password) { return apiPost({ mode: "authLogin", email, password }); }
async function authLogout() { const token = getAdminToken(); if (!token) return { ok: true }; return apiPost({ mode: "authLogout", sessionToken: token }); }

function forceAdminLogout(reason) {
  if (reason) console.warn("Admin logout:", reason);
  authLogout().catch(()=>{}); clearAdminToken(); updateNavigationUI();
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
  pegawaiLogout().catch(()=>{}); 
  clearPegawaiToken(); 
  updateNavigationUI();
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
// FUNGSI: Mengubah ID gambar menjadi link Google Drive, merapikan format tampilan tanggal (DD/MM/YYYY), mewarnai tombol status, dan memperkecil ukuran memori foto sebelum dikirim.
function driveViewUrlFromFileId(fileId) { const id = String(fileId || "").trim(); return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` : ""; }
function formatIso(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "-");
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
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
// FUNGSI: Mengatur tombol garis tiga (hamburger menu) untuk membuka atau menutup layar menu navigasi saat di HP.
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
// UI APPLY (PENGGABUNGAN MENU PEGAWAI & ADMIN)
// =========================
// FUNGSI: Menyembunyikan menu rahasia (Kelola Aset, Input Aset, Riwayat) jika belum login, dan memunculkannya otomatis jika sudah login sebagai Pegawai atau Admin.
const pegawaiAccessLink = document.getElementById("pegawaiAccessLink");
const mobilePegawaiAccessLink = document.getElementById("mobilePegawaiAccessLink");
const riwayatSection = document.getElementById("riwayat");
const riwayatNavLink = document.getElementById("riwayatNavLink");
const mobileRiwayatNavLink = document.getElementById("mobileRiwayatNavLink");

// Target elemen Navbar List (LI)
const navAdminLogin = document.getElementById("navAdminLogin");
const navAdminLogout = document.getElementById("navAdminLogout");
const navPegawaiLogout = document.getElementById("navPegawaiLogout");

// Target elemen Mobile Sidebar (A)
const mobileAdminLoginBtn = document.getElementById("mobileAdminLoginBtn");
const mobileAdminLogoutBtn = document.getElementById("mobileAdminLogoutBtn");
const mobilePegawaiLogoutBtn = document.getElementById("mobilePegawaiLogoutBtn");

function updateNavigationUI() {
  const adminOk = isAdminLoggedIn();
  const pegawaiOk = isPegawai() || adminOk;

  // 1. Visibilitas Menu Navigasi Internal
  document.getElementById("kelolaAsetLink").parentElement.style.display = pegawaiOk ? "" : "none";
  document.getElementById("inputAsetLink").parentElement.style.display = pegawaiOk ? "" : "none";
  document.getElementById("requestPerbaikanLink").parentElement.style.display = pegawaiOk ? "" : "none";
  document.getElementById("riwayatNavLink").parentElement.style.display = pegawaiOk ? "" : "none";

  document.getElementById("mobileKelolaAsetLink").style.display = pegawaiOk ? "flex" : "none";
  document.getElementById("mobileInputAsetLink").style.display = pegawaiOk ? "flex" : "none";
  document.getElementById("mobileRequestPerbaikanLink").style.display = pegawaiOk ? "flex" : "none";
  document.getElementById("mobileRiwayatNavLink").style.display = pegawaiOk ? "flex" : "none";

  // Akses Pegawai menu hanya muncul jika belum login satupun
  const showAksesPegawai = !pegawaiOk;
  document.getElementById("pegawaiAccessLink").parentElement.style.display = showAksesPegawai ? "" : "none";
  document.getElementById("mobilePegawaiAccessLink").style.display = showAksesPegawai ? "flex" : "none";

  if (!pegawaiOk) { 
    riwayatSection.classList.remove("show"); 
    document.getElementById("kelola-aset").classList.remove("show"); 
    document.getElementById("input-aset").style.display = "none"; 
  } else { 
    riwayatSection.classList.add("show"); 
  }

  // 2. Logika Visibilitas Tombol Login/Logout
  if (adminOk) {
    navAdminLogin.style.display = "none";
    navAdminLogout.style.display = "block";
    navPegawaiLogout.style.display = "none";

    mobileAdminLoginBtn.style.display = "none";
    mobileAdminLogoutBtn.style.display = "flex";
    mobilePegawaiLogoutBtn.style.display = "none";
  } else if (isPegawai()) {
    navAdminLogin.style.display = "block";
    navAdminLogout.style.display = "none";
    navPegawaiLogout.style.display = "block";

    mobileAdminLoginBtn.style.display = "flex";
    mobileAdminLogoutBtn.style.display = "none";
    mobilePegawaiLogoutBtn.style.display = "flex";
  } else {
    navAdminLogin.style.display = "block";
    navAdminLogout.style.display = "none";
    navPegawaiLogout.style.display = "none";

    mobileAdminLoginBtn.style.display = "flex";
    mobileAdminLogoutBtn.style.display = "none";
    mobilePegawaiLogoutBtn.style.display = "none";
  }

  // 3. Tombol Aksi Admin di Tabel Laporan
  selectAllReportsBtn.style.display = adminOk ? "inline-flex" : "none";
  deleteSelectedReportsBtn.style.display = adminOk ? "inline-flex" : "none";
  deleteAllReportsBtn.style.display = adminOk ? "inline-flex" : "none";

  renderAssetsManager();
}

// Pegawai Modal
// FUNGSI: Mengatur fungsi buka-tutup kotak peringatan (pop-up) untuk memasukkan password Pegawai dan memproses klik tombol logut.
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
    updateNavigationUI();
    await refreshReports().catch(()=>{});
    alert("Akses pegawai dibuka.");
  } catch (err) { pegawaiErr.textContent = "Login pegawai gagal: " + String(err); pegawaiErr.style.display = "block"; }
});

const pegawaiLogoutBtn = document.getElementById("pegawaiLogoutBtn");
async function logoutPegawaiFlow() { const ok = confirm("Logout pegawai?"); if (!ok) return; forcePegawaiLogout("manual logout pegawai"); alert("Logout pegawai berhasil."); }
pegawaiLogoutBtn.addEventListener("click", logoutPegawaiFlow);
mobilePegawaiLogoutBtn.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); logoutPegawaiFlow(); });

function requirePegawai_(e) {
  if (isPegawai() || isAdminLoggedIn()) return true;
  if(e) e.preventDefault();
  openPegawaiModal(); return false;
}

// Admin Modal
// FUNGSI: Mengatur fungsi buka-tutup kotak peringatan (pop-up) untuk memasukkan email & sandi khusus Admin, serta fungsi klik tombol logout Admin.
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
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
    closeAdminModal(); 
    updateNavigationUI();
    await refreshReports().catch(()=>{});
    if (adminAfterLoginTarget === "input-aset") showInputAsetSection();
    if (adminAfterLoginTarget === "kelola-aset") goKelolaAset();
  } catch (err) { adminLoginError.textContent = "Login gagal: " + String(err); adminLoginError.style.display = "block"; }
});

async function logoutAdminFlow() { const ok = confirm("Logout admin?"); if (!ok) return; forceAdminLogout("manual logout"); }
adminLogoutBtn.addEventListener("click", logoutAdminFlow);
mobileAdminLogoutBtn.addEventListener("click", (e) => { e.preventDefault(); closeMobileNav(); logoutAdminFlow(); });

// =========================
// NAVIGASI INTERNAL 
// =========================
// FUNGSI: Mengatur efek pindah-pindah halaman atau bagian website tanpa memuat ulang (refresh) halaman sepenuhnya.
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
// Monitoring from localStorage
// =========================
// FUNGSI: Membaca jumlah dan data kondisi aset dari penyimpanan memori HP/Komputer untuk kemudian digambar menjadi diagram lingkaran (donut chart).
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
  
  animateValue("donut-total", total);
  animateValue("kpi-total", total);
  animateValue("kpi-baik", baik);
  animateValue("kpi-perbaiki", perbaiki);
  animateValue("kpi-rusak", rusak);
}
function setMonitoringData(data) {
  setDonutSegments(data);
}
function refreshMonitoringFromAssets() { const assets = loadAssets(); setMonitoringData(computeMonitoringFromAssets(assets)); }

// =========================
// ASET CRUD
// =========================
// FUNGSI: Mengurus sistem tambah data aset, tampilkan data aset ke dalam tabel "Kelola Aset", serta fitur pilih dan hapus data (khusus admin).
const inputAsetForm = document.getElementById("inputAsetForm");
const btnTidakSimpan = document.getElementById("btnTidakSimpan");
const asetMsg = document.getElementById("asetMsg");
const btnSimpanAset = document.getElementById("btnSimpanAset");

function showAsetMsg(text, ok) { asetMsg.style.display = "block"; asetMsg.style.color = ok ? "#166534" : "#b91c1c"; asetMsg.textContent = text; }
function makeAssetId() { if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID(); return "asset_" + Date.now() + "_" + Math.random().toString(16).slice(2); }

btnTidakSimpan.addEventListener("click", () => { inputAsetForm.reset(); goHome(); });

inputAsetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isPegawai() && !isAdminLoggedIn()) { openPegawaiModal(); return; }
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
  if (!(isPegawai() || isAdminLoggedIn())) { assetsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:18px;white-space:normal;">Silakan login pegawai untuk mengakses fitur internal.</td></tr>`; return; }
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
  if (!isPegawai() && !isAdminLoggedIn()) { openPegawaiModal(); return; } 
  if (!isAdminLoggedIn()) { alert("Akses ditolak. Silakan login admin."); openAdminModal("kelola-aset"); return; }
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
// FUNGSI: Mengatur kotak pengisian form untuk mengirim Laporan Perbaikan, memproses tampilan foto, lalu mengirim datanya ke server (database).
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
  e.preventDefault(); 
  if (!isPegawai() && !isAdminLoggedIn()) { openPegawaiModal(); return; } 
  if (!ASSET_API_URL) { alert("ASSET_API_URL belum diisi."); return; }
  
  const data = new FormData(requestForm); 
  const file = fotoInput.files && fotoInput.files[0]; 
  if (!file) { alert("Foto wajib diisi."); return; }
  
  btnKirimRequest.disabled = true; btnKirimRequest.textContent = "Mengirim...";

  try {
    const fotoBase64 = await compressImageToDataUrl(file, 200, 0.7);
    
    const payload = {
      mode: "reportCreate", 
      namaPemohon: String(data.get("namaPemohon") || "").trim(),
      namaAset: String(data.get("namaAset") || "").trim(), 
      lokasiAset: String(data.get("lokasiAset") || "").trim(),
      tingkat: String(data.get("tingkatKerusakan") || "").trim(), 
      deskripsi: String(data.get("deskripsiKerusakan") || "").trim(), 
      fotoBase64
    };

    let serverResp;
    // ANTI-TENDANG DITERAPKAN DI SINI JUGA
    if (isAdminLoggedIn()) {
      payload.sessionToken = getAdminToken();
      serverResp = await apiPost(payload); // Dipanggil langsung tanpa guard
      if (!serverResp.ok && isUnauthorizedError(serverResp.error)) {
        alert("GAGAL: Backend menolak. Pastikan Apps Script sudah di-Deploy ulang (New Version)!");
        btnKirimRequest.disabled = false; btnKirimRequest.textContent = "Kirim Pengajuan";
        return;
      } else if (!serverResp.ok) {
        throw new Error(serverResp.error || "Unknown error");
      }
    } else {
      payload.pegawaiToken = getPegawaiToken();
      serverResp = await guardUnauthorizedPegawai(apiPost(payload));
      if (!serverResp.ok) throw new Error(serverResp.error || "Unknown error");
    }

    if (serverResp.report) { sendEmailNotifikasiPerbaikan(serverResp.report).catch(function(e){ console.warn("EmailJS warning:", e); }); }
    
    requestForm.reset(); previewWrap.classList.remove("show"); previewImg.removeAttribute("src"); closeRequestModal(); 
    
    await refreshReports(); 
    alert("Pengajuan perbaikan berhasil dikirim.");
  } catch (err) { 
    alert("Error saat kirim pengajuan: " + String(err)); 
  } finally { 
    btnKirimRequest.disabled = false; btnKirimRequest.textContent = "Kirim Pengajuan"; 
  }
});

// =========================
// REPORTS
// =========================
// FUNGSI: Mengambil daftar riwayat laporan perbaikan dari Google Sheet lalu menampilkannya di tabel/kartu, serta mengurus tombol ubah status dan hapus untuk admin.
const reportsTbody = document.getElementById("reportsTbody");
const clearReportsBtn = document.getElementById("clearReportsBtn");
const reportsCards = document.getElementById("reportsCards");
const selectAllReportsBtn = document.getElementById("selectAllReportsBtn");
const deleteSelectedReportsBtn = document.getElementById("deleteSelectedReportsBtn");
const deleteAllReportsBtn = document.getElementById("deleteAllReportsBtn");

// PERBAIKAN UTAMA: Fitur Anti-Tendang (Bypass auto-logout guard khusus untuk reportList)
async function fetchReportsFromSheet() {
  let data;
  
  if (isAdminLoggedIn()) {
    // Dipanggil langsung tanpa membungkusnya di guardUnauthorizedAdmin. 
    // Jadi jika server error / URL lama, tidak akan menendang Anda keluar.
    data = await apiPost({ mode: "reportList", sessionToken: getAdminToken() });
    
    if (!data.ok && isUnauthorizedError(data.error)) {
      console.warn("API MENOLAK TOKEN ADMIN: Tolong lakukan 'New Deployment' di Google Apps Script.");
      // Tampilkan notifikasi di web agar Anda tahu tapi tidak terlogout
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="10" style="text-align:center;color:#ef4444;font-weight:bold;padding:18px;">Menunggu Deployment Apps Script Terbaru... (Data tidak dapat dimuat)</td>`;
      reportsTbody.innerHTML = "";
      reportsTbody.appendChild(tr);
      return []; 
    } else if (!data.ok) {
      throw new Error(data.error || "Gagal mengambil laporan");
    }
  } else {
    data = await guardUnauthorizedPegawai(apiPost({ mode: "reportList", pegawaiToken: getPegawaiToken() }));
    if (!data.ok) throw new Error(data.error || "Gagal mengambil laporan");
  }
  
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

async function deleteManyReportsFromSheet(reportIds) { return guardUnauthorizedAdmin(apiPost({ mode: "reportDeleteMany", sessionToken: getAdminToken(), reportIds })); }
async function deleteAllReportsFromSheet() { return guardUnauthorizedAdmin(apiPost({ mode: "reportDeleteAll", sessionToken: getAdminToken() })); }

function renderReportsFromData(reports) {
  // Jika reports kosong hasil dari bypass Anti-Tendang, abaikan perombakan UI default
  if (reports.length === 0 && reportsTbody.innerHTML.includes("Menunggu Deployment")) {
      return;
  }
  
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
        <div class="date">${formatIso(r.tanggal)}</div>
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
  if (!isPegawai() && !isAdminLoggedIn()) return;
  const reports = await fetchReportsFromSheet();
  renderReportsFromData(reports);
}

clearReportsBtn.addEventListener("click", async () => {
  if (!isPegawai() && !isAdminLoggedIn()) { openPegawaiModal(); return; }
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

// FUNGSI: Ini adalah perintah pertama yang otomatis berjalan saat halaman web baru dibuka, seperti mengecek apakah pengguna sudah pernah login sebelumnya.
// Init
(async function init() {
  refreshMonitoringFromAssets();
  await verifyPegawaiTokenOnLoad();
  await verifyAdminTokenOnLoad();
  updateNavigationUI();
  refreshReports().catch(()=>{});
})();
