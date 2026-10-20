const fs = require("fs");
const https = require("https");
const path = require("path");
const { exec } = require("child_process");

const ACCESS_KEY = "YOUR-UNSPLASH-ACCESS-KEY";

const APP_DIR = __dirname;
const WALLPAPER_FOLDER = path.join(APP_DIR, "wallies");
const TRACK_FILE = path.join(APP_DIR, "wallpaperLog.txt");
const REPEAT_BLOCK_DAYS = 7;
const isStartupMode = process.argv.includes("--startup");

const today = new Date().toISOString().slice(0, 10);

function waitForNetwork(cb) {
	const checkUrl = `https://api.unsplash.com/photos/random?client_id=${ACCESS_KEY}`;
	const request = https.get(checkUrl, (res) => {
		const isSuccessful = res.statusCode >= 200 && res.statusCode < 300;
		res.resume();
		if (isSuccessful) return cb();
		setTimeout(() => waitForNetwork(cb), 5000);
	});

	request.setTimeout(10000, () => request.destroy());
	request.on("error", () => setTimeout(() => waitForNetwork(cb), 5000));
}

const themes = ["nature", "badlands", "beach", "caves", "dark forest", "desert", "forest", "frozen river", "jungle", "mountains", "ocean", "plains", "river", "savanna", "sea", "snowy mountains", "snowy tundra", "snowy beach", "swamp", "warm ocean", "woodland"];
const randomTheme = themes[Math.floor(Math.random() * themes.length)];

if (!fs.existsSync(WALLPAPER_FOLDER)) fs.mkdirSync(WALLPAPER_FOLDER, { recursive: true });
if (!fs.existsSync(TRACK_FILE)) fs.writeFileSync(TRACK_FILE, "");

function readDB() {
	return fs.readFileSync(TRACK_FILE, "utf8").trim().split("\n").filter(Boolean);
}

function parseDBEntry(line) {
	const [count, date, data] = line.split("\t");
	if (!count || !date || typeof data !== "string") return null;

	const separatorIndex = data?.lastIndexOf(",");
	if (separatorIndex < 0) return null;

	return {
		raw: line,
		count,
		date,
		url: data.slice(0, separatorIndex),
		filename: data.slice(separatorIndex + 1),
	};
}

function getLatestEntry(date) {
	const entries = readDB().map(parseDBEntry).filter(Boolean).reverse();
	return date ? entries.find((entry) => entry.date === date) : entries[0];
}

function removeDBEntry(entry) {
	if (!entry) return;

	const remainingLines = readDB().filter((line) => line !== entry.raw);
	fs.writeFileSync(TRACK_FILE, remainingLines.length ? `${remainingLines.join("\n")}\n` : "");
}

function rejectCurrentWallpaper() {
	const entry = getLatestEntry();
	if (!entry) return;

	const filePath = path.join(WALLPAPER_FOLDER, entry.filename);
	if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
	removeDBEntry(entry);
}

function isRecentlyUsed(url) {
	const cutoff = Date.now() - REPEAT_BLOCK_DAYS * 24 * 60 * 60 * 1000;
	return readDB().some((line) => {
		const [, date, data] = line.split("\t");
		return data.split(",")[0] === url && new Date(date).getTime() >= cutoff;
	});
}

function logWallpaper(url, filename) {
	const count = readDB().length + 1;
	fs.appendFileSync(TRACK_FILE, `${count}\t${today}\t${url},${filename}\n`);
}

function setWallpaper(filePath) {
	const psPath = filePath.replace(/\\/g, "/");
	const cmd = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$code='[DllImport(\\"user32.dll\\")]public static extern bool SystemParametersInfo(int uAction,int uParam,string lpvParam,int fuWinIni);'; Add-Type -MemberDefinition $code -Name NativeMethods -Namespace Win32; [Win32.NativeMethods]::SystemParametersInfo(20,0,'${psPath}',3)"`;
	exec(cmd);
}

function fetchPhoto() {
	const apiUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(randomTheme)}&orientation=landscape&client_id=${ACCESS_KEY}`;

	const request = https.get(apiUrl, (res) => {
		if (res.statusCode < 200 || res.statusCode >= 300) {
			res.resume();
			return setTimeout(fetchPhoto, 5000);
		}

		let data = "";
		res.on("data", (chunk) => (data += chunk));
		res.on("end", () => {
			let json;
			try {
				json = JSON.parse(data);
			} catch {
				return;
			}
			if (!json?.urls?.raw) return;

			const photoUrl = json.urls.raw;
			if (isRecentlyUsed(photoUrl)) return fetchPhoto();

			const downloadUrl = photoUrl + "&w=1920&h=1080&fit=crop";
			const filename = `wally${today}.jpg`;
			const filePath = path.join(WALLPAPER_FOLDER, filename);

			const file = fs.createWriteStream(filePath);
			const downloadRequest = https.get(downloadUrl, (imgRes) => {
				if (imgRes.statusCode < 200 || imgRes.statusCode >= 300) {
					imgRes.resume();
					file.close();
					return setTimeout(fetchPhoto, 5000);
				}

				imgRes.pipe(file);
				file.on("finish", () => {
					file.close();
					setWallpaper(filePath);
					logWallpaper(photoUrl, filename);
				});
			});
			downloadRequest.setTimeout(15000, () => downloadRequest.destroy());
			downloadRequest.on("error", () => {
				file.close();
				setTimeout(fetchPhoto, 5000);
			});
		});
	});

	request.setTimeout(10000, () => request.destroy());
	request.on("error", () => setTimeout(fetchPhoto, 5000));
}

if (isStartupMode) {
	const entry = getLatestEntry(today);
	const wallpaperExists = entry && fs.existsSync(path.join(WALLPAPER_FOLDER, entry.filename));
	if (!wallpaperExists) waitForNetwork(() => fetchPhoto());
} else {
	rejectCurrentWallpaper();
	waitForNetwork(() => fetchPhoto());
}
