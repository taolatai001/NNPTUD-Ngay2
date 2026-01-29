const API_BASE = "http://localhost:3000";
const $ = (id) => document.getElementById(id);

let POSTS = [];
let COMMENTS = [];
let editingPostId = "";      // "" => create
let editingCommentId = "";   // "" => create

// ===== helpers =====
function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMaxIdAsNumber(items) {
  const nums = (items || [])
    .map(x => parseInt(x?.id, 10))
    .filter(n => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : 0;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// ===== POSTS (soft delete) =====
async function loadPosts() {
  POSTS = await api("/posts");
  POSTS = POSTS.map(p => ({ ...p, isDeleted: !!p.isDeleted }));
  renderPosts();
  buildPostSelect();
}

function clearPostForm() {
  editingPostId = "";
  $("postId").value = "";
  $("postTitle").value = "";
  $("postBody").value = "";
}

async function createPost() {
  const title = $("postTitle").value.trim();
  const body = $("postBody").value.trim();
  if (!title) return alert("Nhập title trước!");

  // ID tự tăng = maxId + 1, lưu dạng CHUỖI
  const nextId = (getMaxIdAsNumber(POSTS) + 1).toString();

  await api("/posts", {
    method: "POST",
    body: JSON.stringify({ id: nextId, title, body, isDeleted: false })
  });

  await loadPosts();
  clearPostForm();
}

async function updatePost(id) {
  const title = $("postTitle").value.trim();
  const body = $("postBody").value.trim();
  if (!title) return alert("Nhập title trước!");

  await api(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title, body })
  });

  await loadPosts();
  clearPostForm();
}

async function softDeletePost(id) {
  // xoá mềm: isDeleted:true
  await api(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isDeleted: true })
  });
  await loadPosts();
}

async function restorePost(id) {
  await api(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isDeleted: false })
  });
  await loadPosts();
}

function renderPosts() {
  const q = $("postSearch").value.trim().toLowerCase();
  const items = q
    ? POSTS.filter(p => (p.title || "").toLowerCase().includes(q))
    : POSTS;

  $("postStatus").textContent = `Hiển thị ${items.length}/${POSTS.length} posts (bao gồm xoá mềm)`;

  const tbody = $("postTbody");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Không có dữ liệu.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => {
    const deleted = !!p.isDeleted;
    const cls = deleted ? "strike" : "";
    const badge = deleted
      ? `<span class="badge text-bg-secondary">Đã xoá mềm</span>`
      : `<span class="badge text-bg-success">Đang hoạt động</span>`;

    return `
      <tr>
        <td class="mono fw-semibold">${escapeHtml(p.id)}</td>
        <td class="${cls}">${escapeHtml(p.title)}</td>
        <td class="${cls}">${escapeHtml(p.body || "")}</td>
        <td>${badge}</td>
        <td class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-dark" data-edit="${escapeHtml(p.id)}">Sửa</button>
          ${
            deleted
              ? `<button class="btn btn-sm btn-outline-primary" data-restore="${escapeHtml(p.id)}">Khôi phục</button>`
              : `<button class="btn btn-sm btn-outline-danger" data-del="${escapeHtml(p.id)}">Xoá mềm</button>`
          }
          <button class="btn btn-sm btn-outline-success" data-pick="${escapeHtml(p.id)}">Chọn comments</button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const p = POSTS.find(x => x.id === id);
      if (!p) return;

      editingPostId = id;
      $("postId").value = p.id; // khi tạo mới để trống, khi sửa mới hiện
      $("postTitle").value = p.title || "";
      $("postBody").value = p.body || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => softDeletePost(btn.getAttribute("data-del")));
  });

  tbody.querySelectorAll("[data-restore]").forEach(btn => {
    btn.addEventListener("click", () => restorePost(btn.getAttribute("data-restore")));
  });

  tbody.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-pick");
      $("postSelect").value = id;
      clearCommentForm();
      await loadCommentsForSelectedPost();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  });
}

// ===== COMMENTS CRUD =====
function buildPostSelect() {
  const sel = $("postSelect");
  sel.innerHTML = POSTS.map(p => {
    const label = p.isDeleted ? `⛔ (xoá mềm) ${p.title}` : p.title;
    return `<option value="${escapeHtml(p.id)}">${escapeHtml(label)}</option>`;
  }).join("");

  if (!sel.value && POSTS.length) sel.value = POSTS[0].id;
}

async function loadCommentsForSelectedPost() {
  const postId = $("postSelect").value;
  if (!postId) {
    $("commentStatus").textContent = "Chưa có post để xem comments";
    $("commentTbody").innerHTML = `<tr><td colspan="3" class="text-muted">Không có.</td></tr>`;
    return;
  }

  COMMENTS = await api(`/comments?postId=${encodeURIComponent(postId)}`);
  renderComments();
}

function clearCommentForm() {
  editingCommentId = "";
  $("commentId").value = "";
  $("commentContent").value = "";
}

async function createComment() {
  const postId = $("postSelect").value;
  const content = $("commentContent").value.trim();
  if (!postId) return alert("Chọn post trước!");
  if (!content) return alert("Nhập nội dung comment!");

  // ID tự tăng cho comments (chuỗi)
  const allComments = await api("/comments");
  const nextId = (getMaxIdAsNumber(allComments) + 1).toString();

  await api("/comments", {
    method: "POST",
    body: JSON.stringify({ id: nextId, postId: postId.toString(), content })
  });

  await loadCommentsForSelectedPost();
  clearCommentForm();
}

async function updateComment(id) {
  const content = $("commentContent").value.trim();
  if (!content) return alert("Nhập nội dung comment!");

  await api(`/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content })
  });

  await loadCommentsForSelectedPost();
  clearCommentForm();
}

