const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve your site files (adjust if your HTML is in a different folder)
app.use(express.static(__dirname));

// Ensure directories exist
const IMAGES_DIR = path.join(__dirname, "images");
const LAYERS_DIR = path.join(__dirname, "layers");
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(LAYERS_DIR, { recursive: true });

// CSV path
const CSV_PATH = path.join(LAYERS_DIR, "user_inputs.csv");

// Create CSV with header if missing
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(
    CSV_PATH,
    "name,description,image,url,latitude,longitude\n",
    "utf8"
  );
}

// Multer storage for saving images into /images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    // Make a safe unique name
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "upload", ext)
      .replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({ storage });

// Helper: escape CSV fields safely
function csvEscape(v) {
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// POST /submit: saves file + appends to CSV
app.post("/submit", upload.single("image"), (req, res) => {
  try {
    const name = req.body.name || "";
    const description = req.body.description || "";
    const latitude = req.body.latitude || "";
    const longitude = req.body.longitude || "";
    const imageFile = req.file ? req.file.filename : "";
    const url = req.body.url || "";

    // Append row: name,description,image,url,latitude,longitude
    const row =
      [
        csvEscape(name),
        csvEscape(description),
        csvEscape(imageFile),
        csvEscape(url),
        csvEscape(latitude),
        csvEscape(longitude),
      ].join(",") + "\n";

    fs.appendFileSync(CSV_PATH, row, "utf8");

    res.json({
      ok: true,
      imageFile,
      row: { name, description, image: imageFile, url, latitude, longitude },
    });
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
