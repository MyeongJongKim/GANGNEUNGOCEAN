/* ==========================================
   GANGNEUNG OCEAN CASTER - APPLICATION LOGIC
   ========================================== */

// 1. DATA STATE
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
const dataModeSelect = document.getElementById("data-mode-select");
const apiInputsWrap = document.getElementById("api-inputs-wrap");

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

    const card = document.createElement("div");
    card.className = `beach-card ${isActive ? 'active' : ''}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <div class="beach-card-header">
        <h3>${data.name}</h3>
        <span class="beach-tag">${data.tag}</span>
      </div>
      <div class="beach-card-stat">
        <span class="label">유의파고</span>
        <span class="value">${data.waveHeight}m</span>
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

  selectedBeachNameEl.textContent = data.name;
  mainTempEl.textContent = `${data.temp.toFixed(1)}°C`;
  
  let skyIcon = '<i class="fa-solid fa-cloud-sun"></i>';
  if (data.skyCode === "clear") skyIcon = '<i class="fa-solid fa-sun-rising"></i>';
  if (data.skyCode === "cloudy") skyIcon = '<i class="fa-solid fa-cloud"></i>';
  if (data.skyCode === "rain") skyIcon = '<i class="fa-solid fa-cloud-rain"></i>';
  mainSkyEl.innerHTML = `${skyIcon} ${data.skyText}`;

  valWindEl.textContent = `${data.windDir} ${data.windSpeed}m/s`;
  valWaveHeightEl.textContent = `${data.waveHeight}m`;
  valWavePeriodEl.textContent = `${data.wavePeriod}초`;
  valWaterTempEl.textContent = `${data.waterTemp}°C`;
  valHumidityEl.textContent = `${data.humidity}%`;
  valTideEl.textContent = data.tide;

  overlayWaveHeight.textContent = `${data.waveHeight}m`;
  overlayWavePeriod.textContent = `${data.wavePeriod}s`;

  // Activity calculation & update
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
}

function renderForecast() {
  const data = beachData[currentBeachKey];
  
  // 1) Hourly Forecast Generation (Mocked based on current stats)
  forecastHourlyContainer.innerHTML = "";
  const baseTime = 9; // starting from 9:00 AM
  
  for (let i = 0; i < 8; i++) {
    const time = (baseTime + i * 3) % 24;
    const timeStr = `${time < 10 ? '0' + time : time}:00`;
    
    // Wave height varies slightly during the day
    const wVar = Math.sin(i * 0.8) * 0.15;
    const waveH = Math.max(0.1, data.waveHeight + wVar).toFixed(1);
    
    // Temperature variation
    const tVar = Math.cos((time - 14) / 4) * 2; // peak temp around 14:00
    const temp = (data.temp + tVar).toFixed(1);

    // Weather icon variations
    let weatherIcon = "fa-sun";
    if (data.skyCode === "cloudy" || (i % 3 === 1)) {
      weatherIcon = "fa-cloud-sun";
    }
    if (data.skyCode === "rain") {
      weatherIcon = "fa-cloud-showers-heavy";
    }

    const hourlyEl = document.createElement("div");
    hourlyEl.className = "hourly-item";
    hourlyEl.innerHTML = `
      <span class="time">${timeStr}</span>
      <i class="fa-solid ${weatherIcon} icon"></i>
      <span class="temp">${temp}°C</span>
      <span class="wave">${waveH}m</span>
    `;
    forecastHourlyContainer.appendChild(hourlyEl);
  }

  // 2) Weekly Forecast Generation
  forecastWeeklyContainer.innerHTML = "";
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
  const currentDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon etc.
  
  for (let i = 0; i < 5; i++) {
    const dayName = weekdays[(currentDayIndex + i) % 7];
    const waveH = Math.max(0.1, data.waveHeight + Math.sin(i * 1.5) * 0.3).toFixed(1);
    
    const minTemp = (data.temp - 4 + Math.cos(i) * 1).toFixed(0);
    const maxTemp = (data.temp + 2 + Math.sin(i) * 1.5).toFixed(0);

    let weatherIcon = "fa-sun";
    let skyText = "맑음";
    if (i === 2) {
      weatherIcon = "fa-cloud-sun";
      skyText = "구름조금";
    } else if (i === 3) {
      weatherIcon = "fa-cloud";
      skyText = "흐림";
    } else if (i === 4 && data.skyCode === "rain") {
      weatherIcon = "fa-cloud-showers-heavy";
      skyText = "비";
    }

    const weeklyEl = document.createElement("div");
    weeklyEl.className = "weekly-item";
    weeklyEl.innerHTML = `
      <span class="day">${i === 0 ? '오늘' : dayName + '요일'}</span>
      <span class="weather"><i class="fa-solid ${weatherIcon}"></i> ${skyText}</span>
      <span class="temp-range"><span>${maxTemp}°</span> / ${minTemp}°</span>
      <span class="wave">${waveH}m</span>
    `;
    forecastWeeklyContainer.appendChild(weeklyEl);
  }
}

// 6. LIVE DATA SIMULATOR FLUCTUATION (Updates data slightly every 4 seconds)
function startDataFluctuator() {
  setInterval(() => {
    if (dataModeSelect.value !== "simulated") return;

    Object.keys(beachData).forEach(key => {
      const data = beachData[key];
      // Fluctuate temp by -0.1 to +0.1
      data.temp += (Math.random() - 0.5) * 0.2;
      
      // Fluctuate wave height by -0.05 to +0.05
      data.waveHeight = Math.max(0.1, data.waveHeight + (Math.random() - 0.5) * 0.1);
      
      // Keep within realistic decimal digits
      data.temp = parseFloat(data.temp.toFixed(1));
      data.waveHeight = parseFloat(data.waveHeight.toFixed(1));
    });

    // Update simulation parameters based on active beach
    const currentData = beachData[currentBeachKey];
    waveSimulator.height = currentData.waveHeight;
    waveSimulator.period = currentData.wavePeriod;

    // Refresh display
    renderBeachCards();
    renderDashboardDetails();
    renderForecast();
  }, 4000);
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

  // API mode switch
  dataModeSelect.addEventListener("change", (e) => {
    if (e.target.value === "api") {
      apiInputsWrap.classList.remove("disabled");
    } else {
      apiInputsWrap.classList.add("disabled");
    }
  });

  // Manual wave customization slider changes
  customWaveHeight.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    customWaveHeightVal.textContent = `${val}m`;
    waveSimulator.height = val;
    overlayWaveHeight.textContent = `${val}m`;
    
    // dynamically recalculate scores in real-time
    const currentData = beachData[currentBeachKey];
    currentData.waveHeight = val; // temporarily apply to state
    renderDashboardDetails();
  });

  customWavePeriod.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    customWavePeriodVal.textContent = `${val}초`;
    waveSimulator.period = val;
    overlayWavePeriod.textContent = `${val}s`;
    
    const currentData = beachData[currentBeachKey];
    currentData.wavePeriod = val; // temporarily apply to state
    renderDashboardDetails();
  });

  // Apply button inside settings modal
  settingsSaveBtn.addEventListener("click", () => {
    const isApiMode = dataModeSelect.value === "api";
    
    if (isApiMode) {
      const openWeatherKey = document.getElementById("openweathermap-api-key").value.trim();
      const khoaKey = document.getElementById("khoa-api-key").value.trim();
      
      if (!openWeatherKey || !khoaKey) {
        alert("외부 API 연동을 위해 모든 API Key를 올바르게 입력해주세요. 현재는 임시로 시뮬레이션 모드를 사용합니다.");
        dataModeSelect.value = "simulated";
        apiInputsWrap.classList.add("disabled");
      } else {
        alert("API 연동 설정이 정상 저장되었습니다. (입력하신 키로 모사 연동 시작)");
      }
    } else {
      // simulated mode - refresh based on active sliders
      beachData[currentBeachKey].waveHeight = waveSimulator.height;
      beachData[currentBeachKey].wavePeriod = waveSimulator.period;
      renderBeachCards();
      renderDashboardDetails();
      renderForecast();
    }
    
    closeModal();
  });
}

// 9. APP INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  startClock();
  initCanvas();
  
  // Set default beach
  selectBeach("gyeongpo");
  
  setupEventListeners();
  
  // Start canvas loop
  drawWaveSimulator();
  
  // Start simulation fluctuation
  startDataFluctuator();
});
