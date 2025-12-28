const fs = require("fs");
const https = require("https");
const path = require("path");
const { exec } = require("child_process");

const ACCESS_KEY = "YOUR-UNSPLASH-ACCESS-KEY";

const APP_DIR = __dirname; //project folder
const WALLPAPER_FOLDER = path.join(APP_DIR, "wallies");
const TRACK_FILE = path.join(APP_DIR, "database.txt");
const REPEAT_BLOCK_DAYS = 7;

const today = new Date().toISOString().slice(0, 10);

//ensure folders or files exist
if (!fs.existsSync(WALLPAPER_FOLDER)) fs.mkdirSync(WALLPAPER_FOLDER, { recursive: true });
if (!fs.existsSync(TRACK_FILE)) fs.writeFileSync(TRACK_FILE, "");

//read the database text file
function readDB() {
	return fs.readFileSync(TRACK_FILE, "utf8").trim().split("\n").filter(Boolean);
}

//checks if the wallpaper was updated today or not
function hasUpdatedToday() {
	const db = readDB();
	if (!db.length) return false;
	return db.at(-1).split("\t")[1] === today;
}

//checks if the wallpaper fetched was used in the cutoff day: here 7 days
function isRecentlyUsed(url) {
	const cutoff = Date.now() - REPEAT_BLOCK_DAYS * 24 * 60 * 60 * 1000;
	return readDB().some((line) => {
		const [, date, data] = line.split("\t");
		return data.split(",")[0] === url && new Date(date).getTime() >= cutoff;
	});
}

//logs the wallpaper details to the database text file
function logWallpaper(url, filename) {
	const count = readDB().length + 1;
	fs.appendFileSync(TRACK_FILE, `${count}\t${today}\t${url},${filename}\n`);
}

//set wallpaper using powershell commands
function setWallpaper(filePath) {
	const psPath = filePath.replace(/\\/g, "/");
	const cmd = `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$code='[DllImport(\\"user32.dll\\")]public static extern bool SystemParametersInfo(int uAction,int uParam,string lpvParam,int fuWinIni);'; Add-Type -MemberDefinition $code -Name NativeMethods -Namespace Win32; [Win32.NativeMethods]::SystemParametersInfo(20,0,'${psPath}',3)"`;
	exec(cmd);
}

//fetch and apply photo
function fetchPhoto() {
	const apiUrl = `https://api.unsplash.com/photos/random?orientation=landscape&client_id=${ACCESS_KEY}`;

	https.get(apiUrl, (res) => {
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
			https.get(downloadUrl, (imgRes) => {
				imgRes.pipe(file);
				file.on("finish", () => {
					file.close();
					setWallpaper(filePath);
					logWallpaper(photoUrl, filename);
				});
			});
		});
	});
}

//main
if (!hasUpdatedToday()) fetchPhoto();
