/* ==========================================
   GANGNEUNG OCEAN CASTER - APPLICATION LOGIC
   ========================================== */

// 1. DATA STATE
// 아래 초기값은 화면에 표시되지 않는 내부 시드값이다 (파도 시뮬레이터
// 애니메이션 구동용). 실제 수치는 Open-Meteo 응답이 도착해 liveWeather /
// liveMarine 플래그가 켜진 뒤에만 표시되며, 그 전에는 로딩 표시(--)를 그린다.
const beachData = {
  gyeongpo: {
    name: "경포해변",
    tag: "가족 · 레저",
    skyCode: "cloudy-sun",
    skyText: "구름조금",
    temp: 24.5,
    windDir: "남서풍",
    windSpeed: 4.2,
    waveHeight: 1.2,
    wavePeriod: 7.5,
    waterTemp: 20.1,
    humidity: 65,
    tide: "만조 14:20 (+42)"
  },
  anmok: {
    name: "안목해변",
    tag: "커피거리 · 휴식",
    skyCode: "clear",
    skyText: "맑음",
    temp: 25.2,
    windDir: "남풍",
    windSpeed: 2.5,
    waveHeight: 0.4,
    wavePeriod: 4.5,
    waterTemp: 21.0,
    humidity: 68,
    tide: "간조 08:35 (-12)"
  },
  gangmun: {
    name: "강문해변",
    tag: "포토존 · 커플",
    skyCode: "cloudy",
    skyText: "흐림",
    temp: 23.8,
    windDir: "북서풍",
    windSpeed: 3.8,
    waveHeight: 1.0,
    wavePeriod: 6.2,
    waterTemp: 20.3,
    humidity: 72,
    tide: "만조 15:10 (+38)"
  },
  jumunjin: {
    name: "주문진해변",
    tag: "드라마촬영지 · 서핑",
    skyCode: "clear",
    skyText: "맑음",
    temp: 23.1,
    windDir: "북동풍",
    windSpeed: 5.5,
    waveHeight: 1.8,
    wavePeriod: 8.5,
    waterTemp: 19.2,
    humidity: 60,
    tide: "만조 13:50 (+55)"
  },
  geumjin: {
    name: "금진해변",
    tag: "서핑성지 · 드라이브",
    skyCode: "clear",
    skyText: "맑음",
    temp: 24.0,
    windDir: "서풍",
    windSpeed: 4.0,
    waveHeight: 1.5,
    wavePeriod: 9.0,
    waterTemp: 19.8,
    humidity: 62,
    tide: "간조 09:15 (-18)"
  }
};

let currentBeachKey = "gyeongpo";
let waveSimulator = {
  height: 1.2, // meters
  period: 7.5  // seconds
};

// 1-1. LIVE DATA SOURCE CONFIG
// Open-Meteo: 무료, API key 불필요, CORS 허용, 비상업용 무료.
// Marine 데이터는 해변별 앞바다 지점(해안 좌표에서 동쪽으로 보정)으로
// 각각 조회해 해변마다 다른 파고/파주기/수온을 표시한다. 해안에 너무
// 붙어 격자값이 비는 경우 강릉 앞바다 공용 지점으로 폴백한다.
//
// 페이지 로드 시 자동으로 Open-Meteo에 연동하며, 더 이상 사용자가 모드를
// 선택할 필요가 없다 (시뮬레이션 모드는 더 이상 노출하지 않음).
const WEATHER_REFRESH_MS = 10 * 60 * 1000; // 10분 캐싱
const MARINE_REFRESH_MS  = 30 * 60 * 1000; // 30분 캐싱
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_BASE = "https://marine-api.open-meteo.com/v1/marine";

const BEACH_COORDS = {
  gyeongpo:  { lat: 37.7956, lon: 128.9100, name: "경포해변" },
  anmok:     { lat: 37.7744, lon: 128.9436, name: "안목해변" },
  gangmun:   { lat: 37.7950, lon: 128.9210, name: "강문해변" },
  jumunjin:  { lat: 37.8860, lon: 128.8220, name: "주문진해변" },
  geumjin:   { lat: 37.7700, lon: 128.9650, name: "금진해변" }
};

// Open-Meteo WMO weather_code → 기존 skyCode/skyText 매핑
// skyCode 값: clear | cloudy-sun | cloudy | rain (기존 아이콘 매핑 그대로 사용)
const WMO_MAP = {
  0:  { code: "clear",      text: "맑음" },
  1:  { code: "clear",      text: "대체로 맑음" },
  2:  { code: "cloudy-sun", text: "구름조금" },
  3:  { code: "cloudy",     text: "흐림" },
  45: { code: "cloudy",     text: "안개" },
  48: { code: "cloudy",     text: "안개" },
  51: { code: "rain",       text: "이슬비" },
  53: { code: "rain",       text: "이슬비" },
  55: { code: "rain",       text: "이슬비" },
  56: { code: "rain",       text: "진눈깨비" },
  57: { code: "rain",       text: "진눈깨비" },
  61: { code: "rain",       text: "약한 비" },
  63: { code: "rain",       text: "비" },
  65: { code: "rain",       text: "강한 비" },
  66: { code: "rain",       text: "진눈깨비" },
  67: { code: "rain",       text: "진눈깨비" },
  71: { code: "rain",       text: "약한 눈" },
  73: { code: "rain",       text: "눈" },
  75: { code: "rain",       text: "강한 눈" },
  77: { code: "rain",       text: "눈알갱이" },
  80: { code: "rain",       text: "소나기" },
  81: { code: "rain",       text: "소나기" },
  82: { code: "rain",       text: "강한 소나기" },
  85: { code: "rain",       text: "눈" },
  86: { code: "rain",       text: "강한 눈" },
  95: { code: "rain",       text: "뇌우" },
  96: { code: "rain",       text: "뇌우·우박" },
  99: { code: "rain",       text: "뇌우·우박" }
};

