import archiver from "archiver";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_name, paths } = req.body;

    if (!event_name || !paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "Parametri non validi" });
    }

    // Creiamo lo ZIP in memoria
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    archive.on("data", (chunk) => chunks.push(chunk));

    paths.forEach((p) => {
      archive.append("", { name: `${p}/.keep` });
    });

    await archive.finalize();

    const buffer = Buffer.concat(chunks);
    const filename = `${event_name}_${Date.now()}.zip`;

    // Upload su Supabase (bucket: zips)
    const { error } = await supabase.storage
      .from("zips")
      .upload(filename, buffer, {
        contentType: "application/zip",
        upsert: true
      });

    if (error) {
      throw error;
    }

    const download_url = `${process.env.SUPABASE_URL}/storage/v1/object/public/zips/${filename}`;

    return res.status(200).json({
      message: "ZIP generato e caricato con successo",
      download_url
    });
  } catch (err) {
    console.error("Errore durante la generazione/upload:", err);
    return res
      .status(500)
      .json({ error: "Errore nella generazione o upload dello ZIP" });
  }
}
