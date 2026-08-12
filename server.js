import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

// ── MUMINEEN CALENDAR INTEGRATION ──
const KABISA_YEARS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];
const MONTH_DAYS_ACCUM = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];
const YEAR_DAYS_ACCUM = [354, 708, 1063, 1417, 1771, 2126, 2480, 2834, 3189, 3543, 3898, 4252, 4606, 4961, 5315, 5669, 6024, 6378, 6732, 7087, 7441, 7796, 8150, 8504, 8859, 9213, 9567, 9922, 10276, 10631];

const MONTH_NAMES_EN = [
  "Moharram al-Haraam", "Safar al-Muzaffar", "Rabi al-Awwal", "Rabi al-Aakhar",
  "Jumada al-Ula", "Jumada al-Ukhra", "Rajab al-Asab", "Shabaan al-Karim",
  "Ramadaan al-Moazzam", "Shawwal al-Mukarram", "Zilqadah al-Haraam", "Zilhaj al-Haraam"
];

const MONTH_NAMES_AR = [
  "محرم الحرام", "صفر المظفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الأخرى", "رجب الأصب", "شعبان الكريم",
  "رمضان المعظم", "شوال المكرم", "ذو القعدة الحرام", "ذو الحجة الحرام"
];

function toArabicDigits(num) {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/\d/g, d => arabicDigits[parseInt(d)]);
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

function gregorianToAJD(date) {
  let r = date.getFullYear();
  let a = date.getMonth() + 1;
  const i = date.getDate() + date.getHours() / 24 + date.getMinutes() / 1440 + date.getSeconds() / 86400;
  if (a < 3) { r--; a += 12; }
  let n = 0;
  if (!isJulian(date)) {
    const t = Math.floor(r / 100);
    n = 2 - t + Math.floor(t / 4);
  }
  return Math.floor(365.25 * (r + 4716)) + Math.floor(30.6001 * (a + 1)) + i + n - 1524.5;
}

function hijriFromAJD(ajd) {
  let s = 0;
  let c = Math.floor(ajd - 1948083.5);
  const u = Math.floor(c / 10631);
  c -= 10631 * u;
  while (c > YEAR_DAYS_ACCUM[s]) s++;
  const year = Math.round(30 * u + s);
  if (s > 0) c -= YEAR_DAYS_ACCUM[s - 1];
  s = 0;
  while (c > MONTH_DAYS_ACCUM[s]) s++;
  const month = Math.round(s);
  const day = s > 0 ? Math.round(c - MONTH_DAYS_ACCUM[s - 1]) : Math.round(c);
  return { year, month, day };
}

function getMumineenHijriDate(date) {
  const ajd = gregorianToAJD(date);
  const h = hijriFromAJD(ajd);
  return {
    day: h.day,
    month: h.month, // 0-indexed
    year: h.year,
    monthNameEn: MONTH_NAMES_EN[h.month] || "Unknown",
    monthNameAr: MONTH_NAMES_AR[h.month] || "",
    formattedEn: `${h.day} ${MONTH_NAMES_EN[h.month]} ${h.year} H`,
    formattedAr: `${toArabicDigits(h.day)} ${MONTH_NAMES_AR[h.month]} ${toArabicDigits(h.year)} هـ`,
    dayArabicDigits: toArabicDigits(h.day),
    yearArabicDigits: toArabicDigits(h.year)
  };
}

let cachedMiqaats = null;
let lastCacheTime = 0;

async function fetchMiqaatsData() {
  const NOW = Date.now();
  if (cachedMiqaats && (NOW - lastCacheTime) < 86400000) { // 24 hours cache
    return cachedMiqaats;
  }
  try {
    const resp = await fetch('https://www.mumineencalendar.com/data/miqaats.json', { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        cachedMiqaats = data;
        lastCacheTime = NOW;
        return data;
      }
    }
  } catch (err) {
    console.error('Error connecting to mumineencalendar.com:', err.message);
  }
  return cachedMiqaats || [];
}

app.get('/api/mumineen-calendar', async (req, res) => {
  try {
    let dateObj = new Date();
    if (req.query.date) {
      const parsed = new Date(req.query.date);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }

    const hijriInfo = getMumineenHijriDate(dateObj);
    const allMiqaats = await fetchMiqaatsData();

    // Find matching miqaat for this Hijri month & day
    let miqaatsForDay = [];
    if (allMiqaats && allMiqaats.length) {
      const monthObj = allMiqaats.find(m => m.month === hijriInfo.month && m.date === hijriInfo.day);
      if (monthObj && Array.isArray(monthObj.miqaats)) {
        miqaatsForDay = monthObj.miqaats.filter(m => !m.year || m.year <= hijriInfo.year);
      }
    }

    res.json({
      status: 'success',
      syncedWith: 'https://www.mumineencalendar.com/',
      englishDate: dateObj.toISOString().split('T')[0],
      englishDateFormatted: dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      hijri: hijriInfo,
      miqaats: miqaatsForDay
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
