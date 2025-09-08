import archiver from "archiver";
import { PassThrough } from "stream";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const event_name = (body.event_name || "").trim();
  const paths = Array.isArray(body.paths) ? body.paths : [];

  if (!event_name || !paths.length) {
    return res.status(400).json({
      error: "Body non valido. Attesi: { event_name: string, paths: string[] }"
    });
  }

  try {
    const buffers = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk) => buffers.push(chunk));

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(passthrough);

    // Aggiungi un README
    archive.append(
      `Evento: ${event_name}\nInserisci qui le slide dei relatori nelle rispettive cartelle.\n`,
      { name: `${event_name}/README.txt` }
    );

    // Aggiungi le cartelle
    for (const original of paths) {
      const dir = `${event_name}/${original}/`;
      archive.append("", { name: `${dir}.keep` });
    }

    // Finalizza
    archive.finalize();

    // Attendi che abbia finito
    await new Promise((resolve, reject) => {
      archive.on("close", resolve);  // ✅ usare "close"
      archive.on("error", reject);
    });

    const zipBuffer = Buffer.concat(buffers);
    const zipBase64 = zipBuffer.toString("base64");

    res.status(200).json({
      message: "ZIP generato con successo",
      file_name: `${event_name}.zip`,
      zip_base64: zipBase64
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nella generazione dello ZIP" });
  }
}
