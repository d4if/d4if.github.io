import { onClick, setInner } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/element.min.js";
import { getLocal, setLocal } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/storage.min.js";
import { toastError, toastInfo, toastSuccess, toastWarning } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.42/toast.min.js";

const THEME_KEY = "d4if-color-mode";

const LECTURERS = [
    { code: "RAN", name: "Roni Andarsyah, S.T., M.Kom." },
    { code: "MYH", name: "M. Yusril Helmi Setyawan, S.Kom., M.Kom." },
    { code: "RMA", name: "Rolly Maulana Awangga, S.T., M.T., CAIP." },
    { code: "MNF", name: "Dr. Mohamad Nurkamal Fauzan, S.T., M.T." },
    { code: "CPY", name: "Cahyo Prianto, S.Pd., M.T." },
    { code: "SFP", name: "Dr. Syafrial Fachri Pane, S.T., M.T.I., EBDP., CDSP." },
    { code: "RHA", name: "Roni Habibi, S.Kom., M.T." },
    { code: "NHH", name: "Nisa Hanum Harani, S.Kom., M.T., CDSP." },
    { code: "RNS", name: "Rd. Nuraini Siti Fathonah, S.S., M.Hum." }
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

    document.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-copy-text]");
        if (!btn) return;
        const text = btn.getAttribute("data-copy-text");
        if (text) {
            copyText(text, "Perintah disalin ke clipboard.");
        }
    });
}

init();
