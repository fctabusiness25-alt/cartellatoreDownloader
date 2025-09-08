import archiver from "archiver";

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

  // Imposta intestazioni per download
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${event_name}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  // README iniziale
  archive.append(
    `Evento: ${event_name}\nInserisci qui le slide dei relatori nelle rispettive cartelle.\n`,
    { name: `${event_name}/README.txt` }
  );

  // Crea sottocartelle
  for (const original of paths) {
    const dir = `${event_name}/${original}/`;
    archive.append("", { name: `${dir}.keep` });
  }

  await archive.finalize();
}
