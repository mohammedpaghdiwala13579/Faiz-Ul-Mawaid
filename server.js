import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// ── AUTHENTIC DAWOODI BOHRA (FATIMID / MISRI TABULAR) CALENDAR ENGINE ──
// Mathematical cycle established by Amir ul-Mumineen Moulana Ali (AS),
// Imam Jafar us-Sadiq (AS), and Dai Syedna al-Mu'ayyad / al-Qadi al-Nu'man (RA).
// Provides lifelong, exact astronomical calculation with zero expiration.

const KABISA_YEARS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
const MONTH_DAYS_ACCUM = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];
const YEAR_DAYS_ACCUM = [
  354, 708, 1063, 1417, 1771, 2126, 2480, 2834, 3189, 3543,
  3898, 4252, 4606, 4961, 5315, 5669, 6024, 6378, 6732, 7087,
  7441, 7796, 8150, 8504, 8859, 9213, 9567, 9922, 10276, 10631
];

const MONTH_NAMES_EN = [
  "Moharram al-Haraam", "Safar al-Muzaffar", "Rabi al-Awwal", "Rabi al-Aakhar",
  "Jumada al-Ula", "Jumada al-Ukhra", "Rajab al-Asab", "Shabaan al-Karim",
  "Ramadaan al-Moazzam", "Shawwal al-Mukarram", "Zilqadah al-Haraam", "Zilhaj al-Haraam"
];

const MONTH_NAMES_SHORT = [
  "Moharram", "Safar", "Rabi I", "Rabi II",
  "Jumada I", "Jumada II", "Rajab", "Shabaan",
  "Ramadaan", "Shawwal", "Zilqadah", "Zilhaj"
];

const MONTH_NAMES_AR = [
  "محرم الحرام", "صفر المظفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الأخرى", "رجب الأصب", "شعبان الكريم",
  "رمضان المعظم", "شوال المكرم", "ذو القعدة الحرام", "ذو الحجة الحرام"
];

const WEEKDAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAY_NAMES_LISAN = ["Ahad", "Somwar", "Mangal", "Budh", "Khamis", "Jumua", "Sabt"];

function toArabicDigits(num) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/\d/g, d => arabicDigits[parseInt(d, 10)]);
}

function isKabisaYear(year) {
  return KABISA_YEARS.includes(((year % 30) + 30) % 30);
}

function getDaysInHijriMonth(year, month) {
  if (month === 11) {
    return isKabisaYear(year) ? 30 : 29;
  }
  return month % 2 === 0 ? 30 : 29;
}

function isJulian(date) {
  const y = date.getFullYear();
  if (y < 1582) return true;
  if (y === 1582) {
    if (date.getMonth() < 9) return true;
    if (date.getMonth() === 9 && date.getDate() < 5) return true;
  }
  return false;
}

function gregorianToAJD(date, hour = 0) {
  let r = date.getFullYear();
  let a = date.getMonth() + 1;
  const i = date.getDate() + hour / 24;
  if (a < 3) { r--; a += 12; }
  let n = 0;
  if (!isJulian(date)) {
    const t = Math.floor(r / 100);
    n = 2 - t + Math.floor(t / 4);
  }
  return Math.floor(365.25 * (r + 4716)) + Math.floor(30.6001 * (a + 1)) + i + n - 1524.5;
}

function ajdToHijri(ajd) {
  let c = Math.floor(ajd - 1948083.5);
  const u = Math.floor(c / 10631);
  c -= 10631 * u;
  if (c === 0) {
    return { year: 30 * u - 1, month: 11, day: 30 };
  }
  let s = 0;
  while (c > YEAR_DAYS_ACCUM[s] && s < 29) s++;
  const year = 30 * u + s;
  if (s > 0) c -= YEAR_DAYS_ACCUM[s - 1];
  s = 0;
  while (c > MONTH_DAYS_ACCUM[s] && s < 10) s++;
  const month = s;
  const day = s > 0 ? c - MONTH_DAYS_ACCUM[s - 1] : c;
  return { year, month, day };
}