async function deleteComment(id) {
  await api(`/comments/${id}`, { method: "DELETE" });
  await loadCommentsForSelectedPost();
}

function renderComments() {
  const tbody = $("commentTbody");
  $("commentStatus").textContent =
    `PostID=${$("postSelect").value} • ${COMMENTS.length} comment(s)`;

  if (!COMMENTS.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-muted">Chưa có comment.</td></tr>`;
    return;
  }

  tbody.innerHTML = COMMENTS.map(c => `
    <tr>
      <td class="mono fw-semibold">${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.content || "")}</td>
      <td class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-dark" data-cedit="${escapeHtml(c.id)}">Sửa</button>
        <button class="btn btn-sm btn-outline-danger" data-cdel="${escapeHtml(c.id)}">Xoá</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-cedit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-cedit");
      const c = COMMENTS.find(x => x.id === id);
      if (!c) return;

      editingCommentId = id;
      $("commentId").value = c.id;
      $("commentContent").value = c.content || "";
    });
  });

  tbody.querySelectorAll("[data-cdel]").forEach(btn => {
    btn.addEventListener("click", () => deleteComment(btn.getAttribute("data-cdel")));
  });
}

// ===== events =====
$("btnReloadPosts").addEventListener("click", loadPosts);

$("btnSavePost").addEventListener("click", () => {
  if (editingPostId) updatePost(editingPostId);
  else createPost();
});
$("btnCancelPost").addEventListener("click", clearPostForm);

// gõ là lọc ngay
$("postSearch").addEventListener("input", renderPosts);

$("postSelect").addEventListener("change", () => {
  clearCommentForm();
  loadCommentsForSelectedPost();
});
$("btnReloadComments").addEventListener("click", loadCommentsForSelectedPost);

$("btnSaveComment").addEventListener("click", () => {
  if (editingCommentId) updateComment(editingCommentId);
  else createComment();
});
$("btnCancelComment").addEventListener("click", clearCommentForm);

// ===== init =====
(async function init() {
  try {
    await loadPosts();
    await loadCommentsForSelectedPost();
  } catch (e) {
    $("postStatus").textContent = "Lỗi: " + e.message;
    $("commentStatus").textContent = "Lỗi: " + e.message;
  }
})();
