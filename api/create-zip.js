import archiver from "archiver";

/**
 * Vercel Serverless Function (Node.js 20)
 * POST /api/create-zip
 * Body: { "event_name": "IAG2025", "paths": ["BORGO/2/0900_A.Klos", ...] }
 * Risponde con application/zip (attachment)
 */
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

  const sanitize = (p) =>
    String(p)
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/\\/g, "/")
      .trim();

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${event_name}.zip"`
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    res.status(500).end(String(err));
  });

  archive.pipe(res);

  archive.append(
    `Evento: ${event_name}\nInserisci qui le slide dei relatori nelle rispettive cartelle.\n`,
    { name: `${event_name}/README.txt` }
  );

  for (const original of paths) {
    const clean = sanitize(original);
    const dir = `${event_name}/${clean}/`;
    archive.append("", { name: `${dir}.keep` });
  }

  await archive.finalize();
}