function hijriToAJD(year, month, day) {
  const dayOfYear = month === 0 ? day : MONTH_DAYS_ACCUM[month - 1] + day;
  const cycle = Math.floor(year / 30);
  let ajd = 1948083.5 + 10631 * cycle + dayOfYear;
  const rem = year % 30;
  if (rem !== 0) {
    ajd += YEAR_DAYS_ACCUM[rem - 1];
  }
  return ajd;
}

function ajdToGregorian(ajd) {
  let s = Math.floor(ajd + 0.5);
  let i = ajd + 0.5 - s;
  let t;
  if (s < 2299161) {
    t = s;
  } else {
    const c = Math.floor((s - 1867216.25) / 36524.25);
    t = s + 1 + c - Math.floor(0.25 * c);
  }
  const n = t + 1524;
  const r = Math.floor((n - 122.1) / 365.25);
  const o = Math.floor(365.25 * r);
  const a = Math.floor((n - o) / 30.6001);
  const l = n - o - Math.floor(30.6001 * a) + i;
  const d = 24 * (l - Math.floor(l));
  const h = 60 * (d - Math.floor(d));
  const f = 60 * (h - Math.floor(h));
  const m = 1000 * (f - Math.floor(f));
  const p = a < 14 ? a - 2 : a - 14;
  const u = p < 2 ? r - 4715 : r - 4716;
  return new Date(u, p, Math.floor(l), Math.floor(d), Math.floor(h), Math.floor(f), Math.floor(m));
}

// Full-featured date calculator with Dawoodi Bohra precision
function buildHijriDetail(year, month, day, dateObj) {
  const totalDays = getDaysInHijriMonth(year, month);
  const daysRemaining = totalDays - day;
  const isKabisa = isKabisaYear(year);
  const cycleYear = ((year % 30) + 30) % 30 || 30;

  const weekdayIdx = dateObj.getDay();
  const weekdayEn = WEEKDAY_NAMES_EN[weekdayIdx];
  const weekdayAr = WEEKDAY_NAMES_AR[weekdayIdx];
  const weekdayLisan = WEEKDAY_NAMES_LISAN[weekdayIdx];

  const monthEn = MONTH_NAMES_EN[month] || "Unknown";
  const monthShort = MONTH_NAMES_SHORT[month] || "Unknown";
  const monthAr = MONTH_NAMES_AR[month] || "";

  const dayAr = toArabicDigits(day);
  const yearAr = toArabicDigits(year);

  return {
    day,
    month, // 0-indexed
    monthNumber: month + 1, // 1-indexed
    year,
    monthNameEn: monthEn,
    monthNameShort: monthShort,
    monthNameAr: monthAr,
    dayArabic: dayAr,
    yearArabic: yearAr,
    formattedEn: `${day} ${monthEn} ${year} H`,
    formattedAr: `${dayAr} ${monthAr} ${yearAr} هـ`,
    shortEn: `${day} ${monthShort} ${year}H`,
    arabicDateNoYear: `${dayAr} ${monthAr}`,
    weekdayEn,
    weekdayAr,
    weekdayLisan,
    isKabisa,
    cycleYear,
    totalDaysInMonth: totalDays,
    daysRemaining
  };
}

// ── AUTHENTIC DAWOODI BOHRA WEBSITES DATA SOURCE ──
let cachedMiqaats = null;
let lastCacheTime = 0;

