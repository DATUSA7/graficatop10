import { loadVideos } from "./data.js";
import { createScene } from "./scene.js";
import { createInteraction } from "./interaction.js";

const $ = selector => document.querySelector(selector);
const watchVideoLink = document.getElementById(
  "watch-video-link"
);
const videoThumbnail = document.getElementById(
  "video-thumbnail"
);


const canvas = $("#chart-canvas");
const loading = $("#loading");
const status = $("#chart-status");
const select = $("#video-select");

const elements = {
  details: $("#video-details"),
  rank: $("#video-rank"),
  title: $("#video-title"),
  views: $("#video-views"),
  likes: $("#video-likes"),
  comments: $("#video-comments"),
  engagement: $("#video-engagement")
};

const integerFormat = new Intl.NumberFormat("es-MX");

const percentFormat = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

let videos = [];
let sceneController = null;
let interactionController = null;
let selectedIndex = -1;

function renderDetails(index) {
  const video = videos[index];
  if (!video) return;

  if (video.url && video.thumbnail) {
    watchVideoLink.href = video.url;
    videoThumbnail.src = video.thumbnail;
    videoThumbnail.alt = `Miniatura de ${video.titulo}`;
    watchVideoLink.hidden = false;
  } else {
    watchVideoLink.removeAttribute("href");
    videoThumbnail.removeAttribute("src");
    watchVideoLink.hidden = true;
  }

  const isValidYouTubeUrl = (value) => {
    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        (
          url.hostname === "www.youtube.com" ||
          url.hostname === "youtube.com" ||
          url.hostname === "youtu.be"
        )
      );
    } catch {
      return false;
    }
  };

  if (isValidYouTubeUrl(video.url)) {
    watchVideoLink.href = video.url;
    watchVideoLink.hidden = false;
  } else {
    watchVideoLink.removeAttribute("href");
    watchVideoLink.hidden = true;
  }

  selectedIndex = index;

  elements.rank.textContent =
    `#${String(index + 1).padStart(2, "0")}`;

  elements.title.textContent = video.titulo;
  elements.views.textContent =
    integerFormat.format(video.vistas);

  elements.likes.textContent =
    integerFormat.format(video.likes);

  elements.comments.textContent =
    integerFormat.format(video.comentarios);
    
  elements.engagement.textContent =
    `${percentFormat.format(video.engagement)}%`;

  // 1. CALCULAMOS PRIMERO la variable antes de usarla
  const viewsPerDay = video.vistasPorDia;

  const formattedViewsPerDay =
    viewsPerDay === null
      ? "No disponible"
      : `${new Intl.NumberFormat("es-MX", {
          maximumFractionDigits: 1
        }).format(viewsPerDay)} vistas/día`;

  // 2. USAMOS LA VARIABLE YA INICIALIZADA
  document.querySelector("#views-per-day").textContent =
    formattedViewsPerDay;

  // Mantiene sincronizado el selector HTML con la escena.
  select.value = String(index);

  // Actualiza los colores sin volver a crear la escena.
  sceneController?.selectBar(index);

  elements.details.classList.remove("details-updated");

  requestAnimationFrame(() => {
    elements.details.classList.add("details-updated");
  });
}

function populateSelector() {
  select.replaceChildren();

  videos.forEach((video, index) => {
    const option = document.createElement("option");

    option.value = String(index);
    option.textContent =
      `${String(index + 1).padStart(2, "0")} · ${video.titulo}`;

    select.append(option);
  });

  select.addEventListener("change", () => {
    const index = Number(select.value);

    if (Number.isInteger(index) && videos[index]) {
      renderDetails(index);
    }
  });
}

async function init() {
  try {
    status.textContent = "Leyendo estadísticas…";

    videos = await loadVideos();

    populateSelector();

    sceneController = createScene(
      canvas,
      videos
    );

    interactionController = createInteraction({
      canvas,
      camera: sceneController.camera,
      bars: sceneController.bars,
      videos,
      selectIndex: renderDetails
    });

    renderDetails(0);

    loading.hidden = true;

    status.textContent =
      `${videos.length} videos · Ordenados por número de vistas`;
  } catch (error) {
    console.error("Error al iniciar el TOP 10:", error);

    loading.textContent =
      "No se pudo cargar la gráfica. Revisa el archivo JSON.";

    status.textContent = error.message;
  }
}

window.addEventListener("pagehide", () => {
  interactionController?.dispose();
  sceneController?.dispose();
}, { once: true });

init();
