import archiver from "archiver";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "nodejs"
};

// Inizializza Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { event_name, paths } = req.body;

    if (!event_name || !paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "Parametri mancanti o invalidi" });
    }

    // Genera lo ZIP in memoria
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", (err) => {
      throw err;
    });

    for (const path of paths) {
      archive.append("", { name: path + "/" });
    }

    await archive.finalize();

    const zipBuffer = Buffer.concat(chunks);

    // Nome file univoco
    const fileName = `${event_name}_${Date.now()}.zip`;

    // Upload su Supabase bucket "zips"
    const { error: uploadError } = await supabase.storage
      .from("zips")
      .upload(fileName, zipBuffer, {
        contentType: "application/zip",
        upsert: true
      });

    if (uploadError) {
      console.error("Errore upload Supabase:", uploadError);
      return res.status(500).json({ error: "Upload fallito" });
    }

    // Recupera URL pubblico
    const { data } = supabase.storage.from("zips").getPublicUrl(fileName);

    return res.status(200).json({
      message: "ZIP generato e caricato con successo",
      download_url: data.publicUrl
    });
  } catch (err) {
    console.error("Errore generazione ZIP:", err);
    return res.status(500).json({ error: "Errore interno nel generare lo ZIP" });
  }
}
