# Kwig — Minimalist Productivity, Health, Workout & Note Suite

Kwig is a sleek, lightweight, mobile-first productivity and personal growth application. Inspired by Notion's clean, minimalist aesthetics, Kwig provides a comprehensive dashboard for daily tasks, custom weight-based productivity scores, note organization, workout tracking, and calendar scheduling—packaged inside an optimized native Android mobile binary under **1.85 MB** in size.

<p align="center">
  <img src="assets/icon.png" width="96" alt="Kwig Logo" style="border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

---

## Key Features

### 1. Unified Workspace Dashboard
* 🎯 **Dynamic Progress Rings**: Dual circular progress bars tracking your Productivity and Health checklists in real time.
* 📋 **Task Organizer**: Quick inline addition of tasks with selectable priority tiers (High, Medium, Low) and custom checklists.
* 💡 **Principle of the Day**: Renders a cycling rotation of personal principles using the pixel-art `Silkscreen` font. Tap once to cycle principles; long-press to open the Principles Manager.
* 💧 **Water & Mindfulness Meters**: Dedicated sliders to track water intake (1L to 4L) and consciousness index (1-6) on the fly.

### 2. "The Void" Note Canvas & Directory
* 📁 **Hierarchical Folders**: Create nested directories to organize notes. Click notes folders from the dashboard to scroll and highlight their blocks in Note Pages.
* ✍️ **Contenteditable Workspace**: A clean, paper-style writing canvas for note-taking.
* 🖼️ **Rich Media Tools**: Paste images from the clipboard or import local images. Select images to trigger a floating menu for 25%/50%/75%/100% width scaling and Left/Center/Right alignment.
* 🫳 **Drag-and-Drop Images**: Reposition images on mobile or touchscreens by dragging and dropping them directly into text cursor locations.

### 3. Workout Tracker & Database
* 🏋️ **Automated Weekday Tracker**: Locks dynamically onto today's week (Weeks 1 to 5) and day (Mon to Sun) based on local date calculations. 
* 🚫 **Skipped Gym Switch**: Easily toggle off gym attendance for the day to log a customizable walking distance (1 km to 5 km) instead.
* 📊 **Scrollable Workout Database**: A complete horizontal grid displaying all 35 days of a cycle. Tap cells to check off exercises or log walking inline.
* 🧮 **Count Metrics**: Done-this-week column counts replicate spreadsheet `=COUNTIF` counters dynamically at the bottom.
* 🎨 **Muscle Color Coding**: Vibrant custom indicator borders in lists and soft color gradients in the database for each muscle category (Chest, Back, Legs, Triceps, Biceps, Core, Shoulder, Cardio).

### 4. Monthly Calendar
* 📅 **Monthly Grid View**: Navigate past or future months to view your schedules, highlighting the current day box.

### 5. Premium Themes
* 🌙 **Default Dark Mode**: An elegant dark theme with soft borders and minimal visual noise.
* ☕ **Coffee Theme**: A warm, cozy aesthetic featuring latte backgrounds, round pill checkboxes, cocoa text, and soft shadows.

### 6. Cloud Sync & Local Backups
* ☁️ **Google Drive Sync**: Auto-syncs your database, settings, principles, and note pages to your Google Drive via OAuth2.
* 💾 **Local Backups**: Export your entire tracking history and note directories as a single `.json` file backup, or import it to restore your state.

---

## Tech Stack & Architecture

* **Build Tool**: [Vite](https://vite.dev/)
* **Runtime**: Vanilla Javascript (ES6+) and modern standard HTML5
* **Styling**: Vanilla CSS utilizing custom properties (variables) for theme management, safe-area boundary layout padding, and keyframe animations.
* **Mobile Engine**: [Capacitor v6](https://capacitorjs.com/) (packages the web application into a fully native Android Gradle project).
* **Capacitor Plugins**:
  * `@capacitor/local-notifications` (handles system reminders).
  * `@capacitor/app` (monitors physical back button navigation/exit actions).

---

## Project Structure

```
x:/app/
├── android/                   # Native Gradle project for Android OS
├── assets/                    # Compressed graphical assets and app icons
├── dist/                      # Web production bundle compiled by Vite
├── scratch/                   # Portable compilation toolchain scripts
│   ├── setup-android.ps1      # Downloads/configures portable JDK 17 & SDK tools
│   └── build-apk.ps1          # Compiles optimized release-quality debug APKs
├── src/
│   ├── main.js                # Core state engine, routes, and UI templates
│   └── style.css              # Typography, CSS variables, and layout overrides
├── capacitor.config.json      # Capacitor metadata configuration
├── index.html                 # Main HTML layout, fonts & Web Icon configurations
├── package.json               # Node dependencies and build scripts
└── vite.config.js             # Vite configuration
```

---

## Getting Started

### 1. Install Dependencies
Run the command below in the project root:
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open the output URL in your browser (e.g. `http://localhost:5173`). Toggle mobile device emulation in your browser's Developer Tools to preview the responsive layout.

### 3. Build & Sync to Capacitor
Whenever modifications are made to `src/main.js`, `src/style.css`, or `index.html`, synchronize the updates into the native Android files:
```bash
npm run cap:sync
```

### 4. Compile Portable APK (Terminal Build)
You do not need Android Studio to compile. Run the provided build scripts using PowerShell:
1. **Download Local SDK (First time only)**:
   ```powershell
   powershell.exe -File scratch/setup-android.ps1
   ```
2. **Compile native APK**:
   ```powershell
   powershell.exe -File scratch/build-apk.ps1
   ```
The compiled, minified, and optimized APK will be saved directly in the root directory as **`kwig.apk`** (~1.85 MB).
