import { sanFranciscoMainland, santaClaraCounty } from "./map-boundaries.js?v=1";

const mapFigure = document.querySelector(".vision-map");
const mapCanvas = document.querySelector("#vision-map-canvas");
const mapContext = mapCanvas?.getContext("2d", { alpha: true });
const mapMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (mapFigure && mapCanvas && mapContext) {
  const sanFrancisco = [-122.4194, 37.7749];
  const southBay = [-121.8863, 37.3382];
  const mapCenter = [-121.86, 37.36];
  const longitudeCorrection = Math.cos(mapCenter[1] * Math.PI / 180);
  const mapAngle = -7 * Math.PI / 180;
  const regionOutlines = [
    { role: "source", coordinates: sanFranciscoMainland },
    { role: "destination", coordinates: santaClaraCounty },
  ];
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
  let trunkGeometry = null;
  let branchGeometries = [];

  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const projectionScale = () => Math.min(width / 1.22, height / 1.05);

  const project = ([longitude, latitude]) => {
    const scale = projectionScale();
    const rawX = (longitude - mapCenter[0]) * longitudeCorrection * scale;
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
    return {
      start,
      control: [
        (start[0] + end[0]) / 2 + normalX * distance * bend,
        (start[1] + end[1]) / 2 + normalY * distance * bend,
      ],
      end,
    };
  };

  const extendRouteBeyondFrame = (geometry, overscan = 38) => {
    const isOutside = ([x, y]) => (
      x < -overscan || x > width + overscan || y < -overscan || y > height + overscan
    );
    let amount = 1;
    let end = geometry.end;
    while (amount < 12 && !isOutside(end)) {
      amount += 0.08;
      end = quadraticPoint(geometry.start, geometry.control, geometry.end, amount);
    }
    return {
      start: geometry.start,
      control: [
        geometry.start[0] + (geometry.control[0] - geometry.start[0]) * amount,
        geometry.start[1] + (geometry.control[1] - geometry.start[1]) * amount,
      ],
      end,
    };
  };

  function rebuildRoutes() {
    trunkGeometry = routeGeometry(sanFrancisco, southBay, -0.11);
    branchGeometries = outboundRoutes.map((route) => extendRouteBeyondFrame(
      routeGeometry(southBay, route.destination, route.bend),
    ));
  }

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

  function drawRegionOutlines(lightTheme) {
    regionOutlines.forEach((region) => {
      mapContext.beginPath();
      region.coordinates.forEach((coordinate, index) => {
        const [x, y] = project(coordinate);
        if (index === 0) mapContext.moveTo(x, y);
        else mapContext.lineTo(x, y);
      });
      mapContext.closePath();
      const destination = region.role === "destination";
      if (destination) {
        mapContext.fillStyle = lightTheme ? "rgba(21, 89, 197, 0.11)" : "rgba(55, 128, 225, 0.14)";
        mapContext.fill();
      }
      mapContext.strokeStyle = lightTheme
        ? `rgba(21, 89, 197, ${destination ? 0.9 : 0.78})`
        : `rgba(126, 194, 255, ${destination ? 0.92 : 0.8})`;
      mapContext.lineWidth = destination ? 2.2 : 1.9;
      mapContext.shadowColor = lightTheme ? "rgba(21, 89, 197, 0.22)" : "rgba(75, 156, 255, 0.45)";
      mapContext.shadowBlur = destination ? 13 : 9;
      mapContext.stroke();
      mapContext.shadowBlur = 0;
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
      : `rgba(96, 165, 250, ${emphasis ? 0.5 : 0.28})`;
    mapContext.lineWidth = emphasis ? 1.8 : 1.1;
    mapContext.setLineDash([]);
    mapContext.stroke();
  }

  function drawRouteWindow(geometry, startAmount, endAmount, lightTheme, emphasis = false, drawHead = false) {
    if (endAmount <= startAmount) return;
    mapContext.beginPath();
    for (let step = 0; step <= 24; step += 1) {
      const amount = startAmount + (endAmount - startAmount) * (step / 24);
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

    if (!drawHead) return;
    const head = quadraticPoint(geometry.start, geometry.control, geometry.end, clamp(endAmount));
    mapContext.beginPath();
    mapContext.arc(head[0], head[1], emphasis ? 3.4 : 2.5, 0, Math.PI * 2);
    mapContext.fillStyle = lightTheme ? "#1559c5" : "#d7f1ff";
    mapContext.fill();
  }

  function drawLoopingRouteSegment(geometry, progress, lightTheme, emphasis = false) {
    const endAmount = ((progress % 1) + 1) % 1;
    const tailLength = emphasis ? 0.22 : 0.16;
    const startAmount = endAmount - tailLength;
    if (startAmount < 0) {
      drawRouteWindow(geometry, 1 + startAmount, 1, lightTheme, emphasis);
      drawRouteWindow(geometry, 0, endAmount, lightTheme, emphasis, true);
      return;
    }
    drawRouteWindow(geometry, startAmount, endAmount, lightTheme, emphasis, true);
  }

  function drawNode(point, lightTheme, emphasized = false) {
    const [x, y] = point;
    const primary = lightTheme ? "#1559c5" : "#9fd7ff";
    mapContext.beginPath();
    mapContext.arc(x, y, emphasized ? 12 : 10, 0, Math.PI * 2);
    mapContext.strokeStyle = lightTheme ? "rgba(21, 89, 197, 0.42)" : "rgba(96, 165, 250, 0.48)";
    mapContext.lineWidth = 1;
    mapContext.stroke();
    mapContext.beginPath();
    mapContext.arc(x, y, emphasized ? 4.5 : 4, 0, Math.PI * 2);
    mapContext.fillStyle = primary;
    mapContext.shadowColor = primary;
    mapContext.shadowBlur = 12;
    mapContext.fill();
    mapContext.shadowBlur = 0;
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
    mapContext.fillStyle = lightTheme ? "rgba(21, 89, 197, 0.1)" : "rgba(43, 78, 120, 0.3)";
    mapContext.strokeStyle = lightTheme ? "rgba(38, 76, 126, 0.56)" : "rgba(142, 174, 214, 0.58)";
    mapContext.lineWidth = lightTheme ? 1.2 : 1;
    mapContext.fill("evenodd");
    mapContext.stroke();

    if (!trunkGeometry || !branchGeometries.length) rebuildRoutes();
    drawRouteBase(trunkGeometry, lightTheme, true);
    branchGeometries.forEach((geometry) => drawRouteBase(geometry, lightTheme));

    const flowProgress = reducedMotion ? 0.72 : (timestamp / 1900) % 1;
    const branchProgress = reducedMotion ? 0.62 : (flowProgress + 0.28) % 1;
    [flowProgress, (flowProgress + 0.5) % 1].forEach((progress) => {
      drawLoopingRouteSegment(trunkGeometry, progress, lightTheme, true);
    });
    [branchProgress, (branchProgress + 0.5) % 1].forEach((progress) => {
      branchGeometries.forEach((geometry) => drawLoopingRouteSegment(geometry, progress, lightTheme));
    });

    drawRegionOutlines(lightTheme);
    drawNode(project(sanFrancisco), lightTheme);
    drawNode(project(southBay), lightTheme, true);
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
    rebuildRoutes();
    lastDraw = 0;
  }

  new ResizeObserver(resizeMap).observe(mapFigure);
  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }, { rootMargin: "180px" }).observe(mapFigure);

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
