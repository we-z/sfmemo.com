const mapFigure = document.querySelector(".vision-map");
const mapCanvas = document.querySelector("#vision-map-canvas");
const mapContext = mapCanvas?.getContext("2d", { alpha: true });
const mapMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

if (mapFigure && mapCanvas && mapContext) {
  const sanFrancisco = [-122.4194, 37.7749];
  const southBay = [-121.8863, 37.3382];
  const mapCenter = [-121.95, 37.4];
  const mapAngle = -7 * Math.PI / 180;
  const countyOutlines = [
    {
      name: "San Francisco County",
      role: "source",
      coordinates: [
        [-122.40537, 37.70829], [-122.28178, 37.70823], [-122.37378, 37.88373],
        [-122.43228, 37.92982], [-122.41867, 37.8525], [-122.4991, 37.81988],
        [-122.61229, 37.81522], [-122.58817, 37.78936], [-122.57519, 37.70672],
        [-122.40537, 37.70829],
      ],
    },
    {
      name: "Santa Clara County",
      role: "destination",
      coordinates: [
        [-122.2026, 37.36322], [-122.17507, 37.32574], [-122.19306, 37.31828],
        [-122.16207, 37.30423], [-122.10423, 37.23427], [-122.05509, 37.2125],
        [-122.02617, 37.16685], [-121.75548, 37.04903], [-121.71876, 37.00756],
        [-121.7387, 36.98999], [-121.69536, 36.98515], [-121.69783, 36.9721],
        [-121.66479, 36.96371], [-121.64579, 36.93233], [-121.62476, 36.94045],
        [-121.59035, 36.92615], [-121.57572, 36.893], [-121.48895, 36.98315],
        [-121.45061, 36.98894], [-121.41825, 36.96055], [-121.21541, 36.96125],
        [-121.24657, 36.98523], [-121.23334, 37.01175], [-121.24865, 37.03368],
        [-121.2082, 37.06129], [-121.24548, 37.08915], [-121.21734, 37.12304],
        [-121.23663, 37.15668], [-121.26209, 37.15932], [-121.28111, 37.1836],
        [-121.29855, 37.16596], [-121.32841, 37.16595], [-121.35956, 37.18445],
        [-121.39902, 37.15014], [-121.42182, 37.22131], [-121.45575, 37.24944],
        [-121.45805, 37.28414], [-121.40575, 37.31099], [-121.42365, 37.35884],
        [-121.40908, 37.38067], [-121.45665, 37.39554], [-121.47261, 37.42334],
        [-121.46292, 37.45149], [-121.48677, 37.47565], [-121.47295, 37.48233],
        [-121.86527, 37.48464], [-121.92504, 37.45419], [-121.94491, 37.46916],
        [-122.05124, 37.45901], [-122.08147, 37.47784], [-122.1823, 37.43936],
        [-122.2026, 37.36322],
      ],
    },
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

  const projectionScale = () => Math.min(width / 1.85, height / 1.55);

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

  function drawCountyOutlines(lightTheme) {
    countyOutlines.forEach((county) => {
      mapContext.beginPath();
      county.coordinates.forEach((coordinate, index) => {
        const [x, y] = project(coordinate);
        if (index === 0) mapContext.moveTo(x, y);
        else mapContext.lineTo(x, y);
      });
      mapContext.closePath();
      const destination = county.role === "destination";
      mapContext.fillStyle = lightTheme
        ? `rgba(21, 89, 197, ${destination ? 0.13 : 0.08})`
        : `rgba(55, 128, 225, ${destination ? 0.16 : 0.1})`;
      mapContext.strokeStyle = lightTheme
        ? `rgba(21, 89, 197, ${destination ? 0.9 : 0.72})`
        : `rgba(126, 194, 255, ${destination ? 0.9 : 0.7})`;
      mapContext.lineWidth = destination ? 2.3 : 1.8;
      mapContext.shadowColor = lightTheme ? "rgba(21, 89, 197, 0.2)" : "rgba(75, 156, 255, 0.42)";
      mapContext.shadowBlur = destination ? 14 : 9;
      mapContext.fill();
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
      : `rgba(96, 165, 250, ${emphasis ? 0.48 : 0.26})`;
    mapContext.lineWidth = emphasis ? 1.8 : 1.1;
    mapContext.setLineDash([]);
    mapContext.stroke();
  }

  function drawRouteWindow(geometry, startAmount, endAmount, lightTheme, emphasis = false, drawHead = false) {
    if (endAmount <= startAmount) return;
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
    drawCountyOutlines(lightTheme);

    if (!trunkGeometry || !branchGeometries.length) rebuildRoutes();
    drawRouteBase(trunkGeometry, lightTheme, true);
    branchGeometries.forEach((geometry) => drawRouteBase(geometry, lightTheme));

    const flowProgress = reducedMotion ? 0.72 : (timestamp / 2300) % 1;
    const pulsePhases = reducedMotion ? [flowProgress] : [flowProgress, (flowProgress + 0.5) % 1];
    pulsePhases.forEach((progress) => {
      drawLoopingRouteSegment(trunkGeometry, progress, lightTheme, true);
      branchGeometries.forEach((geometry) => drawLoopingRouteSegment(geometry, progress, lightTheme));
    });

    drawNode(
      project(sanFrancisco),
      "SAN FRANCISCO COUNTY",
      "SOURCE",
      lightTheme,
      width < 520 ? "left" : "right",
    );
    drawNode(project(southBay), "SANTA CLARA COUNTY", "OUTBOUND NETWORK", lightTheme, "left");
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
