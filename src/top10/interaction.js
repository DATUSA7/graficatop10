
import * as THREE from "three";

const numberFormat = new Intl.NumberFormat("es-MX");

export function createInteraction({
  canvas,
  camera,
  bars,
  videos,
  selectIndex
}) {
  const stage = canvas.parentElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const tooltip = document.querySelector("#bar-tooltip");
  const tooltipRank = document.querySelector("#tooltip-rank");
  const tooltipTitle = document.querySelector("#tooltip-title");
  const tooltipViews = document.querySelector("#tooltip-views");

  let activePointer = null;
  let hoveredIndex = -1;

  function getHit(event) {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    pointer.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const meshes = bars.map(bar => bar.mesh);
    const hits = raycaster.intersectObjects(meshes, false);

    return hits.length ? hits[0] : null;
  }

  function hideTooltip() {
    tooltip.classList.remove("is-visible");
    tooltip.setAttribute("aria-hidden", "true");
    hoveredIndex = -1;
  }

  function showTooltip(index, clientX, clientY) {
    const video = videos[index];

    if (!video) return;

    hoveredIndex = index;

    tooltipRank.textContent =
      `VIDEO #${String(index + 1).padStart(2, "0")}`;

    tooltipTitle.textContent = video.titulo;
    tooltipViews.textContent =
      `${numberFormat.format(video.vistas)} vistas`;

    // Primero se muestra para poder medir sus dimensiones.
    tooltip.classList.add("is-visible");
    tooltip.setAttribute("aria-hidden", "false");

    const stageRect = stage.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;

    let left = clientX - stageRect.left + 14;
    let top = clientY - stageRect.top + 14;

    // Si no cabe a la derecha, se coloca a la izquierda.
    if (left + tooltipRect.width > stageRect.width - padding) {
      left =
        clientX - stageRect.left -
        tooltipRect.width - 14;
    }

    left = Math.max(
      padding,
      Math.min(
        left,
        stageRect.width - tooltipRect.width - padding
      )
    );

    // Evita que se salga por abajo.
    if (top + tooltipRect.height > stageRect.height - padding) {
      top =
        clientY - stageRect.top -
        tooltipRect.height - 14;
    }

    top = Math.max(
      padding,
      Math.min(
        top,
        stageRect.height - tooltipRect.height - padding
      )
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function handlePointerMove(event) {
    // No mostramos tooltips mientras se arrastra para orbitar.
    if (activePointer !== null) {
      const dx = event.clientX - activePointer.x;
      const dy = event.clientY - activePointer.y;

      if (Math.hypot(dx, dy) > 5) {
        activePointer.moved = true;
        hideTooltip();
      }

      return;
    }

    // El hover es útil con ratón, pero no es necesario en pantallas táctiles.
    if (event.pointerType === "touch") return;

    const hit = getHit(event);

    if (!hit) {
      if (hoveredIndex !== -1) hideTooltip();

      canvas.style.cursor = "grab";
      return;
    }

    const index = hit.object.userData.videoIndex;

    canvas.style.cursor = "pointer";
    showTooltip(index, event.clientX, event.clientY);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    activePointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false
    };
  }

  function handlePointerUp(event) {
    if (!activePointer || activePointer.id !== event.pointerId) {
      return;
    }

    const start = activePointer;
    activePointer = null;

    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y
    );

    // Un arrastre pertenece a OrbitControls, no a la selección.
    if (start.moved || distance > 6) {
      hideTooltip();
      return;
    }

    const hit = getHit(event);

    if (!hit) {
      if (event.pointerType === "touch") hideTooltip();
      return;
    }

    const index = hit.object.userData.videoIndex;

    selectIndex(index);
    showTooltip(index, event.clientX, event.clientY);
  }

  function handlePointerLeave(event) {
    if (event.pointerType !== "touch") {
      hideTooltip();
      canvas.style.cursor = "grab";
    }
  }

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerLeave);
  canvas.addEventListener("pointerleave", handlePointerLeave);

  return {
    dispose() {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerLeave);
      canvas.removeEventListener("pointerleave", handlePointerLeave);

      hideTooltip();
    }
  };
}
