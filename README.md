# 🌊 GANGNEUNGOCEAN

> 강릉 5개 주요 해변의 **실시간 날씨 · 파고 · 수온** 통합 대시보드

정적 HTML/JS 사이트. 디자인 100% 보존, JavaScript 로직만 Open-Meteo 실시간 데이터로 교체.

## ✨ 기능

- 🏖️ **5개 해변 실시간 대시보드**: 경포해변 · 안목해변 · 강문해변 · 주문진해변 · 금진해변
- 🌊 **파고 시뮬레이터**: HTML5 Canvas로 실시간 출렁이는 물리 파도 엔진
- 📊 **활동 지수**: 서핑/해수욕 적합도 점수 및 안전 등급
- 📈 **시간별/주간 예보**: Open-Meteo 5일 예보
- 🌡️ **상세 통계**: 풍향·풍속·파주기·수온·습도·조석

## 🚀 빠른 시작

```bash
# 정적 사이트 — 빌드 불필요
open index.html
# 또는
python3 -m http.server 8000
# → http://localhost:8000
```

## 🔄 데이터 모드

| 모드 | 데이터 소스 | 사용법 |
|------|------------|--------|
| **시뮬레이션** (기본) | 하드코딩 mock + 4초 fluctuate | 설정 > 데이터 모드 > "시뮬레이션" |
| **실시간 API** | Open-Meteo Weather + Marine API | 설정 > 데이터 모드 > "실시간 외부 API 동기화 (Open-Meteo)" |

설정 변경은 우측 상단 ⚙️ 버튼 → 데이터 모드 선택 → "적용하기" 클릭.

## 📡 데이터 소스 (Open-Meteo)

- **Weather Forecast API**: `https://api.open-meteo.com/v1/forecast`
  - 기온(2m), 습도, 풍속/풍향(10m), WMO 하늘상태, 강수확률
  - 5일 × 24시간 (정시) + 일별 min/max
- **Marine Weather API**: `https://marine-api.open-meteo.com/v1/marine`
  - 유의파고, 파주기, 파향, 표층 수온
  - 3일 × 24시간 (정시) + 현재값

### 왜 Open-Meteo인가?

| 후보 | CORS | 무료 | 해양 | 결론 |
|------|------|------|------|------|
| 공공데이터포털(기상청) | ❌ | ✅ | ✅ | CORS 차폐로 브라우저 직접 호출 불가 |
| KMA API Hub | ❌ | ✅ | ✅ | 동일 CORS 문제 |
| **OpenWeatherMap** | ✅ | ✅ | ❌ (유료 전용) | Marine API는 유료 |
| **Open-Meteo** | ✅ | ✅ | ✅ | **채택** |

Open-Meteo는 비상업용 무료, API key 불필요, CORS 허용, **Marine API 무료 제공**이라는 정적 사이트에 필요한 모든 조건을 충족합니다.

## ⚠️ 알려진 한계

1. **해상 광역 데이터**: Open-Meteo Marine API는 0.08° 해상도. 강릉 5개 해변이 모두 같은 해상 셀에 들어가서 **파고/수온은 5개 해변이 동일한 값**을 표시합니다. 풍향/풍속(육상 영향)은 해변별로 다르게 표시됩니다.
2. **해상 경보 미반영**: 기상청/해양경찰청의 폭풍해일·풍랑주의보 등 공식 경보는 포함되지 않습니다. **실제 입수 결정은 반드시 기상청/해경 공식 정보를 확인**하세요.
3. **비상업용 라이선스**: Open-Meteo는 비상업용 무료입니다. 상업적 사용 시 별도 라이선스 필요.

## 🏗️ 구조

```
GANGNEUNGOCEAN/
├── index.html      # 디자인 + DOM 구조 (footer에 데이터 소스 라벨 추가)
├── style.css       # 100% 보존
├── app.js          # 데이터 fetch 모듈 추가
│   ├── BEACH_COORDS, WMO_MAP 상수
│   ├── fetchWeather / fetchMarine (캐싱 포함)
│   ├── refreshAllBeaches (5개 좌표 + marine 1회)
│   ├── renderForecast (API 모드 / 시뮬레이션 모드 분기)
│   └── startLiveRefreshLoop (10분 주기 갱신)
└── README.md
```

## 🔁 캐싱 & 트래픽

- **Weather**: 10분 캐시
- **Marine**: 30분 캐시
- **자동 갱신 주기**: 10분
- **모드 저장**: `localStorage.gangneung-ocean-data-mode` (페이지 새로고침 후에도 유지)

## 📄 라이선스

MIT

## 🙏 크레딧

- 데이터: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0, 비상업 무료)
- 디자인: Outfit, Noto Sans KR, FontAwesome 6
- 파도 시뮬레이터: HTML5 Canvas
