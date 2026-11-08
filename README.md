# Antigravity Enhancer (v2.4.0)

```text
   ___        __  _                    _ __      
  / _ | ___  / /_(_)__ ________ __  __(_) /___ __
 / __ |/ _ \/ __/ / _ `/ __/ _ `/ |/ / / __/ // /
/_/ |_/_//_/\__/_/\_, /_/  \_,_/|___/_/\__/\_, / 
                 /___/                    /___/  
```

Unofficial community patch for **Antigravity** adding **9-language UI localization (i18n)**, a **real-time AI model quota & usage widget**, and **developer UX enhancements**.

---

## ✨ Key Features (주요 기능)

1. **9-Language Real-Time Localization (9개 국어 완벽 지원)**
   - **Supported Languages**: English (`en`), 한국어 (`ko`), 日本語 (`ja`), 简体中文 (`zh-CN`), 繁體中文 (`zh-TW`), Español (`es`), Français (`fr`), Deutsch (`de`), Русский (`ru`)
   - **Zero-Restart Switching**: Switch languages anytime from the **top-bar language dropdown (`🌐`)**, **Settings > General > Language**, or the **`Alt + Shift + L`** shortcut without restarting.

2. **Top-Bar Real-Time Quota & Usage Widget (상단 실시간 사용량 표시기)**
   - Displays both **5-Hour (`5h`)** and **Weekly (`주간` / `W`)** remaining quota percentages for **Argon**, **Gemini**, and **Claude/Other** models right in the top bar.
   - **Per-Model Soft Red Low-Quota Warning**: Gently highlights only the specific model bucket when its remaining quota drops below `20%`.
   - **Native Theme-Synced Popover**: Click the widget to view detailed progress bars, live reset countdown timers, and quick refresh controls—automatically styled to match your active Antigravity theme.

3. **OS-Locale Auto-Detecting Standalone Installer (실행 환경 언어 자동 감지 설치기)**
   - Automatically detects your Windows OS language (`ko`, `ja`, `zh-CN`, `zh-TW`, `es`, `fr`, `de`, `ru`, `en`) and displays the interactive setup/rollback wizard in your native language.
   - Automatically backs up your clean original `app.asar` to `app.asar.original` and supports 1-click rollback at any time.

4. **In-App Update Notification (앱 내 패치 업데이트 알림)**
   - Automatically checks `@xitora/antigravity-enhancer` releases and displays a native update badge in the top bar when a newer patch version is published.

---

## 🚀 Quick Installation (설치 방법)

### Option 1: Standalone `.exe` Installer (단일 실행 파일 - 권장)
1. Download **[Antigravity-Enhancer-Setup.exe](https://github.com/xitora/antigravity-enhancer/releases/latest/download/Antigravity-Enhancer-Setup.exe)** from the **[Releases](https://github.com/xitora/antigravity-enhancer/releases/latest)** page.
2. Run `Antigravity-Enhancer-Setup.exe` and enter **`1`** to install/update, or **`2`** to restore the clean original state.

### Option 2: Portable `.zip` Package (포터블 압축 파일)
1. Download `Antigravity-Enhancer-v2.4.0-Win.zip` from **[Releases](https://github.com/xitora/antigravity-enhancer/releases/latest)**.
2. Extract and run `apply_patch.bat`.

---

## 🛠️ Building from Source

```powershell
# Rebuild the standalone .exe installer from Antigravity_MultiLang_Patch
powershell -NoProfile -ExecutionPolicy Bypass -File .\build_exe_installer.ps1 -Version "2.4.0"

# Run the 244 E2E verification tests
node .\tests\e2e\runner.js
```

---

*Disclaimer: This is an unofficial community project and is not affiliated with, endorsed by, or connected to the official Antigravity team. Use at your own risk.*