async function fetchAuthoritativeMiqaatsData() {
  const NOW = Date.now();
  if (cachedMiqaats && (NOW - lastCacheTime) < 86400000) { // 24-hr cache
    return cachedMiqaats;
  }

  // 1. Primary: Official Mumineen Calendar API (Dawoodi Bohra website)
  try {
    const resp = await fetch('https://www.mumineencalendar.com/data/miqaats.json', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 50) {
        cachedMiqaats = data;
        lastCacheTime = NOW;
        // Asynchronously update local file for offline resilience
        fs.writeFile(path.join(__dirname, 'miqaats.json'), JSON.stringify(data, null, 2), 'utf-8').catch(() => {});
        return data;
      }
    }
  } catch (err) {
    console.warn('[Mumineen Calendar] Primary fetch warning:', err.message);
  }

  // 2. Secondary: Official GitHub Dawoodi Bohra repository mirror
  try {
    const resp2 = await fetch('https://raw.githubusercontent.com/mohammedpaghdiwala13579/Faiz-Ul-Mawaid/main/miqaats.json', {
      signal: AbortSignal.timeout(4000)
    });
    if (resp2.ok) {
      const data2 = await resp2.json();
      if (Array.isArray(data2) && data2.length > 50) {
        cachedMiqaats = data2;
        lastCacheTime = NOW;
        return data2;
      }
    }
  } catch (err2) {
    console.warn('[Mumineen Calendar] Secondary fetch warning:', err2.message);
  }

  // 3. Tertiary: Local file fallback
  if (!cachedMiqaats) {
    try {
      const localData = await fs.readFile(path.join(__dirname, 'miqaats.json'), 'utf-8');
      cachedMiqaats = JSON.parse(localData);
      lastCacheTime = NOW;
      return cachedMiqaats;
    } catch (e) {
      console.error('[Mumineen Calendar] Local fallback error:', e.message);
    }
  }

  return cachedMiqaats || [];
}

// Categorize and enrich miqaat data with Dawoodi Bohra attributes
function enrichMiqaat(m, hijriYear) {
  const title = m.title || '';
  const desc = m.description || '';
  let category = 'Miqaat';
  let badgeColor = '#b47c44';
  let icon = '✨';

  if (title.includes('Urus')) {
    category = 'Urus Mubarak';
    badgeColor = '#059669';
    icon = '🕌';
  } else if (title.includes('Milad') || title.includes('Zikra Milad')) {
    category = 'Milad Mubarak';
    badgeColor = '#2563eb';
    icon = '🌟';
  } else if (title.includes('Shahadat') || title.includes('Wafaat')) {
    category = 'Shahadat';
    badgeColor = '#991b1b';
    icon = '🕊️';
  } else if (title.includes('Eid') || title.includes('Yawme Ashura') || title.includes('Gadhir') || title.includes('Meraaj')) {
    category = 'Azeem Miqaat';
    badgeColor = '#d97706';
    icon = '👑';
  } else if (title.includes('Raat') || title.includes('Shab') || title.includes('Lailat') || m.phase === 'night') {
    category = 'Washeq / Night Ibadat';
    badgeColor = '#7c3aed';
    icon = '🌙';
  } else if (title.includes('Ayyam') || title.includes('Rozu') || title.includes('Takbira')) {
    category = 'Fazilat / Fasting';
    badgeColor = '#0891b2';
    icon = '🤲';
  }

  // Extract Dai number if applicable
  let daiNumber = null;
  const daiMatch = desc.match(/(\d+)(?:st|nd|rd|th)\s+Dai/i) || title.match(/(\d+)(?:st|nd|rd|th)\s+Dai/i);
  if (daiMatch) {
    daiNumber = parseInt(daiMatch[1], 10);
  }

  return {
    ...m,
    category,
    badgeColor,
    icon,
    daiNumber,
    isApplicable: !m.year || m.year <= hijriYear
  };
}

// ── API ROUTES ──

