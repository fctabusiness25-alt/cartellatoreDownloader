import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const { file } = req.query;
  if (!file) {
    return res.status(400).json({ error: "Parametro 'file' mancante" });
  }

  const zipPath = path.join("/tmp", file);

  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: "File non trovato" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${file}"`);

  const fileStream = fs.createReadStream(zipPath);
  fileStream.pipe(res);
}
