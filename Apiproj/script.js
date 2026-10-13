// ===== Mobile menu toggle =====
const hamburger = document.querySelector(".hamburger");
const mobileNav = document.querySelector(".mobile-nav");

hamburger.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("active");
  hamburger.setAttribute("aria-expanded", String(isOpen));
});

// ===== Link shortener =====
const API_URL = "http://localhost:8010/proxy/api/v1/shorten";
// If the browser console shows a CORS error, send the request through a
// proxy or your own small backend instead of calling the API directly.

const STORAGE_KEY = "shortly_links";

const form = document.getElementById("shortenForm");
const input = document.getElementById("linkInput");
const errorMsg = document.getElementById("errorMsg");
const results = document.getElementById("results");
const shortenBtn = form.querySelector(".shortener-form__btn");

// ---- Storage (safe against corrupted / blocked localStorage) ----
function getSavedLinks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLinks(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: the list just won't persist */
  }
}

// ---- Render the whole list (newest first, same order after refresh) ----
// Uses textContent, never innerHTML, so user input can't inject HTML.
function renderLinks() {
  results.innerHTML = "";

  getSavedLinks().forEach(({ original, short }) => {
    const item = document.createElement("div");
    item.className = "result-item";

    const originalEl = document.createElement("p");
    originalEl.className = "result-item__original";
    originalEl.textContent = original;

    const divider = document.createElement("hr");
    divider.className = "result-item__divider";

    const right = document.createElement("div");
    right.className = "result-item__right";

    const shortEl = document.createElement("a");
    shortEl.className = "result-item__short";
    shortEl.href = short;
    shortEl.target = "_blank";
    shortEl.rel = "noopener";
    shortEl.textContent = short;

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn--primary result-item__copy";
    copyBtn.textContent = "Copy";

    right.append(shortEl, copyBtn);
    item.append(originalEl, divider, right);
    results.append(item);
  });
}

// ---- Error handling ----
function setError(message) {
  if (message) {
    input.classList.add("error");
    input.setAttribute("aria-invalid", "true");
    errorMsg.textContent = message;
    errorMsg.classList.add("active");
  } else {
    input.classList.remove("error");
    input.removeAttribute("aria-invalid");
    errorMsg.classList.remove("active");
  }
}

// Clear the error as soon as the user starts typing again
input.addEventListener("input", () => setError(""));

// "google.com" -> "https://google.com"
function normalizeUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

// ---- Submit ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = input.value.trim();

  if (value === "") {
    setError("Please add a link");
    return;
  }

  const url = normalizeUrl(value);

  setError("");
  shortenBtn.disabled = true;
  shortenBtn.textContent = "Shortening...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(url)}`,
    });

    const data = await response.json();

    if (data.error || !data.result_url) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    const saved = getSavedLinks();
    saved.unshift({ original: url, short: data.result_url });
    saveLinks(saved);
    renderLinks();
    input.value = "";
  } catch {
    setError("Something went wrong. Please try again.");
  } finally {
    shortenBtn.disabled = false;
    shortenBtn.textContent = "Shorten It!";
  }
});

// ---- Copy (works even where navigator.clipboard is unavailable) ----
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

results.addEventListener("click", async (e) => {
  const btn = e.target.closest(".result-item__copy");
  if (!btn) return;

  const link = btn.previousElementSibling.textContent;
  if (!(await copyText(link))) return;

  btn.textContent = "Copied!";
  btn.classList.add("copied");

  setTimeout(() => {
    btn.textContent = "Copy";
    btn.classList.remove("copied");
  }, 2000);
});

// ---- Init ----
renderLinks();
