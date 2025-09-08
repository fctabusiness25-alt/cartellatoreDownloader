import archiver from "archiver";
import { createClient } from "@supabase/supabase-js";
import stream from "stream";

export const config = {
  runtime: "nodejs18.x"
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event_name, paths } = req.body;

    if (!event_name || !paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "Parametri non validi" });
    }

    // Creiamo lo ZIP in memoria con un PassThrough stream
    const bufferStream = new stream.PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(bufferStream);

    // Aggiungiamo cartelle vuote per ogni path
    paths.forEach((p) => {
      archive.append("", { name: `${p}/.keep` });
    });

    await archive.finalize();

    // Converte lo stream in buffer
    const chunks = [];
    for await (const chunk of bufferStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const filename = `${event_name}_${Date.now()}.zip`;

    const { error } = await supabase.storage
      .from("zips")
      .upload(filename, buffer, {
        contentType: "application/zip",
        upsert: true
      });

    if (error) throw error;

    const download_url = `${process.env.SUPABASE_URL}/storage/v1/object/public/zips/${filename}`;

    return res.status(200).json({
      message: "ZIP generato con successo",
      download_url
    });
  } catch (err) {
    console.error("Errore:", err);
    return res
      .status(500)
      .json({ error: "Errore nella generazione o upload dello ZIP" });
  }
}