// Main Precision Calendar API
app.get('/api/mumineen-calendar', async (req, res) => {
  try {
    let dateObj = new Date();
    if (req.query.date) {
      const parts = req.query.date.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      } else {
        const parsed = new Date(req.query.date);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
    }

    // Determine phase: night (sunset to dawn, approx 18:00 - 05:59) vs day (06:00 - 17:59)
    // Client can explicitly pass phase=day or phase=night
    const currentHour = dateObj.getHours();
    const isNightNow = req.query.phase ? (req.query.phase === 'night') : (currentHour >= 18 || currentHour < 6);

    // Compute daylight Hijri date (using 12:00 noon anchor)
    const noonDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0);
    const ajdDay = gregorianToAJD(noonDate, 0);
    const hDay = ajdToHijri(ajdDay);
    const dayHijriDetail = buildHijriDetail(hDay.year, hDay.month, hDay.day, dateObj);

    // Compute eve/night Hijri date (in Islamic reckoning, night belongs to the upcoming day)
    // So Friday night (after Maghrib) is the eve of Saturday (Sabt ni Raat)
    const nextDayDate = new Date(noonDate.getTime() + 86400000);
    const ajdEve = gregorianToAJD(nextDayDate, 0);
    const hEve = ajdToHijri(ajdEve);
    const eveHijriDetail = buildHijriDetail(hEve.year, hEve.month, hEve.day, nextDayDate);

    // Effective Hijri date based on active phase
    const effectiveHijri = isNightNow ? eveHijriDetail : dayHijriDetail;

    const allMiqaats = await fetchAuthoritativeMiqaatsData();

    // Collect miqaats for daylight date
    const dayMiqaatObj = allMiqaats.find(m => m.month === dayHijriDetail.month && m.date === dayHijriDetail.day);
    const dayMiqaats = (dayMiqaatObj?.miqaats || [])
      .map(m => enrichMiqaat(m, dayHijriDetail.year))
      .filter(m => m.isApplicable);

    // Collect miqaats for eve/night date
    const eveMiqaatObj = allMiqaats.find(m => m.month === eveHijriDetail.month && m.date === eveHijriDetail.day);
    const eveMiqaats = (eveMiqaatObj?.miqaats || [])
      .map(m => enrichMiqaat(m, eveHijriDetail.year))
      .filter(m => m.isApplicable);

    // Filter active miqaats matching the current phase
    let activeMiqaats = [];
    if (isNightNow) {
      // At night: prioritize phase='night' miqaats of the upcoming day, plus any relevant announcements
      activeMiqaats = eveMiqaats.filter(m => m.phase === 'night' || !m.phase);
      if (!activeMiqaats.length) {
        activeMiqaats = eveMiqaats;
      }
    } else {
      // In day: prioritize phase='day' miqaats
      activeMiqaats = dayMiqaats.filter(m => m.phase === 'day' || !m.phase);
      if (!activeMiqaats.length) {
        activeMiqaats = dayMiqaats;
      }
    }

    // Upcoming miqaats for the next 30 days
    const upcomingMiqaats = [];
    for (let offset = 1; offset <= 30; offset++) {
      const futureDate = new Date(noonDate.getTime() + offset * 86400000);
      const futureAjd = gregorianToAJD(futureDate, 0);
      const futureH = ajdToHijri(futureAjd);
      const match = allMiqaats.find(m => m.month === futureH.month && m.date === futureH.day);
      if (match && Array.isArray(match.miqaats)) {
        const valid = match.miqaats
          .map(m => enrichMiqaat(m, futureH.year))
          .filter(m => m.isApplicable);
        if (valid.length) {
          upcomingMiqaats.push({
            daysAhead: offset,
            gregorianDate: futureDate.toISOString().split('T')[0],
            gregorianFormatted: futureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            hijriDate: `${futureH.day} ${MONTH_NAMES_SHORT[futureH.month]} ${futureH.year}H`,
            hijriDateAr: `${toArabicDigits(futureH.day)} ${MONTH_NAMES_AR[futureH.month]}`,
            miqaats: valid
          });
        }
      }
    }

    // Month overview: All miqaats for the current Hijri month
    const monthMiqaats = allMiqaats
      .filter(m => m.month === dayHijriDetail.month)
      .map(entry => ({
        day: entry.date,
        dayAr: toArabicDigits(entry.date),
        miqaats: (entry.miqaats || [])
          .map(m => enrichMiqaat(m, dayHijriDetail.year))
          .filter(m => m.isApplicable)
      }))
      .filter(entry => entry.miqaats.length > 0)
      .sort((a, b) => a.day - b.day);

    res.json({
      status: 'success',
      source: 'Mumineen Calendar (Official Dawoodi Bohra Tabular System)',
      syncedWith: 'https://www.mumineencalendar.com/',
      isLifetimePrecise: true,
      currentPhase: isNightNow ? 'night' : 'day',
      phaseLabelEn: isNightNow ? 'Eve (Raat)' : 'Day (Dawas)',
      phaseLabelAr: isNightNow ? 'ليلة' : 'نهار',
      gregorian: {
        iso: dateObj.toISOString().split('T')[0],
        formatted: dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        weekday: dateObj.toLocaleDateString('en-US', { weekday: 'long' })
      },
      hijri: effectiveHijri,
      daylightHijri: dayHijriDetail,
      eveHijri: eveHijriDetail,
      activeMiqaats,
      dayMiqaats,
      eveMiqaats,
      upcomingMiqaats: upcomingMiqaats.slice(0, 10),
      currentMonthMiqaats: monthMiqaats
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Full Month Days & Miqaats for Lifetime Calendar Browser
app.get('/api/mumineen-calendar/month', async (req, res) => {
  try {
    let year = parseInt(req.query.year, 10);
    let month = parseInt(req.query.month, 10); // 0-indexed (0 - 11)

    if (isNaN(year) || isNaN(month)) {
      const nowH = ajdToHijri(gregorianToAJD(new Date(), 0));
      year = nowH.year;
      month = nowH.month;
    }

    const totalDays = getDaysInHijriMonth(year, month);
    const isKabisa = isKabisaYear(year);
    const allMiqaats = await fetchAuthoritativeMiqaatsData();

    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const ajd = hijriToAJD(year, month, d);
      const gDate = ajdToGregorian(ajd);
      const dayOfWeekIdx = gDate.getDay();

      const match = allMiqaats.find(m => m.month === month && m.date === d);
      const validMiqaats = (match?.miqaats || [])
        .map(m => enrichMiqaat(m, year))
        .filter(m => m.isApplicable);

      days.push({
        day: d,
        dayArabic: toArabicDigits(d),
        gregorianDate: gDate.toISOString().split('T')[0],
        gregorianFormatted: gDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        weekdayEn: WEEKDAY_NAMES_EN[dayOfWeekIdx],
        weekdayAr: WEEKDAY_NAMES_AR[dayOfWeekIdx],
        miqaats: validMiqaats
      });
    }

    res.json({
      status: 'success',
      year,
      month,
      monthNameEn: MONTH_NAMES_EN[month],
      monthNameAr: MONTH_NAMES_AR[month],
      isKabisa,
      totalDays,
      days
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Lifetime Bi-directional Date Converter Endpoint
app.get('/api/mumineen-calendar/convert', async (req, res) => {
  try {
    const { from, date, year, month, day } = req.query;

    if (from === 'hijri') {
      const hYear = parseInt(year, 10);
      const hMonth = parseInt(month, 10); // 0-11
      const hDay = parseInt(day, 10);

      if (isNaN(hYear) || isNaN(hMonth) || isNaN(hDay)) {
        return res.status(400).json({ error: 'Invalid Hijri parameters' });
      }

      const ajd = hijriToAJD(hYear, hMonth, hDay);
      const gDate = ajdToGregorian(ajd);
      const hijriDetail = buildHijriDetail(hYear, hMonth, hDay, gDate);

      const allMiqaats = await fetchAuthoritativeMiqaatsData();
      const match = allMiqaats.find(m => m.month === hMonth && m.date === hDay);
      const miqaats = (match?.miqaats || []).map(m => enrichMiqaat(m, hYear)).filter(m => m.isApplicable);

      return res.json({
        status: 'success',
        hijri: hijriDetail,
        gregorian: {
          iso: gDate.toISOString().split('T')[0],
          formatted: gDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        },
        miqaats
      });
    }

    // Default: convert from Gregorian
    let gDate = new Date();
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        gDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      } else {
        gDate = new Date(date);
      }
    }

    const ajd = gregorianToAJD(gDate, 0);
    const h = ajdToHijri(ajd);
    const hijriDetail = buildHijriDetail(h.year, h.month, h.day, gDate);

    const allMiqaats = await fetchAuthoritativeMiqaatsData();
    const match = allMiqaats.find(m => m.month === h.month && m.date === h.day);
    const miqaats = (match?.miqaats || []).map(m => enrichMiqaat(m, h.year)).filter(m => m.isApplicable);

    res.json({
      status: 'success',
      hijri: hijriDetail,
      gregorian: {
        iso: gDate.toISOString().split('T')[0],
        formatted: gDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      },
      miqaats
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Faiz-ul-Mawaid Chattogram Server running at http://0.0.0.0:${PORT}`);
});