// 해변 키별 캐시 — 해변마다 좌표가 달라 응답도 다르다.
const weatherCaches = {}; // key → { data, expiresAt }
const marineCaches  = {}; // key → { data, expiresAt }
let lastFetchError = null;

// 푸터의 데이터 소스 라벨을 동적으로 갱신하는 헬퍼.
// index.html의 footer p 태그에 id="data-source-status" 가 있으면 라벨을 갱신한다.
function updateDataSourceLabel(ok) {
  const el = document.getElementById("data-source-status");
  if (!el) return;
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (ok) {
    el.innerHTML = `🌊 실시간 데이터: <strong>Open-Meteo</strong> (Marine + Weather Forecast) · 마지막 갱신 ${stamp} KST`;
    el.style.color = "";
  } else {
    el.innerHTML = `⚠️ 실시간 데이터 일시적 오류 · 마지막 갱신 ${stamp} KST · 자동 재시도 중`;
    el.style.color = "#f59e0b";
  }
}

// 2. DOM ELEMENTS
const currentDatetimeEl = document.getElementById("current-datetime");
const beachCardsContainer = document.getElementById("beach-cards");
const selectedBeachNameEl = document.getElementById("selected-beach-name");
const mainTempEl = document.getElementById("main-temp");
const mainSkyEl = document.getElementById("main-sky");
const valWindEl = document.getElementById("val-wind");
const valWaveHeightEl = document.getElementById("val-wave-height");
const valWavePeriodEl = document.getElementById("val-wave-period");
const valWaterTempEl = document.getElementById("val-water-temp");
const valHumidityEl = document.getElementById("val-humidity");
const valTideEl = document.getElementById("val-tide");

const overlayWaveHeight = document.getElementById("overlay-wave-height");
const overlayWavePeriod = document.getElementById("overlay-wave-period");

const surfBadge = document.getElementById("surf-badge");
const surfDesc = document.getElementById("surf-desc");
const surfScoreEl = document.getElementById("surf-score");
const swimBadge = document.getElementById("swim-badge");
const swimDesc = document.getElementById("swim-desc");
const swimScoreEl = document.getElementById("swim-score");

const tabHourly = document.getElementById("tab-hourly");
const tabWeekly = document.getElementById("tab-weekly");
const forecastHourlyContainer = document.getElementById("forecast-hourly-container");
const forecastWeeklyContainer = document.getElementById("forecast-weekly-container");

const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingsCancelBtn = document.getElementById("settings-cancel-btn");
const settingsSaveBtn = document.getElementById("settings-save-btn");
const settingsModal = document.getElementById("settings-modal");

const customWaveHeight = document.getElementById("custom-wave-height");
const customWaveHeightVal = document.getElementById("custom-wave-height-val");
const customWavePeriod = document.getElementById("custom-wave-period");
const customWavePeriodVal = document.getElementById("custom-wave-period-val");

// 3. CANVAS PHYSICS WAVE ENGINE
const canvas = document.getElementById("wave-canvas");
const ctx = canvas.getContext("2d");
let animationFrameId;

// Wave physics parameter
let waveOffset = 0;
let floatingObject = {
  x: 0,
  y: 0,
  targetY: 0,
  angle: 0,
  size: 32
};

function initCanvas() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  floatingObject.x = canvas.width * 0.35; // Position of surfer
}

function drawWaveSimulator() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, "#081735");
  bgGrad.addColorStop(1, "#030c1e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Wave mathematical parameters mapping
  // Map waveHeight (0.1m - 3.5m) to Canvas amplitude (5px - 60px)
  const amplitude = Math.max(5, Math.min(60, waveSimulator.height * 18));
  // Map wavePeriod (3s - 12s) to angular frequency & horizontal scale
  const frequency = 0.008 + (10 / waveSimulator.period) * 0.002;
  const speed = 0.015 + (12 / waveSimulator.period) * 0.015;

  waveOffset += speed;

  // Wave Layer 3 (Backwave - Slow, Deep Blue)
  drawSingleWaveLayer(
    amplitude * 0.6, 
    frequency * 0.8, 
    waveOffset * 0.7, 
    canvas.height * 0.55, 
    "rgba(7, 49, 114, 0.4)"
  );

  // Wave Layer 2 (Midwave - Medium Speed, Emerald Blue)
  drawSingleWaveLayer(
    amplitude * 0.8, 
    frequency * 1.1, 
    -waveOffset * 0.9 + 2, 
    canvas.height * 0.6, 
    "rgba(0, 150, 190, 0.55)"
  );

  // Wave Layer 1 (Frontwave - Main, Neon Mint)
  // We capture the surfer height and slope from this layer
  const mainWaveFunc = (x) => {
    return amplitude * Math.sin(x * frequency + waveOffset) + canvas.height * 0.65;
  };
  
  // Calculate derivative dy/dx to get the slope tangent angle
  const mainWaveSlope = (x) => {
    return amplitude * frequency * Math.cos(x * frequency + waveOffset);
  };

  // Draw surfer first if we want them behind the frontwave peak, 
  // but to keep it visible, we draw the surfer on top of Layer 2 and below Layer 1 or on Layer 1.
  // Drawing surfer on Layer 1 (Main front wave)
  const surferX = floatingObject.x;
  const surferY = mainWaveFunc(surferX);
  const slope = mainWaveSlope(surferX);
  const angle = Math.atan(slope);

  // Smooth surfer movement
  floatingObject.y += (surferY - floatingObject.y) * 0.2;
  floatingObject.angle += (angle - floatingObject.angle) * 0.2;

  // Draw Main Wave Layer 1
  drawSingleWaveLayer(
    amplitude, 
    frequency, 
    waveOffset, 
    canvas.height * 0.65, 
    "rgba(0, 242, 254, 0.75)"
  );

  // Draw Surfer
  drawSurfer(floatingObject.x, floatingObject.y - 12, floatingObject.angle);

  // Grid/Sea Depth light particles
  drawParticles();

  animationFrameId = requestAnimationFrame(drawWaveSimulator);
}

