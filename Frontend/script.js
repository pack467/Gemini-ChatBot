// ===== Helpers UI (theme + clear) =====
(() => {
  const THEME_KEY = "gemini_theme";
  const toggleBtn = document.getElementById("theme-toggle");
  const clearBtn = document.getElementById("clear-chat");
  const chatBox = document.getElementById("chat-box");

  // init theme
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  const updateIcon = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggleBtn.querySelector(".icon").textContent = isDark ? "☀️" : "🌙";
  };
  updateIcon();

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    updateIcon();
  });

  clearBtn.addEventListener("click", () => {
    chatBox.innerHTML = "";
    chatBox.scrollTop = 0;
  });

  // auto-scroll on new messages
  const observer = new MutationObserver(() => {
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
  });
  observer.observe(chatBox, { childList: true });
})();

// ===== Chat Core =====
const chatBox = document.getElementById("chat-box");
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");

// Auto expand textarea height
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

// Enter to send, Shift+Enter newline
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// Add message to chat (with bubble + avatar + time)
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "user" ? "U" : "G";

  const body = document.createElement("div");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const meta = document.createElement("div");
  meta.className = "meta";
  const now = new Date();
  meta.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  body.appendChild(bubble);
  body.appendChild(meta);

  // If you only want avatar for bot, comment next line for user:
  msg.appendChild(avatar);
  msg.appendChild(body);

  chatBox.appendChild(msg);
}

// ===== API Call Config =====
const API_BASE = "http://localhost:3000"; // ganti jika backend beda host/port
const REQUEST_TIMEOUT_MS = 30000;         // 30 detik

async function fetchJSON(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    const isJSON = resp.headers.get("content-type")?.includes("application/json");
    const data = isJSON ? await resp.json() : await resp.text();

    if (!resp.ok) {
      const msg = (isJSON && data?.error) ? data.error : `HTTP ${resp.status}`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}

// Call backend to get reply
async function getBotReply(userText) {
  const data = await fetchJSON(`${API_BASE}/generate-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: userText })
  });

  return data?.result || "(no response)";
}

// Initial welcome
addMessage("Hi! 👋 Ask me anything. I'm ready.", "bot");

// Handle form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";
  input.style.height = "24px";

  // Typing indicator
  const typing = document.createElement("div");
  typing.className = "message bot";
  typing.innerHTML = `
    <div class="avatar">G</div>
    <div><div class="bubble">Gemini is typing…</div><div class="meta"></div></div>
  `;
  chatBox.appendChild(typing);

  try {
    const reply = await getBotReply(text);
    typing.remove();
    addMessage(reply, "bot");
  } catch (err) {
    typing.remove();
    addMessage(`Error: ${err.message || "Something went wrong."}`, "bot");
    console.error(err);
  }
});
