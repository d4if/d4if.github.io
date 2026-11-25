#!/bin/sh
set -eu

REPO="d4if/sign"
INSTALL_DIR="${SIGN_INSTALL_DIR:-$HOME/.local/bin}"

need_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Error: perintah '$1' tidak ditemukan." >&2
        exit 1
    fi
}

need_cmd curl
need_cmd tar

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        case "$ARCH" in
            arm64|aarch64) TARGET="aarch64-apple-darwin" ;;
            x86_64|amd64)  TARGET="x86_64-apple-darwin" ;;
            *)
                echo "Error: arsitektur macOS tidak didukung: $ARCH" >&2
                exit 1
                ;;
        esac
        ;;
    Linux)
        case "$ARCH" in
            aarch64|arm64) TARGET="aarch64-unknown-linux-gnu" ;;
            x86_64|amd64)
                if ldd --version 2>&1 | grep -qi musl; then
                    TARGET="x86_64-unknown-linux-musl"
                else
                    TARGET="x86_64-unknown-linux-gnu"
                fi
                ;;
            *)
                echo "Error: arsitektur Linux tidak didukung: $ARCH" >&2
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Error: OS '$OS' tidak didukung oleh installer ini. Untuk Windows, gunakan install.ps1." >&2
        exit 1
        ;;
esac

if [ -n "${SIGN_VERSION:-}" ]; then
    TAG="$SIGN_VERSION"
else
    LATEST_URL="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest")"
    TAG="${LATEST_URL##*/}"
fi

if [ -z "$TAG" ] || [ "$TAG" = "latest" ]; then
    echo "Error: gagal mendeteksi versi rilis terbaru dari github.com/$REPO." >&2
    exit 1
fi

ARCHIVE="sign-${TAG}-${TARGET}.tar.gz"
BASE_URL="https://github.com/$REPO/releases/download/$TAG"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT INT TERM

echo "Mengunduh sign $TAG ($TARGET)..."
curl -fsSL "$BASE_URL/$ARCHIVE" -o "$TMPDIR/$ARCHIVE"
curl -fsSL "$BASE_URL/SHA256SUMS.txt" -o "$TMPDIR/SHA256SUMS.txt"

EXPECTED_HASH="$(grep " $ARCHIVE\$" "$TMPDIR/SHA256SUMS.txt" | awk '{print $1}')"
if [ -z "$EXPECTED_HASH" ]; then
    echo "Error: checksum untuk $ARCHIVE tidak ditemukan di SHA256SUMS.txt." >&2
    exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL_HASH="$(sha256sum "$TMPDIR/$ARCHIVE" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
    ACTUAL_HASH="$(shasum -a 256 "$TMPDIR/$ARCHIVE" | awk '{print $1}')"
else
    echo "Error: sha256sum atau shasum tidak tersedia untuk verifikasi integritas." >&2
    exit 1
fi

if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
    echo "Error: checksum SHA-256 tidak cocok ($ACTUAL_HASH != $EXPECTED_HASH)." >&2
    exit 1
fi

tar -xzf "$TMPDIR/$ARCHIVE" -C "$TMPDIR"
BIN_SRC="$TMPDIR/sign-${TAG}-${TARGET}/sign"
if [ ! -f "$BIN_SRC" ]; then
    echo "Error: binary 'sign' tidak ditemukan di dalam arsip." >&2
    exit 1
fi

mkdir -p "$INSTALL_DIR"
cp "$BIN_SRC" "$INSTALL_DIR/sign"
chmod 755 "$INSTALL_DIR/sign"

echo "Berhasil memasang sign ke: $INSTALL_DIR/sign"
"$INSTALL_DIR/sign" --version

case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
        PROFILE=""
        if [ -n "${ZSH_VERSION:-}" ] || [ "${SHELL:-}" = "/bin/zsh" ] || [ -f "$HOME/.zshrc" ]; then
            PROFILE="$HOME/.zshrc"
        elif [ -f "$HOME/.bashrc" ]; then
            PROFILE="$HOME/.bashrc"
        elif [ -f "$HOME/.profile" ]; then
            PROFILE="$HOME/.profile"
        fi
        EXPORT_LINE="export PATH=\"$INSTALL_DIR:\$PATH\""
        if [ "${SIGN_NO_MODIFY_PATH:-0}" != "1" ] && [ -n "$PROFILE" ]; then
            if ! grep -Fq "$INSTALL_DIR" "$PROFILE" 2>/dev/null; then
                printf '\n%s\n' "$EXPORT_LINE" >> "$PROFILE"
                echo "Menambahkan $INSTALL_DIR ke $PROFILE. Jalankan: source $PROFILE"
            fi
        else
            echo ""
            echo "Tambahkan folder ini ke PATH shell Anda jika perintah 'sign' belum dikenali:"
            echo "  $EXPORT_LINE"
        fi
        ;;
esac