function drawSingleWaveLayer(amplitude, frequency, offset, baseY, color) {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);

  for (let x = 0; x <= canvas.width; x += 5) {
    const y = amplitude * Math.sin(x * frequency + offset) + baseY;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSurfer(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Draw Surfboard (Yellow/Orange gradient)
  ctx.beginPath();
  // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
  ctx.ellipse(0, 0, 24, 6, 0, 0, 2 * Math.PI);
  const boardGrad = ctx.createLinearGradient(-24, 0, 24, 0);
  boardGrad.addColorStop(0, "#ff4b2b");
  boardGrad.addColorStop(0.5, "#ffb400");
  boardGrad.addColorStop(1, "#00f5d4");
  ctx.fillStyle = boardGrad;
  ctx.shadowColor = "rgba(0, 242, 254, 0.5)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.stroke();

  // Draw Cute Surfer Character Silhouette (Stickman or Duck/Cute icon)
  ctx.shadowBlur = 0; // reset
  ctx.fillStyle = "#ffffff";
  
  // Surfer body (simple stylized vector path)
  ctx.beginPath();
  ctx.arc(0, -16, 5, 0, 2 * Math.PI); // Head
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-1, -11);
  ctx.lineTo(-4, -4); // Back leg
  ctx.moveTo(1, -11);
  ctx.lineTo(4, -4); // Front leg
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -7); // Torso
  ctx.moveTo(-7, -12);
  ctx.lineTo(0, -14);
  ctx.lineTo(7, -10); // Balancing arms
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.restore();
}

