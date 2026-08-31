const mapFigure = document.querySelector(".vision-map");
const mapCanvas = document.querySelector("#vision-map-canvas");
const mapContext = mapCanvas?.getContext("2d", { alpha: true });
const mapMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (mapFigure && mapCanvas && mapContext) {
  const routes = [
    { destination: [-71, 43], duration: 5.1, delay: 0.04, arc: 0.13 },
    { destination: [-58, 18], duration: 6.4, delay: 0.42, arc: 0.18 },
    { destination: [-78, -18], duration: 5.8, delay: 0.18, arc: 0.2 },
    { destination: [-91, 67], duration: 6.7, delay: 0.62, arc: 0.2 },
    { destination: [-178, 62], duration: 5.4, delay: 0.34, arc: 0.16 },
    { destination: [-205, 42], duration: 7.1, delay: 0.76, arc: 0.24 },
    { destination: [-224, 18], duration: 6.1, delay: 0.51, arc: 0.28 },
    { destination: [-214, -23], duration: 7.4, delay: 0.88, arc: 0.25 },
    { destination: [-188, 4], duration: 5.6, delay: 0.27, arc: 0.16 },
    { destination: [-116, -30], duration: 6.9, delay: 0.7, arc: 0.12 },
  ];
  const origin = [-122.4194, 37.7749];
  let landGeometries = [];
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let visible = true;
  let reducedMotion = mapMotionPreference.matches;
  let frame = 0;
  let lastDraw = 0;

  const projectionScale = () => {
    const heightScale = height / 72;
    if (width < 900) return Math.min(width / 105, heightScale);
    return Math.max(width / 150, heightScale);
  };

  const project = ([longitude, latitude]) => {
    const scale = projectionScale();
    return [
      width * 0.44 + (longitude - origin[0]) * scale,
      height * 0.54 - (latitude - origin[1]) * scale,
    ];
  };

  const quadraticPoint = (start, control, end, amount) => {
    const inverse = 1 - amount;
    return [
      inverse * inverse * start[0] + 2 * inverse * amount * control[0] + amount * amount * end[0],
      inverse * inverse * start[1] + 2 * inverse * amount * control[1] + amount * amount * end[1],
    ];
  };

  const routeGeometry = (route) => {
    const start = project(origin);
    const end = project(route.destination);
    const horizontalDistance = end[0] - start[0];
    const headsSouth = end[1] > start[1] + height * 0.06;
    const control = [
      start[0] + horizontalDistance * 0.48,
      headsSouth
        ? Math.max(start[1], end[1]) + height * route.arc * 0.68
        : Math.min(start[1], end[1]) - height * route.arc,
    ];
    return { start, control, end };
  };

  function traceRing(ring) {
    let previousX = null;
    ring.forEach((coordinate, index) => {
      const [x, y] = project(coordinate);
      const crossesDateLine = previousX !== null && Math.abs(x - previousX) > width * 0.5;
      if (index === 0 || crossesDateLine) mapContext.moveTo(x, y);
      else mapContext.lineTo(x, y);
      previousX = x;
    });
    mapContext.closePath();
  }

  function traceLand() {
    if (!landGeometries.length) return;
    mapContext.beginPath();
    landGeometries.forEach((geometry) => {
      const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
      polygons.forEach((polygon) => polygon.forEach(traceRing));
    });
  }

  function drawGrid(lightTheme) {
    mapContext.save();
    mapContext.strokeStyle = lightTheme ? "rgba(41, 78, 128, 0.16)" : "rgba(91, 126, 169, 0.12)";
    mapContext.lineWidth = 1;
    mapContext.setLineDash([2, 8]);
    for (let longitude = -210; longitude <= -45; longitude += 15) {
      const [x] = project([longitude, 0]);
      mapContext.beginPath();
      mapContext.moveTo(x, -height * 0.1);
      mapContext.lineTo(x, height * 1.1);
      mapContext.stroke();
    }
    for (let latitude = -30; latitude <= 90; latitude += 15) {
      const [, y] = project([0, latitude]);
      mapContext.beginPath();
      mapContext.moveTo(-width * 0.1, y);
      mapContext.lineTo(width * 1.1, y);
      mapContext.stroke();
    }
    mapContext.restore();
  }

  function drawRouteSegment(geometry, startAmount, endAmount, lightTheme) {
    const steps = 22;
    mapContext.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const amount = startAmount + (endAmount - startAmount) * (step / steps);
      const point = quadraticPoint(geometry.start, geometry.control, geometry.end, amount);
      if (step === 0) mapContext.moveTo(point[0], point[1]);
      else mapContext.lineTo(point[0], point[1]);
    }
    mapContext.strokeStyle = lightTheme ? "rgba(21, 89, 197, 0.95)" : "rgba(149, 211, 255, 0.98)";
    mapContext.lineWidth = lightTheme ? 2.2 : 2;
    mapContext.shadowColor = lightTheme ? "rgba(21, 89, 197, 0.32)" : "rgba(75, 156, 255, 0.68)";
    mapContext.shadowBlur = lightTheme ? 8 : 13;
    mapContext.stroke();
  }

  function draw(timestamp = 0) {
    frame = requestAnimationFrame(draw);
    if (!visible || (!reducedMotion && timestamp - lastDraw < 24)) return;
    lastDraw = timestamp;

    const lightTheme = document.documentElement.dataset.theme === "light";
    mapContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    mapContext.clearRect(0, 0, width, height);
    const [originX, originY] = project(origin);
    mapContext.save();
    mapContext.translate(originX, originY);
    mapContext.rotate(-8 * Math.PI / 180);
    mapContext.translate(-originX, -originY);

    drawGrid(lightTheme);

    traceLand();
    mapContext.fillStyle = lightTheme ? "rgba(21, 89, 197, 0.13)" : "rgba(48, 83, 126, 0.3)";
    mapContext.strokeStyle = lightTheme ? "rgba(39, 78, 130, 0.62)" : "rgba(142, 174, 214, 0.58)";
    mapContext.lineWidth = lightTheme ? 1.2 : 1;
    mapContext.fill("evenodd");
    mapContext.stroke();

    routes.forEach((route) => {
      const geometry = routeGeometry(route);
      mapContext.beginPath();
      mapContext.moveTo(geometry.start[0], geometry.start[1]);
      mapContext.quadraticCurveTo(geometry.control[0], geometry.control[1], geometry.end[0], geometry.end[1]);
      mapContext.strokeStyle = lightTheme ? "rgba(21, 89, 197, 0.34)" : "rgba(96, 165, 250, 0.25)";
      mapContext.lineWidth = 1.15;
      mapContext.shadowBlur = 0;
      mapContext.stroke();

      if (reducedMotion) return;
      const progress = ((timestamp / 1000 / route.duration) + route.delay) % 1;
      drawRouteSegment(geometry, Math.max(0, progress - 0.105), progress, lightTheme);
    });
    mapContext.restore();

    const halo = reducedMotion ? 14 : 13 + Math.sin(timestamp * 0.0024) * 3;
    mapContext.beginPath();
    mapContext.arc(originX, originY, halo, 0, Math.PI * 2);
    mapContext.strokeStyle = lightTheme ? "rgba(21, 89, 197, 0.4)" : "rgba(96, 165, 250, 0.46)";
    mapContext.lineWidth = 1;
    mapContext.stroke();

    mapContext.beginPath();
    mapContext.arc(originX, originY, 4.2, 0, Math.PI * 2);
    mapContext.fillStyle = lightTheme ? "#1559c5" : "#a7dcff";
    mapContext.shadowColor = lightTheme ? "rgba(21, 89, 197, 0.46)" : "rgba(96, 165, 250, 0.86)";
    mapContext.shadowBlur = 14;
    mapContext.fill();
    mapContext.shadowBlur = 0;

    const computed = getComputedStyle(mapFigure);
    const labelSize = Math.max(10, Math.min(14, width * 0.012));
    mapContext.font = `500 ${labelSize}px ${computed.fontFamily}`;
    mapContext.fillStyle = lightTheme ? "rgba(19, 48, 84, 0.86)" : "rgba(212, 229, 249, 0.82)";
    mapContext.letterSpacing = "0.08em";
    mapContext.fillText("SAN FRANCISCO BAY AREA", originX + 14, originY - 15);
  }

  function resizeMap() {
    const bounds = mapFigure.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    mapCanvas.width = Math.round(width * pixelRatio);
    mapCanvas.height = Math.round(height * pixelRatio);
    mapCanvas.style.width = `${width}px`;
    mapCanvas.style.height = `${height}px`;
    lastDraw = 0;
  }

  const mapResizeObserver = new ResizeObserver(resizeMap);
  mapResizeObserver.observe(mapFigure);
  const mapVisibilityObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }, { rootMargin: "180px" });
  mapVisibilityObserver.observe(mapFigure);

  mapMotionPreference.addEventListener("change", (event) => {
    reducedMotion = event.matches;
    lastDraw = 0;
  });
  window.addEventListener("sfmemo:themechange", () => { lastDraw = 0; });

  fetch("/world-land.json")
    .then((response) => {
      if (!response.ok) throw new Error("Map data unavailable");
      return response.json();
    })
    .then((land) => {
      landGeometries = land.type === "FeatureCollection"
        ? land.features.map((item) => item.geometry).filter(Boolean)
        : [land.geometry].filter(Boolean);
      mapFigure.classList.add("is-ready");
      resizeMap();
    })
    .catch(() => mapFigure.classList.add("is-unavailable"));

  resizeMap();
  frame = requestAnimationFrame(draw);
}
