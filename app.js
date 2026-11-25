import { getValue, onClick, setInner } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/element.min.js";
import { getLocal, setLocal } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/storage.min.js";
import { toastError, toastInfo, toastSuccess, toastWarning } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/toast.min.js";

const THEME_KEY = "d4if-color-mode";
const OFFICIAL_PUBLIC_KEY = "k4.public.Dyy-6DQF5q4jSs36USkBUOdlD8YScsjx_OKnw0WWOYE";

const LECTURERS = [
    { code: "TI126L", name: "Yusril" },
    { code: "TI122L", name: "Kamal" },
    { code: "TI041L", name: "Woro" },
    { code: "NN258L", name: "Roni Andarsyah" },
    { code: "TI117L", name: "Roni Habibi" },
    { code: "TI125L", name: "Fachrie" },
    { code: "LB053L", name: "Nuraini" },
    { code: "NN257L", name: "Rolly" },
    { code: "NN225L", name: "Novi" },
    { code: "NN222L", name: "Nisa" },
    { code: "NN056L", name: "Cahyo" }
];

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function applyColorMode(mode) {
    if (mode === "dark" || mode === "light") {
        document.documentElement.setAttribute("data-theme", mode);
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    const label = mode === "dark" ? "Mode Terang" : mode === "light" ? "Mode Gelap" : "Mode Tampilan";
    setInner("theme-toggle", label);
}

function toggleColorMode() {
    const current = getLocal(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkNow = current === "dark" || (!current && prefersDark);
    const next = isDarkNow ? "light" : "dark";
    setLocal(THEME_KEY, next);
    applyColorMode(next);
}

async function copyText(value, successMsg) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        toastWarning("Clipboard browser tidak tersedia; silakan salin teks secara manual.", 2800);
        return;
    }
    try {
        await navigator.clipboard.writeText(value);
        toastSuccess(successMsg, 2200);
    } catch {
        toastError("Gagal menyalin ke clipboard.", 2500);
    }
}

function extractToken(rawInput) {
    const trimmed = String(rawInput || "").trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("v4.public.")) return trimmed;
    const paramMatch = trimmed.match(/(?:[?#&]|^)token=([^&#\s]+)/);
    if (paramMatch) {
        const decoded = decodeURIComponent(paramMatch[1]).trim();
        if (decoded.startsWith("v4.public.")) return decoded;
    }
    const hashMatch = trimmed.match(/#(v4\.public\.[^&#\s]+)/);
    if (hashMatch) {
        return decodeURIComponent(hashMatch[1]).trim();
    }
    return null;
}

function handleQuickVerifySubmit(event) {
    event.preventDefault();
    const errorEl = document.getElementById("quick-token-error");
    const raw = getValue("quick-token-input");
    const token = extractToken(raw);

    if (!token) {
        errorEl.textContent = "Masukkan token v4.public.* atau URL validator yang memuat parameter token=.";
        errorEl.hidden = false;
        toastWarning("Format token PASETO belum sesuai.", 2500);
        return;
    }

    errorEl.hidden = true;
    window.location.href = `/validate/#token=${encodeURIComponent(token)}`;
}

function renderLecturers(filterText = "") {
    const query = filterText.trim().toLowerCase();
    const tbody = document.getElementById("dosen-tbody");
    const tableWrap = document.getElementById("dosen-table-wrap");
    const emptyEl = document.getElementById("dosen-empty");
    const clearBtn = document.getElementById("dosen-clear-btn");

    clearBtn.hidden = query === "";

    const matched = LECTURERS.filter((item) => {
        if (!query) return true;
        return item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
    });

    if (matched.length === 0) {
        tableWrap.hidden = true;
        emptyEl.hidden = false;
        tbody.innerHTML = "";
        return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    tbody.innerHTML = matched
        .map(
            (item) => `<tr>
  <td><code>${escapeHTML(item.code)}</code></td>
  <td>${escapeHTML(item.name)}</td>
  <td><button type="button" class="ghost copy-btn" data-copy-code="${escapeHTML(item.code)}">Salin Kode</button></td>
</tr>`
        )
        .join("");
}

function init() {
    applyColorMode(getLocal(THEME_KEY));
    renderLecturers("");

    onClick("theme-toggle", toggleColorMode);
    onClick("copy-pubkey-btn", () => copyText(OFFICIAL_PUBLIC_KEY, "Public key resmi disalin."));

    document.getElementById("quick-verify-form").addEventListener("submit", handleQuickVerifySubmit);
    document.getElementById("quick-token-input").addEventListener("input", () => {
        document.getElementById("quick-token-error").hidden = true;
    });

    const searchInput = document.getElementById("dosen-search");
    searchInput.addEventListener("input", (event) => {
        renderLecturers(event.target.value);
    });

    onClick("dosen-clear-btn", () => {
        searchInput.value = "";
        renderLecturers("");
        searchInput.focus();
        toastInfo("Pencarian daftar dosen direset.", 1800);
    });

    document.getElementById("dosen-tbody").addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-copy-code]");
        if (!btn) return;
        const code = btn.getAttribute("data-copy-code");
        if (code) {
            copyText(code, `Kode dosen ${code} disalin.`);
        }
    });
}

init();