// Sparkly water particles
let particles = [];
function drawParticles() {
  if (particles.length < 15 && Math.random() < 0.05) {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height * 0.7 + Math.random() * (canvas.height * 0.3),
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      speedX: Math.random() * 0.4 - 0.2
    });
  }

  particles.forEach((p, idx) => {
    ctx.fillStyle = `rgba(0, 242, 254, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
    ctx.fill();

    p.y -= 0.2; // float up slowly
    p.x += p.speedX;
    p.alpha -= 0.002;

    if (p.alpha <= 0 || p.y < canvas.height * 0.6) {
      particles.splice(idx, 1);
    }
  });
}

// 4. BUSINESS LOGIC: SCORE CALCULATORS
function calculateSurfIndex(waveH, waveP, windS) {
  // Wave height score: Best 1.2m - 2.0m (up to 40pts)
  let heightScore = 0;
  if (waveH >= 1.2 && waveH <= 2.0) {
    heightScore = 40;
  } else if (waveH > 0.8 && waveH < 1.2) {
    heightScore = 30;
  } else if (waveH > 2.0 && waveH <= 2.8) {
    heightScore = 30; // rough but surfable for advanced
  } else if (waveH >= 0.4 && waveH <= 0.8) {
    heightScore = 15; // too small for regular boards
  } else if (waveH > 2.8) {
    heightScore = 5; // dangerous
  }

  // Wave period score: Best 7s - 10s (up to 40pts)
  let periodScore = 0;
  if (waveP >= 7.0 && waveP <= 10.0) {
    periodScore = 40;
  } else if (waveP > 5.0 && waveP < 7.0) {
    periodScore = 25;
  } else if (waveP > 10.0 && waveP <= 13.0) {
    periodScore = 35; // clean long-period swell
  } else if (waveP <= 5.0) {
    periodScore = 10; // windswell, messy
  }

  // Wind speed score: Best wind < 5m/s (up to 20pts)
  let windScore = 0;
  if (windS < 4.0) {
    windScore = 20;
  } else if (windS >= 4.0 && windS < 7.0) {
    windScore = 12;
  } else if (windS >= 7.0 && windS <= 10.0) {
    windScore = 5;
  } else {
    windScore = 0; // blown out
  }

  const score = heightScore + periodScore + windScore;

  // Grade
  let grade = "적합";
  let badgeClass = "good";
  let desc = "";

  if (waveH > 2.6 || windS > 11) {
    grade = "입수주의";
    badgeClass = "danger";
    desc = "태풍 또는 풍랑 경보급 기상으로 매우 위험합니다. 입수가 통제될 수 있습니다.";
  } else if (score >= 75) {
    grade = "매우 좋음";
    badgeClass = "good";
    desc = "적당한 파고와 최적의 파주기로 서핑하기 아주 훌륭한 날입니다. 라인업으로 나가세요!";
  } else if (score >= 50) {
    grade = "보통";
    badgeClass = "caution";
    desc = "파도가 조금 작거나 바람이 불어 면이 거칠 수 있습니다. 초보자 연습이나 스펀지 보드 추천.";
  } else {
    grade = "비추천 (Flat)";
    badgeClass = "danger";
    desc = "호수처럼 잔잔한 바다입니다. 서핑보드 대신 패들보드(SUP)나 스노클링을 즐기세요.";
  }

  return { score, grade, badgeClass, desc };
}

function calculateSwimIndex(waveH, waterTemp, windS) {
  // Wave height is key for swimming (up to 40pts)
  let waveScore = 0;
  if (waveH <= 0.4) {
    waveScore = 40; // Calm and safe
  } else if (waveH <= 0.8) {
    waveScore = 30; // Small waves
  } else if (waveH <= 1.2) {
    waveScore = 15; // Hard to swim safely for kids
  } else {
    waveScore = 0; // Dangerous undertow and break waves
  }

  // Water Temp (up to 40pts)
  let tempScore = 0;
  if (waterTemp >= 23.0) {
    tempScore = 40; // Warm
  } else if (waterTemp >= 20.0 && waterTemp < 23.0) {
    tempScore = 30; // Cool but nice
  } else if (waterTemp >= 17.0 && waterTemp < 20.0) {
    tempScore = 15; // Chilly, wetsuit recommended
  } else {
    tempScore = 5; // Very cold, hypothermia risk
  }

  // Wind (up to 20pts)
  let windScore = 0;
  if (windS < 5.0) {
    windScore = 20;
  } else if (windS >= 5.0 && windS < 8.0) {
    windScore = 10;
  } else {
    windScore = 0; // Strong wind, hazard
  }

  const score = waveScore + tempScore + windScore;

  let grade = "적합";
  let badgeClass = "good";
  let desc = "";

  if (waveH >= 1.5 || windS >= 9.0) {
    grade = "입수 통제";
    badgeClass = "danger";
    desc = "높은 파도와 이안류(역파도) 발생 우려로 해수욕 입수가 통제되는 상황입니다.";
  } else if (score >= 75) {
    grade = "해수욕 최적";
    badgeClass = "good";
    desc = "파도가 거의 없고 날씨가 따뜻해 온 가족이 편안히 해수욕과 물놀이를 즐기기 좋습니다.";
  } else if (score >= 50) {
    grade = "안전 유의";
    badgeClass = "caution";
    desc = "수온이 약간 낮거나 약한 너울이 있습니다. 구명조끼를 반드시 착용하고 물놀이를 하세요.";
  } else {
    grade = "추천하지 않음";
    badgeClass = "danger";
    desc = "파도가 거칠거나 수온이 너무 낮아 물놀이하기 부적합합니다. 해변 모래사장 산책을 추천합니다.";
  }

  return { score, grade, badgeClass, desc };
}

// 4-1. 기상 특보 수준 자동 판정
// Open-Meteo 실황 기반 참고용 판정이며 기상청 공식 특보가 아니다.
// (기상청 특보 API는 브라우저 CORS 차단으로 직접 연동 불가)
// 임계값은 기상청 특보 발표 기준을 준용:
//  - 풍랑: 유의파고 3m 초과 주의보 / 5m 초과 경보
//  - 강풍: 풍속 14m/s 이상 주의보 / 21m/s 이상 경보
//  - 폭염: 기온 33°C 이상 주의보 / 35°C 이상 경보
//  - 뇌우·이안류: 주의 안내
function computeBeachAlerts(data) {
  const alerts = [];

  if (data.waveHeight > 5) {
    alerts.push({ level: "warning", icon: "fa-water", label: "풍랑 경보 수준", detail: `유의파고 ${data.waveHeight}m` });
  } else if (data.waveHeight > 3) {
    alerts.push({ level: "watch", icon: "fa-water", label: "풍랑 주의보 수준", detail: `유의파고 ${data.waveHeight}m` });
  }

  if (data.windSpeed >= 21) {
    alerts.push({ level: "warning", icon: "fa-wind", label: "강풍 경보 수준", detail: `풍속 ${data.windSpeed}m/s` });
  } else if (data.windSpeed >= 14) {
    alerts.push({ level: "watch", icon: "fa-wind", label: "강풍 주의보 수준", detail: `풍속 ${data.windSpeed}m/s` });
  }

  if (data.temp >= 35) {
    alerts.push({ level: "warning", icon: "fa-temperature-high", label: "폭염 경보 수준", detail: `기온 ${data.temp}°C` });
  } else if (data.temp >= 33) {
    alerts.push({ level: "watch", icon: "fa-temperature-high", label: "폭염 주의보 수준", detail: `기온 ${data.temp}°C` });
  }

  if (/뇌우/.test(data.skyText || "")) {
    alerts.push({ level: "watch", icon: "fa-cloud-bolt", label: "뇌우 주의", detail: "낙뢰 위험 — 입수 금지" });
  }

  // 긴 주기의 높은 너울은 이안류(역파도) 발생 가능성이 높다.
  if (data.waveHeight >= 1.5 && data.wavePeriod >= 8) {
    alerts.push({ level: "watch", icon: "fa-person-drowning", label: "이안류 주의", detail: "긴 주기 너울 — 이안류 발생 가능" });
  }

  return alerts;
}

function renderAlerts() {
  const bar = document.getElementById("weather-alert-bar");
  if (!bar) return;
  const data = beachData[currentBeachKey];
  const note = `<span class="alert-note">Open-Meteo 실황 기반 자동 판정 · 공식 특보는 기상청 확인</span>`;

  // 실데이터 도착 전에는 특보를 판정하지 않는다 (시드값 기반 오판 방지)
  if (!(data.liveWeather && data.liveMarine)) {
    bar.innerHTML =
      `<span class="alert-chip loading"><i class="fa-solid fa-satellite-dish"></i> 실시간 데이터 수신 중…</span>` + note;
    return;
  }

  const alerts = computeBeachAlerts(data);

  if (alerts.length === 0) {
    bar.innerHTML =
      `<span class="alert-chip none"><i class="fa-solid fa-circle-check"></i> ${data.name} 특보 수준 기상 없음</span>` + note;
    return;
  }
  bar.innerHTML = alerts.map((a) =>
    `<span class="alert-chip ${a.level}"><i class="fa-solid ${a.icon}"></i> ${a.label} <em>${a.detail}</em></span>`
  ).join("") + note;
}

// 5. RENDER SYSTEM
function renderBeachCards() {
  beachCardsContainer.innerHTML = "";
  
  Object.keys(beachData).forEach(key => {
    const data = beachData[key];
    const isActive = key === currentBeachKey;
    
    // Dynamic Weather Icon based on sky
    let iconClass = "fa-cloud-sun";
    if (data.skyCode === "clear") iconClass = "fa-sun";
    if (data.skyCode === "cloudy") iconClass = "fa-cloud";
    if (data.skyCode === "rain") iconClass = "fa-cloud-showers-heavy";

    // 특보 수준 기상이면 카드에 경고 배지 표시 (경보 > 주의보 우선)
    // 실데이터 도착 전에는 판정하지 않는다 (시드값 기반 오판 방지)
    const isLive = data.liveWeather && data.liveMarine;
    const alerts = isLive ? computeBeachAlerts(data) : [];
    const alertLevel = alerts.some((a) => a.level === "warning")
      ? "warning" : (alerts.length ? "watch" : null);
    const alertBadge = alertLevel
      ? `<span class="beach-alert-badge ${alertLevel}" title="${alerts.map((a) => a.label).join(", ")}"><i class="fa-solid fa-triangle-exclamation"></i></span>`
      : "";
    const waveDisplay = data.liveMarine
      ? `${data.waveHeight}m`
      : `<span class="val-loading">--</span>`;

    const card = document.createElement("div");
    card.className = `beach-card ${isActive ? 'active' : ''}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <div class="beach-card-header">
        <h3>${data.name}${alertBadge}</h3>
        <span class="beach-tag">${data.tag}</span>
      </div>
      <div class="beach-card-stat">
        <span class="label">유의파고</span>
        <span class="value">${waveDisplay}</span>
      </div>
      <div class="beach-card-weather-icon">
        <i class="fa-solid ${iconClass}"></i>
      </div>
    `;

    // Click & Enter event
    const selectHandler = () => selectBeach(key);
    card.addEventListener("click", selectHandler);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") selectHandler();
    });

    beachCardsContainer.appendChild(card);
  });
}

function selectBeach(key) {
  currentBeachKey = key;
  const data = beachData[key];

  // Update simulator settings
  waveSimulator.height = data.waveHeight;
  waveSimulator.period = data.wavePeriod;

  // Sync to range sliders in modal
  customWaveHeight.value = data.waveHeight;
  customWaveHeightVal.textContent = `${data.waveHeight}m`;
  customWavePeriod.value = data.wavePeriod;
  customWavePeriodVal.textContent = `${data.wavePeriod}초`;

  renderBeachCards();
  renderDashboardDetails();
  renderForecast();
}

function renderDashboardDetails() {
  const data = beachData[currentBeachKey];
  const liveW = !!data.liveWeather;
  const liveM = !!data.liveMarine;

  selectedBeachNameEl.textContent = data.name;
  mainTempEl.textContent = liveW ? `${data.temp.toFixed(1)}°C` : "--°C";

  if (liveW) {
    let skyIcon = '<i class="fa-solid fa-cloud-sun"></i>';
    if (data.skyCode === "clear") skyIcon = '<i class="fa-solid fa-sun-rising"></i>';
    if (data.skyCode === "cloudy") skyIcon = '<i class="fa-solid fa-cloud"></i>';
    if (data.skyCode === "rain") skyIcon = '<i class="fa-solid fa-cloud-rain"></i>';
    mainSkyEl.innerHTML = `${skyIcon} ${data.skyText}`;
  } else {
    mainSkyEl.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> <span class="val-loading">수신 중…</span>`;
  }

  valWindEl.textContent = liveW ? `${data.windDir} ${data.windSpeed}m/s` : "--";
  valWaveHeightEl.textContent = liveM ? `${data.waveHeight}m` : "--";
  valWavePeriodEl.textContent = liveM ? `${data.wavePeriod}초` : "--";
  valWaterTempEl.textContent = liveM ? `${data.waterTemp}°C` : "--";
  valHumidityEl.textContent = liveW ? `${data.humidity}%` : "--";
  valTideEl.textContent = data.tide;

  overlayWaveHeight.textContent = liveM ? `${data.waveHeight}m` : "--";
  overlayWavePeriod.textContent = liveM ? `${data.wavePeriod}s` : "--";

  // Activity calculation & update
  // 실데이터가 모두 도착하기 전에는 시드값 기반 점수를 보여주지 않는다.
  if (liveW && liveM) {
    const surfResult = calculateSurfIndex(data.waveHeight, data.wavePeriod, data.windSpeed);
    surfScoreEl.textContent = surfResult.score;
    surfBadge.textContent = surfResult.grade;
    surfBadge.className = `status-badge ${surfResult.badgeClass}`;
    surfDesc.textContent = surfResult.desc;

    const swimResult = calculateSwimIndex(data.waveHeight, data.waterTemp, data.windSpeed);
    swimScoreEl.textContent = swimResult.score;
    swimBadge.textContent = swimResult.grade;
    swimBadge.className = `status-badge ${swimResult.badgeClass}`;
    swimDesc.textContent = swimResult.desc;
  } else {
    surfScoreEl.textContent = "--";
    surfBadge.textContent = "수신 중";
    surfBadge.className = "status-badge loading";
    surfDesc.textContent = "실시간 데이터를 불러오는 중입니다…";

    swimScoreEl.textContent = "--";
    swimBadge.textContent = "수신 중";
    swimBadge.className = "status-badge loading";
    swimDesc.textContent = "실시간 데이터를 불러오는 중입니다…";
  }

  renderAlerts();
}

