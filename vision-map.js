const mapFigure = document.querySelector(".vision-map");
const mapCanvas = document.querySelector("#vision-map-canvas");
const mapContext = mapCanvas?.getContext("2d", { alpha: true });
const mapMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (mapFigure && mapCanvas && mapContext) {
  const sanFrancisco = [-122.4194, 37.7749];
  const southBay = [-121.8863, 37.3382];
  const mapCenter = [-122.1, 37.55];
  const mapAngle = -6 * Math.PI / 180;
  const outboundRoutes = [
    { destination: [-123.55, 38.42], bend: -0.2 },
    { destination: [-123.72, 37.56], bend: -0.08 },
    { destination: [-123.42, 36.58], bend: 0.16 },
    { destination: [-121.02, 38.42], bend: 0.2 },
    { destination: [-120.62, 37.62], bend: 0.1 },
    { destination: [-120.94, 36.42], bend: -0.18 },
    { destination: [-122.02, 39.02], bend: -0.22 },
    { destination: [-121.7, 35.92], bend: 0.22 },
  ];

  let landGeometries = [];
  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let visible = true;
  let reducedMotion = mapMotionPreference.matches;
  let frame = 0;
  let lastDraw = 0;

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

  const projectionScale = () => Math.min(width / 2.6, height / 2.4);

  const project = ([longitude, latitude]) => {
    const scale = projectionScale();
    const rawX = (longitude - mapCenter[0]) * scale;
    const rawY = -(latitude - mapCenter[1]) * scale;
    const rotatedX = rawX * Math.cos(mapAngle) - rawY * Math.sin(mapAngle);
    const rotatedY = rawX * Math.sin(mapAngle) + rawY * Math.cos(mapAngle);
    return [width * 0.51 + rotatedX, height * 0.5 + rotatedY];
  };

  const quadraticPoint = (start, control, end, amount) => {
    const inverse = 1 - amount;
    return [
      inverse * inverse * start[0] + 2 * inverse * amount * control[0] + amount * amount * end[0],
      inverse * inverse * start[1] + 2 * inverse * amount * control[1] + amount * amount * end[1],
    ];
  };

  const routeGeometry = (startCoordinate, endCoordinate, bend = 0) => {
    const start = project(startCoordinate);
    const end = project(endCoordinate);
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const normalX = -deltaY / distance;
    const normalY = deltaX / distance;
    const control = [
      (start[0] + end[0]) / 2 + normalX * distance * bend,
      (start[1] + end[1]) / 2 + normalY * distance * bend,
    ];
    return { start, control, end };
  };

  function traceRing(ring) {
    ring.forEach((coordinate, index) => {
      const [x, y] = project(coordinate);
      if (index === 0) mapContext.moveTo(x, y);
      else mapContext.lineTo(x, y);
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
    mapContext.strokeStyle = lightTheme ? "rgba(36, 75, 126, 0.16)" : "rgba(100, 139, 187, 0.12)";
    mapContext.lineWidth = 1;
    mapContext.setLineDash([2, 8]);
    for (let longitude = -124.5; longitude <= -120.2; longitude += 0.5) {
      const start = project([longitude, 35.8]);
      const end = project([longitude, 39.4]);
      mapContext.beginPath();
      mapContext.moveTo(start[0], start[1]);
      mapContext.lineTo(end[0], end[1]);
      mapContext.stroke();
    }
    for (let latitude = 36; latitude <= 39.25; latitude += 0.5) {
      const start = project([-124.5, latitude]);
      const end = project([-120.2, latitude]);
      mapContext.beginPath();
      mapContext.moveTo(start[0], start[1]);
      mapContext.lineTo(end[0], end[1]);
      mapContext.stroke();
    }
    mapContext.restore();
  }

  function drawRouteBase(geometry, lightTheme, emphasis = false) {
    mapContext.beginPath();
    mapContext.moveTo(geometry.start[0], geometry.start[1]);
    mapContext.quadraticCurveTo(
      geometry.control[0],
      geometry.control[1],
      geometry.end[0],
      geometry.end[1],
    );
    mapContext.strokeStyle = lightTheme
      ? `rgba(21, 89, 197, ${emphasis ? 0.56 : 0.32})`
      : `rgba(96, 165, 250, ${emphasis ? 0.48 : 0.26})`;
    mapContext.lineWidth = emphasis ? 1.8 : 1.1;
    mapContext.setLineDash([]);
    mapContext.stroke();
  }

  function drawRouteSegment(geometry, progress, lightTheme, emphasis = false) {
    if (progress <= 0) return;
    const endAmount = clamp(progress);
    const startAmount = Math.max(0, endAmount - (emphasis ? 0.22 : 0.14));
    const steps = 24;
    mapContext.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const amount = startAmount + (endAmount - startAmount) * (step / steps);
      const point = quadraticPoint(geometry.start, geometry.control, geometry.end, amount);
      if (step === 0) mapContext.moveTo(point[0], point[1]);
      else mapContext.lineTo(point[0], point[1]);
    }
    mapContext.strokeStyle = lightTheme ? "rgba(19, 88, 202, 0.98)" : "rgba(165, 222, 255, 0.98)";
    mapContext.lineWidth = emphasis ? 2.6 : 2;
    mapContext.shadowColor = lightTheme ? "rgba(21, 89, 197, 0.38)" : "rgba(75, 156, 255, 0.82)";
    mapContext.shadowBlur = emphasis ? 15 : 11;
    mapContext.stroke();
    mapContext.shadowBlur = 0;

    const head = quadraticPoint(geometry.start, geometry.control, geometry.end, endAmount);
    mapContext.beginPath();
    mapContext.arc(head[0], head[1], emphasis ? 3.4 : 2.5, 0, Math.PI * 2);
    mapContext.fillStyle = lightTheme ? "#1559c5" : "#d7f1ff";
    mapContext.fill();
  }

  function drawNode(point, label, sublabel, lightTheme, align = "left") {
    const [x, y] = point;
    const primary = lightTheme ? "#1559c5" : "#9fd7ff";
    const text = lightTheme ? "rgba(19, 48, 84, 0.9)" : "rgba(221, 236, 252, 0.9)";
    const muted = lightTheme ? "rgba(34, 69, 111, 0.72)" : "rgba(169, 190, 216, 0.72)";
    const direction = align === "right" ? -1 : 1;
    const textAlign = align === "right" ? "right" : "left";
    const computed = getComputedStyle(mapFigure);
    const labelSize = Math.max(9, Math.min(12, width * 0.018));

    mapContext.beginPath();
    mapContext.arc(x, y, 11, 0, Math.PI * 2);
    mapContext.strokeStyle = lightTheme ? "rgba(21, 89, 197, 0.35)" : "rgba(96, 165, 250, 0.42)";
    mapContext.lineWidth = 1;
    mapContext.stroke();
    mapContext.beginPath();
    mapContext.arc(x, y, 4, 0, Math.PI * 2);
    mapContext.fillStyle = primary;
    mapContext.shadowColor = primary;
    mapContext.shadowBlur = 12;
    mapContext.fill();
    mapContext.shadowBlur = 0;

    mapContext.textAlign = textAlign;
    mapContext.font = `600 ${labelSize}px ${computed.fontFamily}`;
    mapContext.fillStyle = text;
    mapContext.fillText(label, x + direction * 16, y - 10);
    mapContext.font = `500 ${Math.max(8, labelSize - 2)}px ${computed.fontFamily}`;
    mapContext.fillStyle = muted;
    mapContext.fillText(sublabel, x + direction * 16, y + 8);
  }

  function draw(timestamp = 0) {
    frame = requestAnimationFrame(draw);
    if (!visible || (!reducedMotion && timestamp - lastDraw < 24)) return;
    lastDraw = timestamp;

    const lightTheme = document.documentElement.dataset.theme === "light";
    mapContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    mapContext.clearRect(0, 0, width, height);

    drawGrid(lightTheme);
    traceLand();
    mapContext.fillStyle = lightTheme ? "rgba(21, 89, 197, 0.12)" : "rgba(43, 78, 120, 0.32)";
    mapContext.strokeStyle = lightTheme ? "rgba(38, 76, 126, 0.6)" : "rgba(142, 174, 214, 0.6)";
    mapContext.lineWidth = lightTheme ? 1.2 : 1;
    mapContext.fill("evenodd");
    mapContext.stroke();

    const trunk = routeGeometry(sanFrancisco, southBay, -0.11);
    const branches = outboundRoutes.map((route) => routeGeometry(southBay, route.destination, route.bend));
    drawRouteBase(trunk, lightTheme, true);
    branches.forEach((geometry) => drawRouteBase(geometry, lightTheme));

    const cycle = reducedMotion ? 1 : (timestamp / 5200) % 1;
    const trunkProgress = reducedMotion ? 1 : clamp(cycle / 0.24);
    const branchProgress = reducedMotion ? 1 : clamp((cycle - 0.26) / 0.62);
    drawRouteSegment(trunk, trunkProgress, lightTheme, true);
    branches.forEach((geometry) => drawRouteSegment(geometry, branchProgress, lightTheme));

    drawNode(project(sanFrancisco), "SAN FRANCISCO", "OPERATIONS", lightTheme, "right");
    drawNode(project(southBay), "SOUTH BAY", "OUTBOUND NETWORK", lightTheme, "left");
  }

  function resizeMap() {
    const bounds = mapFigure.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
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
