# Building the AetherVector Desktop Installer

This project is configured with **Tauri v2** to package the web app as a native
desktop application. Follow these steps on your own computer to build the
installer.

## Prerequisites

### 1. Install Node.js
Download from https://nodejs.org (LTS recommended).

### 2. Install Rust
Install via https://rustup.rs — this provides `cargo` and the Rust toolchain
that Tauri uses to compile the native shell.

### 3. Install system dependencies

**Windows:**
- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  (the "Desktop development with C++" workload).
- For `.msi` installers, [WiX Toolset 3.x](https://wixtoolset.org/) is required
  (Tauri will auto-download it on first build).

**macOS:**
- Install Xcode Command Line Tools: `xcode-select --install`

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Build Steps

1. **Download the project** from Bolt (click the project title → Download).

2. **Unzip** the downloaded file and open a terminal in the project folder.

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the desktop installer:**
   ```bash
   npm run tauri:build
   ```

This command will:
- Build the web frontend (Vite)
- Compile the Rust native shell
- Package everything into a platform-specific installer

## Output Location

The installer appears in `src-tauri/target/release/bundle/`:

| Platform | Format | Path |
|----------|--------|------|
| Windows  | `.msi` / `.exe` (NSIS) | `src-tauri/target/release/bundle/msi/` |
| macOS    | `.dmg` / `.app` | `src-tauri/target/release/bundle/dmg/` |
| Linux    | `.deb` / `.AppImage` | `src-tauri/target/release/bundle/deb/` |

## Run in Development

To launch the app in a dev window with hot-reload:

```bash
npm run tauri:dev
```

## Customizing Icons

The placeholder icons live in `src-tauri/icons/`. To use your own branding,
replace them with your own images and run:

```bash
npm run tauri icon path/to/your-icon.png
```

This regenerates all required sizes and formats automatically.

## Troubleshooting

- **"cargo not found"** — Rust isn't installed or isn't in your PATH. Re-run
  rustup or restart your terminal.
- **Build fails on Windows** — Ensure the C++ Build Tools are installed.
- **Build fails on macOS** — Run `xcode-select --install` first.
- **Webview errors** — Ensure you're on a supported OS version (Win10+,
  macOS 10.15+, or a modern Linux distro with WebKitGTK 4.1).