function renderForecast() {
  const data = beachData[currentBeachKey];

  // 페이지 로드 시 자동으로 Open-Meteo에 연동되므로,
  // 시뮬레이션 분기 없이 항상 캐시된 API 데이터로 렌더링한다.
  // 예보도 선택된 해변의 좌표로 받은 데이터를 사용한다.
  const marine = marineCaches[currentBeachKey]?.data;
  const weather = weatherCaches[currentBeachKey]?.data;

  // 1) Hourly Forecast
  forecastHourlyContainer.innerHTML = "";

  if (marine && weather && marine.hourly && weather.hourly) {
    // Open-Meteo hourly에서 현재 시각 이후 8개 슬롯 (3시간 간격)
    const tArr = weather.hourly.time;
    const startIdx = pickCurrentIndex(tArr, weather.current?.time);
    const stepHours = 3; // 3시간 간격
    const slotsCount = 8;

    for (let k = 0; k < slotsCount; k++) {
      const i = Math.min(startIdx + k * stepHours, tArr.length - 1);
      const t = new Date(tArr[i]);
      const timeStr = `${String(t.getHours()).padStart(2, "0")}:00`;

      const temp = round1(weather.hourly.temperature_2m[i]);
      const wmoCode = weather.hourly.weather_code[i];
      const sky = WMO_MAP[wmoCode] || WMO_MAP[0];
      const waveH = marine.hourly.wave_height ? round1(marine.hourly.wave_height[i]) : data.waveHeight;
      const pop = weather.hourly.precipitation_probability ? weather.hourly.precipitation_probability[i] : 0;

      let weatherIcon = "fa-sun";
      if (sky.code === "cloudy-sun") weatherIcon = "fa-cloud-sun";
      else if (sky.code === "cloudy") weatherIcon = "fa-cloud";
      else if (sky.code === "rain") weatherIcon = "fa-cloud-showers-heavy";

      const hourlyEl = document.createElement("div");
      hourlyEl.className = "hourly-item";
      hourlyEl.innerHTML = `
        <span class="time">${timeStr}</span>
        <i class="fa-solid ${weatherIcon} icon"></i>
        <span class="temp">${temp}°C</span>
        <span class="wave">${waveH}m</span>
        ${pop >= 20 ? `<span class="pop" style="font-size:10px;opacity:0.7">💧${pop}%</span>` : ""}
      `;
      forecastHourlyContainer.appendChild(hourlyEl);
    }
  } else {
    // 실데이터 도착 전: 가짜 예보 대신 로딩 표시
    forecastHourlyContainer.innerHTML =
      `<div class="forecast-loading"><i class="fa-solid fa-satellite-dish"></i> 실시간 예보 불러오는 중…</div>`;
  }

  // 2) Weekly Forecast
  forecastWeeklyContainer.innerHTML = "";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  if (weather && weather.daily) {
    // Open-Meteo daily는 forecast_days=5로 받은 데이터
    const daily = weather.daily;
    for (let i = 0; i < Math.min(5, (daily.time || []).length); i++) {
      const day = new Date(daily.time[i]);
      const dayName = i === 0 ? "오늘" : weekdays[day.getDay()] + "요일";
      const minT = Math.round(daily.temperature_2m_min[i]);
      const maxT = Math.round(daily.temperature_2m_max[i]);
      const wmoCode = daily.weather_code ? daily.weather_code[i] : 0;
      const sky = WMO_MAP[wmoCode] || WMO_MAP[0];
      const waveH = (marine && marine.hourly && marine.hourly.wave_height && daily.time[i])
        ? (() => {
            const idx = pickCurrentIndex(marine.hourly.time, daily.time[i] + "T12:00");
            return round1(marine.hourly.wave_height[idx]);
          })()
        : data.waveHeight;

      let weatherIcon = "fa-sun";
      if (sky.code === "cloudy-sun") weatherIcon = "fa-cloud-sun";
      else if (sky.code === "cloudy") weatherIcon = "fa-cloud";
      else if (sky.code === "rain") weatherIcon = "fa-cloud-showers-heavy";

      const weeklyEl = document.createElement("div");
      weeklyEl.className = "weekly-item";
      weeklyEl.innerHTML = `
        <span class="day">${dayName}</span>
        <span class="weather"><i class="fa-solid ${weatherIcon}"></i> ${sky.text}</span>
        <span class="temp-range"><span>${maxT}°</span> / ${minT}°</span>
        <span class="wave">${waveH}m</span>
      `;
      forecastWeeklyContainer.appendChild(weeklyEl);
    }
  } else {
    // 실데이터 도착 전: 가짜 예보 대신 로딩 표시
    forecastWeeklyContainer.innerHTML =
      `<div class="forecast-loading"><i class="fa-solid fa-satellite-dish"></i> 실시간 예보 불러오는 중…</div>`;
  }
}

