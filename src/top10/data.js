const DATA_URL = "/data/top10.json";


function getViewsPerDay(views, publicationDate) {
  if (
    typeof publicationDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)
  ) {
    return null;
  }

  const published = new Date(
    `${publicationDate}T00:00:00.000Z`
  );

  // Rechazar fechas inexistentes o mal formadas.
  if (
    Number.isNaN(published.getTime()) ||
    published.toISOString().slice(0, 10) !== publicationDate
  ) {
    return null;
  }

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const daysElapsed = Math.floor(
    (todayUTC - published.getTime()) / 86400000
  );

  // La fecha no puede estar en el futuro.
  if (daysElapsed < 0) return null;

  // Si se publicó hoy, usar un día como mínimo.
  const days = Math.max(1, daysElapsed);

  return views / days;
}

export async function loadVideos() {
  
  const response = await fetch(DATA_URL, {
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo leer ${DATA_URL} (HTTP ${response.status}).`
    );
  }

  const payload = await response.json();

  const source = Array.isArray(payload)
    ? payload
    : payload.videos;

  if (!Array.isArray(source) || source.length === 0) {
    throw new Error(
      'El JSON debe contener un arreglo "videos" con al menos un video.'
    );
  }

  const normalized = source.map((item, index) => {
    const titulo =
      item.titulo ??
      item.title ??
      item.nombre ??
      item.nombreVideo;

    const vistas = Number(
      item.vistas ?? item.views ?? item.reproducciones
    );

    const likes = Number(
      item.likes ?? item.meGusta ?? item.me_gusta
    );

    const comentarios = Number(
      item.comentarios ?? item.comments
    );

    // Conserva la URL original del video.
    const url = typeof item.url === "string"
      ? item.url.trim()
      : "";

    if (
      typeof titulo !== "string" ||
      !titulo.trim() ||
      !Number.isSafeInteger(vistas) ||
      !Number.isSafeInteger(likes) ||
      !Number.isSafeInteger(comentarios) ||
      vistas <= 0 ||
      likes < 0 ||
      comentarios < 0
    ) {
      throw new Error(
        `Datos no válidos en el video número ${index + 1}. ` +
        "Revisa título, vistas, likes y comentarios."
      );
    }

    // Acepta enlaces HTTPS de YouTube.
    let urlValida = "";

    if (url) {
      try {
        const parsedUrl = new URL(url);

        const dominiosPermitidos = [
          "youtube.com",
          "www.youtube.com",
          "m.youtube.com",
          "youtu.be",
        ];

        if (
          parsedUrl.protocol === "https:" &&
          dominiosPermitidos.includes(parsedUrl.hostname) &&
          (
            parsedUrl.hostname !== "youtu.be" ||
            parsedUrl.pathname.length > 1
          ) &&
          (
            parsedUrl.hostname === "youtu.be" ||
            parsedUrl.pathname === "/watch" ||
            parsedUrl.pathname.startsWith("/shorts/") ||
            parsedUrl.pathname.startsWith("/embed/")
          )
        ) {
          urlValida = parsedUrl.href;
        }
      } catch {
        // Si la URL es inválida, se conserva vacía.
      }
    }

   return {
    fechaPublicacion: item.fechaPublicacion ?? "",
    vistasPorDia: getViewsPerDay(
    vistas,
    item.fechaPublicacion
  ),

  id: String(item.id ?? `video-${index + 1}`),
  titulo: titulo.trim(),
  vistas,
  likes,
  comentarios,
  url: urlValida,
  thumbnail:
    typeof item.thumbnail === "string"
      ? item.thumbnail.trim()
      : "",
  engagement: ((likes + comentarios) / vistas) * 100,
  
};

  });

  // Orden descendente por vistas y selección de los primeros diez.
  return normalized
    .sort((a, b) => b.vistas - a.vistas)
    .slice(0, 10);
}
