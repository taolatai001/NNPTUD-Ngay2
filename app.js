const DB_URL = (location.hostname === "127.0.0.1" || location.hostname === "localhost")
  ? "./db.json"
  : "https://raw.githubusercontent.com/taolatai001/NNPTUD-Ngay2/main/db.json";


// Nếu bị lỗi CORS/không fetch được thì dùng:
// const DB_URL = "https://cdn.jsdelivr.net/gh/taolatai001/NNPTUD-Ngay2@main/db.json";

const $ = (id) => document.getElementById(id);
let ALL = [];

function uniq(arr){ return [...new Set(arr)]; }

function money(x){
  return new Intl.NumberFormat("vi-VN").format(Number(x || 0));
}

function buildCategories(items){
  const cats = uniq(items.map(p => p?.category?.name).filter(Boolean));
  $("cat").innerHTML =
    `<option value="">Tất cả category</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

function render(items){
  const app = $("app");
  if (!items.length){
    app.innerHTML = `<p class="muted">Không có dữ liệu phù hợp.</p>`;
    return;
  }

  app.innerHTML = items.map(p => {
    const img = (p.images && p.images[0]) ? p.images[0] : "https://placehold.co/600x400";
    const cat = p?.category?.name ?? "";
    return `
      <div class="card">
        <img src="${img}" alt="${p.title ?? ""}">
        <h3>${p.title ?? ""}</h3>
        <div class="muted">#${p.id ?? ""} • ${cat}</div>
        <p>${p.description ?? ""}</p>
        <div class="price">Giá: ${money(p.price)} </div>
      </div>
    `;
  }).join("");
}

function applyFilter(){
  const q = $("q").value.trim().toLowerCase();
  const cat = $("cat").value;

  let items = ALL;

  if (q) items = items.filter(p => (p.title || "").toLowerCase().includes(q));
  if (cat) items = items.filter(p => p?.category?.name === cat);

  $("status").textContent = `Hiển thị ${items.length}/${ALL.length}`;
  render(items);
}

async function loadData(){
  $("status").textContent = "Đang tải...";
  const res = await fetch(DB_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // db.json của bạn là 1 mảng sản phẩm
  ALL = Array.isArray(json) ? json : [];

  buildCategories(ALL);
  $("status").textContent = `Tải xong: ${ALL.length} sản phẩm`;
  render(ALL);
}

$("btnLoad").addEventListener("click", () => {
  loadData().catch(err => {
    $("status").textContent = "Lỗi: " + err.message;
    $("app").innerHTML = "";
  });
});

$("q").addEventListener("input", applyFilter);
$("cat").addEventListener("change", applyFilter);
