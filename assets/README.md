# Mobile App Assets Generator Setup

This directory is set up to automate the generation of app icons and splash screens for your Android app using the Capacitor Assets tool.

## Icon Specifications

For best results on all mobile screens (supporting round, square, squircle, and adaptive styles):

* **File Format**: Portable Network Graphics (`.png`) with transparency.
* **Dimensions**: **1024 × 1024 pixels** (1:1 aspect ratio).
* **Safe Zone (Android Adaptive Mask)**: Keep your core graphics and logo within the central **66% circle** (about 675 pixels diameter in the center). Android templates crop the outer edges based on the user's phone theme.
* **Adaptive Icons (Optional but Recommended)**:
  * Place a transparent foreground logo in `assets/icon-foreground.png`.
  * Place a solid color background in `assets/icon-background.png`.
  * Or, simply place a single solid logo in `assets/icon.png` and the tool will auto-generate base adaptive layers.

---

## Splash Screen Specifications (Optional)

If you wish to configure a splash screen loader:

* **File Format**: Portable Network Graphics (`.png`).
* **Dimensions**: **2732 × 2732 pixels** (square, high-resolution to accommodate all screen rotations).
* **Safe Zone**: Keep your logo and core content in the center **1000 × 1000 pixels** area to avoid cropping.

---

## How to Generate Assets

Once you place your files in this folder (e.g. `icon.png` or `splash.png`), run the following command in your terminal from the project root (`x:\app`):

```powershell
npx @capacitor/assets generate --android
```

This will automatically resize, format, and copy all generated sizes into the correct Android mipmap directories: `android/app/src/main/res/mipmap-*`.
