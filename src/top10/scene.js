import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Timer } from "three";

/**
 * Crea la escena 3D de la gráfica TOP 10.
 *
 * @param {HTMLCanvasElement} canvas - Canvas donde se renderiza la gráfica.
 * @param {Array} videos - Videos ordenados por número de vistas.
 * @returns {Object} Controles de la escena y método de limpieza.
 */
export function createScene(canvas, videos) {
  // --------------------------------------------------
  // 1. ESCENA, CÁMARA Y RENDERER
  // --------------------------------------------------

  const scene = new THREE.Scene();

  scene.background = new THREE.Color("#0b0e14");
  scene.fog = new THREE.Fog("#0b0e14", 22, 42);

  const camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.1,
    100
  );

  camera.position.set(9, 10, 17);
  camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.75)
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // --------------------------------------------------
  // 2. CONTROLES DE ÓRBITA
  // --------------------------------------------------

  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.target.set(0, 2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  controls.minDistance = 10;
  controls.maxDistance = 23;

  // Evita que la cámara se coloque debajo del suelo.
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;

  controls.enablePan = false;
  controls.autoRotate = false;

  controls.update();

  // --------------------------------------------------
  // 3. ILUMINACIÓN
  // --------------------------------------------------

  const ambientLight = new THREE.AmbientLight(
    "#ffffff",
    1.5
  );

  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(
    "#ffffff",
    2.2
  );

  keyLight.position.set(5, 12, 8);
  scene.add(keyLight);

  const redLight = new THREE.PointLight(
    "#ff304f",
    35,
    25
  );

  redLight.position.set(-5, 5, 2);
  scene.add(redLight);

  // --------------------------------------------------
  // 4. SUELO Y CUADRÍCULA
  // --------------------------------------------------

  const floorGeometry = new THREE.PlaneGeometry(30, 30);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#111722",
    roughness: 0.85,
    metalness: 0.1,
  });

  const floor = new THREE.Mesh(
    floorGeometry,
    floorMaterial
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.04;

  scene.add(floor);

  const grid = new THREE.GridHelper(
    30,
    30,
    "#55303c",
    "#252b38"
  );

  grid.position.y = 0;
  scene.add(grid);

  // --------------------------------------------------
  // 5. CONSTRUCCIÓN DE LAS BARRAS
  // --------------------------------------------------

  const bars = [];

  const barWidth = 0.8;
  const barDepth = 0.85;
  const spacing = 1.25;

  const maxViews = Math.max(
    ...videos.map((video) => video.vistas),
    1
  );

  // Altura máxima visual de las barras.
  const maxBarHeight = 8;

  // Centra horizontalmente las diez barras.
  const totalWidth = (videos.length - 1) * spacing;
  const startX = -totalWidth / 2;

  videos.forEach((video, index) => {
    const normalizedHeight =
      video.vistas / maxViews;

    const height = Math.max(
      normalizedHeight * maxBarHeight,
      0.15
    );

    const geometry = new THREE.BoxGeometry(
      barWidth,
      1,
      barDepth
    );

    const isTopThree = index < 3;

    const material = new THREE.MeshStandardMaterial({
      color: isTopThree ? "#ff304f" : "#bd263f",
      emissive: isTopThree ? "#4a0715" : "#24050b",
      emissiveIntensity: 0.8,
      metalness: 0.25,
      roughness: 0.35,
    });

    const mesh = new THREE.Mesh(
      geometry,
      material
    );

    // La geometría mide una unidad de alto.
    // Escalar en Y permite controlar la altura final.
    mesh.scale.y = height;

    mesh.position.set(
      startX + index * spacing,
      height / 2,
      0
    );

    // Datos asociados para identificar la barra.
    mesh.userData.videoIndex = index;
    mesh.userData.videoId = video.id;

    scene.add(mesh);

    bars.push({
      mesh,
      material,
      height,
      originalColor: material.color.clone(),
      originalEmissive: material.emissive.clone(),
      index,
    });
  });

  // --------------------------------------------------
  // 6. RESIZE RESPONSIVE
  // --------------------------------------------------

  let disposed = false;
  let frameId = 0;

  function resizeRenderer() {
    if (disposed) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
  }

  const resizeObserver = new ResizeObserver(
    resizeRenderer
  );

  resizeObserver.observe(canvas);

  // Primer ajuste de dimensiones.
  resizeRenderer();

  // --------------------------------------------------
  // 7. SELECCIÓN VISUAL
  // --------------------------------------------------

  function selectBar(index) {
    bars.forEach((bar, barIndex) => {
      const selected = barIndex === index;

      if (selected) {
        bar.material.color.set("#ff7185");
        bar.material.emissive.set("#7a1028");
        bar.material.emissiveIntensity = 1.5;
      } else {
        bar.material.color.copy(bar.originalColor);
        bar.material.emissive.copy(
          bar.originalEmissive
        );

        bar.material.emissiveIntensity = 0.8;
      }
    });
  }

  
  
  // --------------------------------------------------
  // 8. ANIMACIÓN Y RENDERIZADO
  // --------------------------------------------------

  const timer = new Timer();
  timer.connect(document);
  const animationDuration = 1.1;

  // Guarda las alturas finales antes de iniciar la animación.
  bars.forEach((bar) => {
    bar.mesh.scale.y = 0.001;
    bar.mesh.position.y = 0.0005;
  });

  function animate() {
    if (disposed) return;

    frameId = requestAnimationFrame(animate);

    // Actualiza el temporizador en cada frame.
    timer.update();

    // Tiempo transcurrido en segundos.
    const elapsed = timer.getElapsed();

    bars.forEach((bar, index) => {
      const delay = index * 0.07;

      const progress = THREE.MathUtils.clamp(
        (elapsed - delay) / animationDuration,
        0,
        1
      );

      // Ease-out cúbico para una entrada suave.
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentHeight = Math.max(
        bar.height * eased,
        0.001
      );

      bar.mesh.scale.y = currentHeight;
      bar.mesh.position.y = currentHeight / 2;
    });

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // --------------------------------------------------
  // 9. LIMPIEZA DE RECURSOS
  // --------------------------------------------------

  function dispose() {
    if (disposed) return;

    disposed = true;

    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    controls.dispose();

    // Libera geometrías y materiales de los objetos.
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material) => {
          material.dispose();
        });
      }
    });

    renderer.dispose();
  }

  // --------------------------------------------------
  // 10. API PÚBLICA DE LA ESCENA
  // --------------------------------------------------

  return {
    scene,
    camera,
    renderer,
    controls,
    bars,
    selectBar,
    dispose,
  };
}
