import archiver from "archiver";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { event_name, paths } = req.body;

  if (!event_name || !Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

  try {
    // Genera ZIP in memoria
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => chunks.push(chunk));

    archive.append(`Evento: ${event_name}\n`, { name: `${event_name}/README.txt` });

    for (const original of paths) {
      archive.append("", { name: `${event_name}/${original}/.keep` });
    }

    await archive.finalize();

    const zipBuffer = Buffer.concat(chunks);
    const fileName = `${event_name}_${Date.now()}.zip`;

    // Upload su Supabase Storage
    const { error } = await supabase.storage
      .from("zips")
      .upload(fileName, zipBuffer, {
        contentType: "application/zip",
        upsert: true
      });

    if (error) throw error;

    // Ottieni URL pubblico
    const { data } = supabase.storage.from("zips").getPublicUrl(fileName);

    res.status(200).json({
      message: "ZIP caricato con successo",
      download_url: data.publicUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nella generazione o upload dello ZIP" });
  }
}