// 6. (제거됨) 시뮬레이션 4초 fluctuate 로직은 더 이상 사용하지 않음.
// Open-Meteo 실시간 데이터가 페이지 로드 시 자동으로 fetch된다.

// 6-1. LIVE DATA FROM OPEN-METEO (실시간 데이터 연동)
// 풍향(deg) → 한글 16방위
function vecToDirLabel(deg) {
  if (deg == null || Number.isNaN(deg)) return "-";
  const dirs = ["북", "북북동", "북동", "동북동",
                "동", "동남동", "남동", "남남동",
                "남", "남남서", "남서", "서남서",
                "서", "서북서", "북서", "북북서"];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[idx];
}

function pickCurrentIndex(timeArr, nowIso) {
  // 현재 시각과 가장 가까운 (또는 같은) 시간 인덱스 반환
  if (!Array.isArray(timeArr) || timeArr.length === 0) return 0;
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  let bestIdx = 0;
  let bestDiff = Math.abs(new Date(timeArr[0]).getTime() - nowMs);
  for (let i = 1; i < timeArr.length; i++) {
    const diff = Math.abs(new Date(timeArr[i]).getTime() - nowMs);
    if (diff < bestDiff) { bestIdx = i; bestDiff = diff; }
  }
  return bestIdx;
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function fetchWeather(key) {
  const cached = weatherCaches[key];
  if (cached && cached.data && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const { lat, lon } = BEACH_COORDS[key];
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` +
    `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&wind_speed_unit=ms` + // m/s 단위 (기본 km/h)
    `&timezone=Asia%2FSeoul&forecast_days=5`;
  const data = await fetchJson(url);
  weatherCaches[key] = { data, expiresAt: Date.now() + WEATHER_REFRESH_MS };
  return data;
}

// 해변별 파고 차별화를 위해 Marine은 해변마다 앞바다 지점으로 조회한다.
// 해안 좌표 그대로 조회하면 육지 격자에 걸려 값이 빌 수 있어 동쪽(외해)으로
// 0.05° 보정한다. 그래도 값이 비면 강릉 앞바다 공용 지점으로 폴백.
const MARINE_OFFSHORE_LON_OFFSET = 0.05;
const MARINE_FALLBACK = { lat: 37.79, lon: 128.97 };

async function fetchMarineAt(lat, lon) {
  const url = `${OPEN_METEO_MARINE_BASE}?latitude=${lat}&longitude=${lon}` +
    `&current=wave_height,wave_period,wave_direction,sea_surface_temperature` +
    `&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature` +
    `&timezone=Asia%2FSeoul&forecast_days=3`;
  return fetchJson(url);
}

async function fetchMarine(key) {
  const cached = marineCaches[key];
  if (cached && cached.data && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const { lat, lon } = BEACH_COORDS[key];
  let data = null;
  try {
    data = await fetchMarineAt(lat, round2(lon + MARINE_OFFSHORE_LON_OFFSET));
  } catch (err) {
    data = null;
  }
  if (!data || !data.current || data.current.wave_height == null) {
    data = await fetchMarineAt(MARINE_FALLBACK.lat, MARINE_FALLBACK.lon);
  }
  marineCaches[key] = { data, expiresAt: Date.now() + MARINE_REFRESH_MS };
  return data;
}

async function refreshAllBeaches() {
  const updated = [];
  const errors = [];

  // 해변별로 Weather(육상)와 Marine(해상)을 각각 조회한다.
  await Promise.all(
    Object.keys(BEACH_COORDS).map(async (key) => {
      const data = {};

      try {
        const w = await fetchWeather(key);
        const idx = pickCurrentIndex(w.hourly?.time, w.current?.time);
        const cur = w.current || {};
        const sky = WMO_MAP[cur.weather_code] || WMO_MAP[0];
        // Open-Meteo의 풍속은 m/s. 풍향은 degree.
        Object.assign(data, {
          liveWeather: true,
          skyCode: sky.code,
          skyText: sky.text,
          temp: round1(cur.temperature_2m ?? w.hourly.temperature_2m[idx]),
          windDir: vecToDirLabel(cur.wind_direction_10m ?? w.hourly.wind_direction_10m[idx]),
          windSpeed: round1(cur.wind_speed_10m ?? w.hourly.wind_speed_10m[idx]),
          humidity: Math.round(cur.relative_humidity_2m ?? w.hourly.relative_humidity_2m[idx] ?? 0)
        });
      } catch (err) {
        errors.push({ key, type: "weather", err });
      }

      try {
        const m = await fetchMarine(key);
        const mCur = m.current || {};
        Object.assign(data, {
          liveMarine: true,
          waveHeight: round1(mCur.wave_height ?? beachData[key].waveHeight ?? 0),
          wavePeriod: round1(mCur.wave_period ?? beachData[key].wavePeriod ?? 0),
          waterTemp: mCur.sea_surface_temperature != null
            ? round1(mCur.sea_surface_temperature)
            : (beachData[key].waterTemp ?? 0)
        });
      } catch (err) {
        errors.push({ key, type: "marine", err });
      }

      if (Object.keys(data).length) updated.push({ key, data });
    })
  );

  updated.forEach(({ key, data }) => {
    beachData[key] = { ...beachData[key], ...data };
  });

  // 현재 선택된 해변이면 파도 시뮬레이터 동기화
  const cur = beachData[currentBeachKey];
  if (cur) {
    waveSimulator.height = cur.waveHeight;
    waveSimulator.period = cur.wavePeriod;
    if (customWaveHeight) {
      customWaveHeight.value = cur.waveHeight;
      customWaveHeightVal.textContent = `${cur.waveHeight}m`;
    }
    if (customWavePeriod) {
      customWavePeriod.value = cur.wavePeriod;
      customWavePeriodVal.textContent = `${cur.wavePeriod}초`;
    }
  }

  // 화면 갱신
  renderBeachCards();
  renderDashboardDetails();
  renderForecast();

  // 푸터/상태 표시 (있을 때만)
  if (typeof updateDataSourceLabel === "function") updateDataSourceLabel(errors.length === 0);

  lastFetchError = errors.length ? errors : null;
  return { updated: updated.length, errors: errors.length };
}

// 7. TIME & CLOCK
function startClock() {
  function updateTime() {
    const now = new Date();
    // Force year 2026 as per local metadata context
    const year = 2026;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const day = weekdays[now.getDay()];
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    currentDatetimeEl.textContent = `${year}. ${month}. ${date}. (${day}) ${hours}:${minutes}`;
  }
  
  updateTime();
  setInterval(updateTime, 1000 * 60); // update every minute
}

// 8. INTERACTION EVENTS
function setupEventListeners() {
  // Forecast tabs toggle
  tabHourly.addEventListener("click", () => {
    tabHourly.classList.add("active");
    tabWeekly.classList.add("active"); // remove active first
    tabWeekly.classList.remove("active");
    forecastHourlyContainer.classList.add("active");
    forecastHourlyContainer.style.display = "flex";
    forecastWeeklyContainer.classList.remove("active");
    forecastWeeklyContainer.style.display = "none";
  });

  tabWeekly.addEventListener("click", () => {
    tabWeekly.classList.add("active");
    tabHourly.classList.remove("active");
    forecastWeeklyContainer.classList.add("active");
    forecastWeeklyContainer.style.display = "flex";
    forecastHourlyContainer.classList.remove("active");
    forecastHourlyContainer.style.display = "none";
  });

  // Modal Open/Close
  settingsOpenBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
  });

  const closeModal = () => {
    settingsModal.classList.remove("active");
  };

  settingsCloseBtn.addEventListener("click", closeModal);
  settingsCancelBtn.addEventListener("click", closeModal);

  // Settings backdrop click to close
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeModal();
  });

  // 수동 파도 커스터마이징 슬라이더 변경
  customWaveHeight.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    customWaveHeightVal.textContent = `${val}m`;
    waveSimulator.height = val;
    overlayWaveHeight.textContent = `${val}m`;

    // 점수만 실시간 재계산 (실제 데이터는 슬라이더로 덮어쓰지 않음)
    const currentData = beachData[currentBeachKey];
    const prevH = currentData.waveHeight;
    currentData.waveHeight = val; // 일시 적용
    renderDashboardDetails();
    currentData.waveHeight = prevH; // 원복
  });

  customWavePeriod.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    customWavePeriodVal.textContent = `${val}초`;
    waveSimulator.period = val;
    overlayWavePeriod.textContent = `${val}s`;

    const currentData = beachData[currentBeachKey];
    const prevP = currentData.wavePeriod;
    currentData.wavePeriod = val;
    renderDashboardDetails();
    currentData.wavePeriod = prevP;
  });

  // 적용 버튼: Open-Meteo 수동 새로고침 + 푸터 갱신
  settingsSaveBtn.addEventListener("click", async () => {
    closeModal();
    const result = await refreshAllBeaches();
    if (typeof showDataSourceToast === "function") {
      showDataSourceToast(result && result.errors === 0
        ? "✅ Open-Meteo 데이터 새로고침 완료"
        : "⚠️ 일부 데이터 fetch 실패, 자동 재시도 중");
    } else {
      alert(result && result.errors === 0
        ? "Open-Meteo 데이터가 새로고침되었습니다."
        : "Open-Meteo 호출 중 일부 오류가 발생했습니다. 잠시 후 자동 재시도합니다.");
    }
  });
}

// 8-1. LIVE REFRESH LOOP CONTROL
let liveRefreshTimer = null;
function startLiveRefreshLoop() {
  stopLiveRefreshLoop();
  liveRefreshTimer = setInterval(() => {
    refreshAllBeaches();
  }, WEATHER_REFRESH_MS);
}
function stopLiveRefreshLoop() {
  if (liveRefreshTimer) {
    clearInterval(liveRefreshTimer);
    liveRefreshTimer = null;
  }
}

// 9. APP INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  initCanvas();

  // Set default beach (초기 mock 데이터로 먼저 렌더)
  selectBeach("gyeongpo");

  setupEventListeners();

  // Start canvas loop
  drawWaveSimulator();

  // 페이지 로드 시 자동으로 Open-Meteo 실시간 데이터 연동 시작.
  // (사용자 모드 선택 불필요 — API key도 불필요)
  refreshAllBeaches().then(() => startLiveRefreshLoop());
});