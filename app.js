const DB_URL =
  (location.hostname === "127.0.0.1" || location.hostname === "localhost")
    ? "./db.json"
    : "https://raw.githubusercontent.com/taolatai001/NNPTUD-Ngay2/main/db.json";

// Nếu bị lỗi CORS/không fetch được thì dùng:
// const DB_URL = "https://cdn.jsdelivr.net/gh/taolatai001/NNPTUD-Ngay2@main/db.json";

const FALLBACK_IMG = "https://placehold.co/600x400";
const $ = (id) => document.getElementById(id);

let ALL = [];
let sortMode = "none"; // name_asc | name_desc | price_asc | price_desc | none

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(x) {
  return new Intl.NumberFormat("vi-VN").format(Number(x || 0));
}

function uniq(arr) {
  return [...new Set(arr)];
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN");
  } catch {
    return "";
  }
}

function buildCategories(items) {
  const cats = uniq(items.map(p => p?.category?.name).filter(Boolean));
  const sel = $("cat");
  sel.innerHTML =
    `<option value="">Tất cả category</option>` +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function getFilteredSorted() {
  const q = $("q").value.trim().toLowerCase();
  const cat = $("cat").value;

  let items = [...ALL];

  if (q) items = items.filter(p => (p?.title || "").toLowerCase().includes(q));
  if (cat) items = items.filter(p => (p?.category?.name || "") === cat);

  if (sortMode === "name_asc") {
    items.sort((a, b) => (a?.title || "").localeCompare(b?.title || "", "vi", { sensitivity: "base" }));
  } else if (sortMode === "name_desc") {
    items.sort((a, b) => (b?.title || "").localeCompare(a?.title || "", "vi", { sensitivity: "base" }));
  } else if (sortMode === "price_asc") {
    items.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
  } else if (sortMode === "price_desc") {
    items.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
  }

  return items;
}

function renderTable(items) {
  const tbody = $("tbody");

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Không có dữ liệu phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const id = p?.id ?? "";
    const title = escapeHtml(p?.title ?? "");
    const price = money(p?.price ?? 0);
    const category = escapeHtml(p?.category?.name ?? "");
    const img = (p?.images && p.images[0]) ? p.images[0] : FALLBACK_IMG;
    const updated = formatDate(p?.updatedAt);

    return `
      <tr>
        <td class="fw-semibold">${id}</td>
        <td class="truncate" title="${title}">${title}</td>
        <td>${price}</td>
        <td>${category}</td>
        <td>
          <img class="thumb" src="${img}" alt="${title}"
               onerror="this.onerror=null; this.src='${FALLBACK_IMG}';">
        </td>
        <td class="text-muted small">${escapeHtml(updated)}</td>
      </tr>
    `;
  }).join("");
}

function applyAll() {
  const pageSize = Number($("pageSize")?.value || 10);

  const filtered = getFilteredSorted();
  const shown = filtered.slice(0, pageSize);

  $("status").textContent =
    `Đang hiển thị ${shown.length}/${filtered.length} (tổng ${ALL.length}) • Sort: ${sortMode}`;

  renderTable(shown);
}

// gõ là lọc ngay
window.handleSearchInput = function () {
  applyAll();
};

// Events
$("btnLoad").addEventListener("click", () => {
  loadData().catch(err => {
    $("status").textContent = "Lỗi: " + err.message;
    $("tbody").innerHTML =
      `<tr><td colspan="6" class="text-danger">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
  });
});

$("cat").addEventListener("change", applyAll);
$("pageSize").addEventListener("change", applyAll);

$("sortNameAsc").addEventListener("click", () => { sortMode = "name_asc"; applyAll(); });
$("sortNameDesc").addEventListener("click", () => { sortMode = "name_desc"; applyAll(); });
$("sortPriceAsc").addEventListener("click", () => { sortMode = "price_asc"; applyAll(); });
$("sortPriceDesc").addEventListener("click", () => { sortMode = "price_desc"; applyAll(); });

async function loadData() {
  $("status").textContent = "Đang tải dữ liệu...";
  $("tbody").innerHTML = `<tr><td colspan="6" class="text-muted">Đang tải...</td></tr>`;

  const res = await fetch(DB_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  ALL = Array.isArray(json) ? json : [];

  buildCategories(ALL);
  sortMode = "none";
  applyAll();
}

// Auto load khi mở trang
loadData().catch(err => {
  $("status").textContent = "Lỗi: " + err.message;
});
