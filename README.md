# Walliday

⚠️ **Disclaimer:** This project was built as a personal experiment and works reliably only on my device configuration. It may not work the same way on other systems - use at your own risk.

Walliday is a Node.js project that fetches a new random landscape wallpaper daily from the Unsplash Developer API and sets it as the Windows desktop background. I built this project because I wanted a wallpaper app that reliably changes the wallpaper on boot. The project was created through vibe-coding, and while it mainly works on my setup, the code is shared so others can study, modify, or build their own version.

After finishing the project, I realized it only runs reliably on my machine because I didn’t bundle the EXE for other platforms - which was outside the original scope. Some decisions (like the batch-file approach) may seem unusual, but they worked for my workflow.

---

## How It Works (Overview)

- At startup, checks `wallpaperLog.txt` and the `wallies/` folder to see whether today’s wallpaper already exists.
- When launched manually, removes the current wallpaper and downloads a replacement.
- Fetches a random landscape wallpaper from Unsplash if not.
- Avoids repeating wallpapers from the last 7 days.
- Saves images in the `wallies/` folder.
- Sets the wallpaper via PowerShell.
- Logs filename + URL in `wallpaperLog.txt`.

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/dhyananil/Walliday.git
```

---

### 2. Add Your Unsplash Access Key

Edit `walliday.js`:

```javascript
6 | const ACCESS_KEY = "YOUR-UNSPLASH-ACCESS-KEY";
```

---

### 3. Update the full Batch File Path

Edit `launchWalliday.bat`:

```batch
2 | cd /d "path-to-your-index.js"
```

- Correct: "C:\Users\\\<username>\Walliday"
- Not Correct: "C:\Users\\\<username>\Walliday<del>\walliday.js</del>"

> The batch file is used so it can be converted into an EXE without a console window.

---

### 4. Convert Batch → EXE

- Recommended tool: https://github.com/tokyoneon/B2E
- Recommended Setting: Windows (Invisible)

---

### 5. Add the Startup Shortcut

Create a shortcut to `Walliday.exe`. In the shortcut properties, set **Target** to:

```text
"C:\Users\<username>\Walliday\Walliday.exe" --startup
```

Set **Start in** to:

```text
C:\Users\<username>\Walliday
```

Place the shortcut in the Startup folder:

```text
C:\Users\<username>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

Or run:

```
shell:startup
```

---

## My System Specifications

- Windows 11 (64-bit)
- Resolution: 1920×1080
- Node.js v24.11.1
- npm 11.6.2
- PowerShell 5.1

---

> ⚠️ This project is tailored to **my device & workflow**.  
> It may require changes to work on other systems.
