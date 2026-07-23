import { get as httpGet } from "http";
import { get as httpsGet } from "https";
import fs from "fs";
import moment from "moment-timezone";
import zlib from "zlib";

const LOG_FILE = "./stream_log.log";
const DEVELOPER_ID = "212710643242";
const MAX_GROUPS_DISPLAY = 30;
const CONCURRENCY = 5;
const RESOLVE_TIMEOUT = 15000;
const BATCH_SIZE = 50;
const MAX_MEMORY_CHANNELS = 10000; // زيادة الحد الأقصى
const STREAM_CONCURRENCY = 3;

const extractedChannels = new Map();
const cookieJar = new Map();

// ─── User-Agents ───
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'VLC/3.0.20 LibVLC/3.0.20',
  'IPTVSmartersPro/3.1.5 (Linux; Android 10)',
  'TiviMate/4.7.0 (Android TV)',
  'Kodi/20.2 (Windows; Windows NT 10.0; Win64; x64)',
  // User-Agents إضافية لتعزيز التخفي وتجاوز الحماية
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Dalvik/2.1.0 (Linux; U; Android 10; SM-G973F Build/QP1A.190711.020)',
  'AppleCoreMedia/1.0.0.20K69 (iPhone; U; CPU OS 16_6_1 like Mac OS X)',
  'okhttp/4.9.0',
  'ExoPlayer/2.11.7 (Linux; Android 9) ExoPlayerLib/2.11.7',
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
];

const IPTV_USER_AGENTS = [
  'IPTVSmartersPro/3.1.5 (Linux; Android 10)',
  'VLC/3.0.20 LibVLC/3.0.20',
  'TiviMate/4.7.0 (Android TV)',
  'Kodi/20.2 (Windows; Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  // User-Agents إضافية خاصة بـ IPTV
  'OTTPlayer/2.0 (Linux; Android 7.1.2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Mobile Safari/537.36',
  'SmartIPTV/2.0 (SmartTV; Tizen 4.0)',
  'GSE SMART IPTV/5.0 (iOS; iPhone) ',
  'Perfect Player/1.5 (Android 8.1.0)',
  'SS IPTV/1.0 (WebOS; LG Smart TV)',
];

function logToFile(level, message, sessionId = 'extract') {
  const timestamp = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${sessionId}] ${message}\n`;
  try { fs.appendFileSync(LOG_FILE, logMessage); } catch (_) {}
}
function logInfo(msg, sid) { logToFile('info', msg, sid); }
function logError(msg, sid) { logToFile('error', msg, sid); }

function fixBrokenUrl(url) {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    let fixed = false;
    for (const [key, value] of params) {
      if (key.toLowerCase().startsWith('password') && key !== 'password' && value === '') {
        const match = key.match(/^password(.+)$/);
        if (match && match[1]) {
          params.delete(key);
          params.set('password', match[1]);
          fixed = true;
        }
      }
    }
    if (fixed) {
      const newUrl = parsed.origin + parsed.pathname + '?' + params.toString();
      return newUrl;
    }
    return url;
  } catch (_) {
    return url;
  }
}

function getAdvancedHeaders(url, extra = {}, userAgentIndex = 0) {
  const ua = USER_AGENTS[userAgentIndex % USER_AGENTS.length];
  const base = {
    'User-Agent': ua,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br', // إضافة brotli
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest', // لتجاوز بعض الحمايات التي تتوقع طلبات AJAX
  };
  if (url) {
    try {
      const u = new URL(url);
      base['Referer'] = u.origin; // تعيين Referer ديناميكيًا
      base['Origin'] = u.origin;
      base['Host'] = u.host;
    } catch (_) {}
  }
  return { ...base, ...extra };
}

function getIPTVHeaders(url, sessionId, userAgentIndex = 0) {
  const ua = IPTV_USER_AGENTS[userAgentIndex % IPTV_USER_AGENTS.length];
  const base = {
    'User-Agent': ua,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'X-Requested-With': 'com.android.chrome', // لمحاكاة طلب من تطبيق أندرويد
  };
  
  if (url) {
    try {
      const u = new URL(url);
      base['Referer'] = u.origin;
      base['Origin'] = u.origin;
      base['Host'] = u.host;
    } catch (_) {}
  }
  
  if (url) {
    try {
      const u = new URL(url);
      const domain = u.hostname;
      const cookieKey = `${domain}_${sessionId}`;
      if (cookieJar.has(cookieKey)) {
        base['Cookie'] = cookieJar.get(cookieKey);
      }
    } catch (_) {}
  }
  
  return base;
}

async function decompressData(data, encoding) {
  return new Promise((resolve, reject) => {
    if (!encoding || (!encoding.includes('gzip') && !encoding.includes('deflate') && !encoding.includes('br'))) {
      return resolve(data);
    }
    const buffer = Buffer.from(data, 'binary');
    if (encoding.includes('gzip')) {
      zlib.gunzip(buffer, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    } else if (encoding.includes('deflate')) {
      zlib.inflate(buffer, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    } else if (encoding.includes('br')) { // دعم فك ضغط Brotli
      zlib.brotliDecompress(buffer, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    } else {
      resolve(data);
    }
  });
}

function fetchUrl(url, sessionId = 'extract', retries = 5, customHeaders = {}, fetchBody = true) {
  return new Promise((resolve) => {
    let attempts = 0;
    let timeoutId = null;
    let req = null;

    const doFetch = () => {
      attempts++;
      const currentUaIndex = (attempts - 1) % USER_AGENTS.length;
      
      const headers = getAdvancedHeaders(url, customHeaders, currentUaIndex);
      const getter = url.startsWith('https') ? httpsGet : httpGet;
      const options = { headers, timeout: 30000 };

      req = getter(url, options, (res) => {
        if ([301, 302, 307, 308, 303].includes(res.statusCode) && res.headers['location']) {
          clearTimeout(timeoutId);
          res.destroy(); // تدمير الطلب الحالي قبل إعادة التوجيه
          url = res.headers['location'];
          logInfo(`إعادة توجيه إلى: ${url}`, sessionId);
          return doFetch();
        }

        if (res.statusCode >= 400) { // التعامل مع أخطاء العميل والخادم
          clearTimeout(timeoutId);
          res.destroy();
          if (attempts <= retries) {
            logInfo(`فشل HTTP ${res.statusCode}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
            setTimeout(doFetch, 2000 * attempts);
          } else {
            resolve({ ok: false, error: `HTTP ${res.statusCode}` });
          }
          return;
        }

        if (!fetchBody) {
          clearTimeout(timeoutId);
          res.destroy();
          resolve({ ok: true, data: '', status: res.statusCode, finalUrl: url });
          return;
        }

        const chunks = [];
        res.on('data', chunk => {
          chunks.push(chunk);
          const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
          if (totalSize > 100 * 1024 * 1024) { // 100MB حد
            res.destroy();
            clearTimeout(timeoutId);
            resolve({ ok: false, error: 'حجم البيانات كبير جداً' });
          }
        });

        res.on('end', async () => {
          clearTimeout(timeoutId);
          let data = Buffer.concat(chunks);
          
          const encoding = res.headers['content-encoding'];
          if (encoding) {
            try { data = await decompressData(data, encoding); } catch (e) {
              logError(`فشل فك الضغط: ${e.message}`, sessionId);
              data = data.toString('utf8'); // العودة إلى utf8 إذا فشل فك الضغط
            }
          } else {
            data = data.toString('utf8');
          }
          if (data.startsWith('\uFEFF')) data = data.slice(1);
          
          resolve({ ok: true, data, status: res.statusCode, headers: res.headers, finalUrl: url });
        });

        res.on('error', (err) => {
          clearTimeout(timeoutId);
          if (attempts <= retries) {
            logError(`خطأ في الاستجابة: ${err.message}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
            setTimeout(doFetch, 2000 * attempts);
          } else {
            resolve({ ok: false, error: err.message });
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeoutId);
        if (attempts <= retries) {
          logError(`خطأ في الطلب: ${err.message}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 2000 * attempts);
        } else {
          resolve({ ok: false, error: err.message });
        }
      });

      req.on('timeout', () => {
        clearTimeout(timeoutId);
        req.destroy();
        if (attempts <= retries) {
          logInfo(`انتهت المهلة، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 3000 * attempts);
        } else {
          resolve({ ok: false, error: 'timeout' });
        }
      });

      timeoutId = setTimeout(() => {
        if (req) req.destroy();
        if (attempts <= retries) {
          logInfo(`انتهت المهلة (عام)، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 3000 * attempts);
        } else {
          resolve({ ok: false, error: 'timeout' });
        }
      }, 35000);
    };

    doFetch();
  });
}

function fetchWithIPTVHeaders(url, sessionId = 'extract', retries = 5, fetchBody = true) {
  return new Promise((resolve) => {
    let attempts = 0;
    let timeoutId = null;
    let req = null;

    const doFetch = () => {
      attempts++;
      const currentUaIndex = (attempts - 1) % IPTV_USER_AGENTS.length;
      
      const headers = getIPTVHeaders(url, sessionId, currentUaIndex);
      const getter = url.startsWith('https') ? httpsGet : httpGet;
      const options = { headers, timeout: 30000 };

      req = getter(url, options, (res) => {
        if ([301, 302, 307, 308, 303].includes(res.statusCode) && res.headers['location']) {
          clearTimeout(timeoutId);
          res.destroy();
          url = res.headers['location'];
          logInfo(`IPTV إعادة توجيه إلى: ${url}`, sessionId);
          return doFetch();
        }

        if (res.statusCode >= 400) {
          clearTimeout(timeoutId);
          res.destroy();
          if (attempts <= retries) {
            logInfo(`IPTV فشل HTTP ${res.statusCode}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
            setTimeout(doFetch, 2000 * attempts);
          } else {
            resolve({ ok: false, error: `HTTP ${res.statusCode}` });
          }
          return;
        }

        if (!fetchBody) {
          clearTimeout(timeoutId);
          res.destroy();
          resolve({ ok: true, data: '', status: res.statusCode, finalUrl: url });
          return;
        }

        const chunks = [];
        res.on('data', chunk => {
          chunks.push(chunk);
          const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
          if (totalSize > 100 * 1024 * 1024) {
            res.destroy();
            clearTimeout(timeoutId);
            resolve({ ok: false, error: 'حجم البيانات كبير جداً' });
          }
        });

        res.on('end', async () => {
          clearTimeout(timeoutId);
          let data = Buffer.concat(chunks);
          
          const encoding = res.headers['content-encoding'];
          if (encoding) {
            try { data = await decompressData(data, encoding); } catch (e) {
              logError(`IPTV فشل فك الضغط: ${e.message}`, sessionId);
              data = data.toString('utf8');
            }
          } else {
            data = data.toString('utf8');
          }
          if (data.startsWith('\uFEFF')) data = data.slice(1);
          
          resolve({ ok: true, data, status: res.statusCode, headers: res.headers, finalUrl: url });
        });

        res.on('error', (err) => {
          clearTimeout(timeoutId);
          if (attempts <= retries) {
            logError(`IPTV خطأ في الاستجابة: ${err.message}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
            setTimeout(doFetch, 2000 * attempts);
          } else {
            resolve({ ok: false, error: err.message });
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timeoutId);
        if (attempts <= retries) {
          logError(`IPTV خطأ في الطلب: ${err.message}، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 2000 * attempts);
        } else {
          resolve({ ok: false, error: err.message });
        }
      });

      req.on('timeout', () => {
        clearTimeout(timeoutId);
        req.destroy();
        if (attempts <= retries) {
          logInfo(`IPTV انتهت المهلة، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 3000 * attempts);
        } else {
          resolve({ ok: false, error: 'timeout' });
        }
      });

      timeoutId = setTimeout(() => {
        if (req) req.destroy();
        if (attempts <= retries) {
          logInfo(`IPTV انتهت المهلة (عام)، إعادة المحاولة ${attempts}/${retries}`, sessionId);
          setTimeout(doFetch, 3000 * attempts);
        } else {
          resolve({ ok: false, error: 'timeout' });
        }
      }, 35000);
    };

    doFetch();
  });
}

async function followRedirects(url, sessionId = 'extract', maxRedirects = 5) {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    try {
      const result = await Promise.race([
        fetchUrl(currentUrl, sessionId, 1, {}, false),
        new Promise((_, reject) => setTimeout(() => reject(new Error('مهلة')), RESOLVE_TIMEOUT))
      ]);
      if (result.ok && result.finalUrl && result.finalUrl !== currentUrl) {
        currentUrl = result.finalUrl;
        logInfo(`تمت متابعة إعادة التوجيه إلى: ${currentUrl}`, sessionId);
      } else {
        return currentUrl; // لا يوجد إعادة توجيه آخر أو فشل
      }
    } catch (e) {
      logError(`خطأ في متابعة إعادة التوجيه: ${e.message}`, sessionId);
      return currentUrl; // العودة إلى آخر URL معروف عند الخطأ
    }
  }
  logInfo(`تجاوز الحد الأقصى لإعادة التوجيه (${maxRedirects})، العودة إلى: ${currentUrl}`, sessionId);
  return currentUrl;
}

function parseM3U(content, baseUrl = '') {
  content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const channels = [];
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentInfo = null;
  let index = 1;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,([^,]+)$/);
      const groupMatch = line.match(/group-title=["']([^"']*)["']/i);
      const logoMatch = line.match(/tvg-logo=["']([^"']*)["']/i);
      const epgMatch = line.match(/tvg-id=["']([^"']*)["']/i);

      currentInfo = {
        name: nameMatch ? nameMatch[1].trim() : `قناة ${index}`,
        group: groupMatch ? groupMatch[1].trim() : 'عام',
        logo: logoMatch ? logoMatch[1] : '',
        epgId: epgMatch ? epgMatch[1] : '',
      };
    } else if (!line.startsWith('#') && (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp'))) {
      let url = line.trim().split(' ')[0];
      
      if (!url.startsWith('http') && !url.startsWith('rtmp') && !url.startsWith('rtsp')) {
        if (baseUrl && url.startsWith('/')) {
          try { url = new URL(baseUrl).origin + url; } catch (_) {}
        } else if (baseUrl) {
          try { url = new URL(url, baseUrl).href; } catch (_) {}
        }
      }
      
      if (currentInfo) {
        channels.push({
          index: index++,
          name: currentInfo.name,
          group: currentInfo.group,
          url: url,
          logo: currentInfo.logo,
          epgId: currentInfo.epgId,
        });
        currentInfo = null;
      } else {
        channels.push({
          index: index++,
          name: `قناة ${index}`,
          group: 'عام',
          url: url
        });
      }
      
      if (channels.length >= MAX_MEMORY_CHANNELS) break;
    }
  }
  return channels;
}

function extractCredentialsFromUrl(url) {
  const baseMatch = url.match(/^(https?:\/\/[^\/?]+)/);
  if (!baseMatch) return null;
  const baseUrl = baseMatch[1];

  let username = null, password = null;

  const userMatch = url.match(/[?&]username=([^&]+)/);
  if (userMatch) username = decodeURIComponent(userMatch[1]);

  const passMatch = url.match(/[?&]password=([^&]+)/);
  if (passMatch) password = decodeURIComponent(passMatch[1]);

  if (!password) {
    const passMatch2 = url.match(/[?&](password\d*[^=&]+)(?:&|$)/);
    if (passMatch2) {
      const key = passMatch2[1];
      if (key.startsWith('password')) {
        const val = url.match(new RegExp(`[?&]${key}=([^&]+)`));
        if (val) password = decodeURIComponent(val[1]);
      }
    }
  }

  if (username && password) {
    return { baseUrl, username, password };
  }
  return null;
}

async function fetchXtreamChannels(baseUrl, username, password, sessionId) {
  const apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
  logInfo(`محاولة استخراج Xtream API من: ${apiUrl}`, sessionId);
  const result = await fetchUrl(apiUrl, sessionId, 3);
  if (result.ok) {
    try {
      const json = JSON.parse(result.data);
      if (json && Array.isArray(json.live_streams)) {
        logInfo(`تم استخراج ${json.live_streams.length} قناة من Xtream API`, sessionId);
        return {
          ok: true,
          channels: json.live_streams.map((ch, idx) => ({
            index: idx + 1,
            name: ch.name || ch.title || `قناة ${idx + 1}`,
            group: ch.category_name || ch.category_id || 'عام',
            url: `${baseUrl}/live/${username}/${password}/${ch.stream_id}.ts`, // بناء رابط مباشر
            streamId: ch.stream_id,
            epgId: ch.epg_channel_id || ''
          })),
          type: 'xtream_api'
        };
      }
    } catch (_) {}

    if (result.data.includes('#EXTM3U')) {
      const channels = parseM3U(result.data, baseUrl);
      if (channels.length > 0) return { ok: true, channels, type: 'xtream_m3u' };
    }
  }
  return { ok: false, error: 'فشل Xtream API' };
}

async function extractChannels(url, sessionId) {
  url = fixBrokenUrl(url);
  
  // محاولة استخراج بيانات Xtream API أولاً إذا كان الرابط يشير إلى ذلك
  const creds = extractCredentialsFromUrl(url);
  if (creds) {
    const apiResult = await fetchXtreamChannels(creds.baseUrl, creds.username, creds.password, sessionId);
    if (apiResult.ok) return apiResult;
  }

  // محاولة الاستخراج باستخدام IPTV Headers للروابط التي تبدو كـ IPTV
  const isIPTVLike = url.includes('get.php') || url.includes('player_api.php') || 
                     url.includes('xmltv.php') || (url.includes('live') && url.includes('.ts')) ||
                     url.includes('m3u8') || url.includes('playlist.m3u');

  if (isIPTVLike) {
    logInfo(`محاولة استخراج IPTV Headers من: ${url}`, sessionId);
    const result = await fetchWithIPTVHeaders(url, sessionId, 5); // زيادة عدد المحاولات
    if (result.ok) {
      const content = result.data;
      const baseUrl = url.match(/^(https?:\/\/[^\/]+)/)?.[1] || '';
      
      if (content.includes('#EXTM3U')) {
        const channels = parseM3U(content, baseUrl);
        if (channels.length > 0) {
          logInfo(`[IPTV] استخراج ${channels.length} قناة من M3U`, sessionId);
          return { ok: true, channels, type: 'm3u_iptv' };
        }
      }
      
      try {
        const json = JSON.parse(content);
        let channels = json.live_streams || json.channels || (Array.isArray(json) ? json : []);
        if (channels.length > 0) {
          logInfo(`[IPTV] استخراج ${channels.length} قناة من JSON`, sessionId);
          return {
            ok: true,
            channels: channels.map((ch, idx) => ({
              index: idx + 1,
              name: ch.name || ch.title || `قناة ${idx + 1}`,
              group: ch.category_name || ch.group || 'عام',
              url: ch.url || ch.stream_url || `${baseUrl}/live/${extractCredentialsFromUrl(url)?.username}/${extractCredentialsFromUrl(url)?.password}/${ch.stream_id || idx}.ts`, // محاولة بناء رابط مباشر
              streamId: ch.stream_id || ch.id || idx,
              epgId: ch.epg_channel_id || ''
            })),
            type: 'json_iptv'
          };
        }
      } catch (_) {
        logInfo(`[IPTV] فشل تحليل JSON، محاولة كـ M3U`, sessionId);
      }
    }
  }

  // محاولة الاستخراج العام
  logInfo(`محاولة استخراج عام من: ${url}`, sessionId);
  const result = await fetchUrl(url, sessionId, 5); // زيادة عدد المحاولات
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const content = result.data;
  const baseUrl = url.match(/^(https?:\/\/[^\/]+)/)?.[1] || '';

  if (content.includes('#EXTM3U')) {
    const channels = parseM3U(content, baseUrl);
    if (channels.length > 0) {
      logInfo(`استخراج ${channels.length} قناة من M3U`, sessionId);
      return { ok: true, channels, type: 'm3u' };
    }
  }

  try {
    const json = JSON.parse(content);
    let channels = json.live_streams || json.channels || json.data || (Array.isArray(json) ? json : []);
    if (channels.length > 0) {
      logInfo(`استخراج ${channels.length} قناة من JSON`, sessionId);
      return {
        ok: true,
        channels: channels.map((ch, idx) => ({
          index: idx + 1,
          name: ch.name || ch.title || `قناة ${idx + 1}`,
          group: ch.category_name || ch.group || 'عام',
          url: ch.url || ch.stream_url || '',
          streamId: ch.stream_id || ch.id || idx,
          epgId: ch.epg_channel_id || ''
        })),
        type: 'json'
      };
    }
  } catch (_) {
    logInfo(`فشل تحليل JSON في الاستخراج العام`, sessionId);
  }

  return { ok: false, error: 'لم نتمكن من استخراج قنوات' };
}

// ✨ دالة تحويل جميع القنوات على دفعات
async function resolveAllChannels(channels, sessionId, onProgress) {
  const total = channels.length;
  const resolved = [];
  let processed = 0;
  const startTime = Date.now();

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, Math.min(i + BATCH_SIZE, channels.length));
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / BATCH_SIZE);

    // معالجة متوازية داخل الدفعة
    for (let j = 0; j < batch.length; j += CONCURRENCY) {
      const concurrentBatch = batch.slice(j, j + CONCURRENCY);
      const promises = concurrentBatch.map(async (ch) => {
        try {
          const directUrl = await followRedirects(ch.url, sessionId); // استخدام followRedirects المحسّن
          processed++;
          return { ...ch, url: directUrl };
        } catch (e) {
          processed++;
          logError(`فشل حل URL للقناة ${ch.name}: ${e.message}`, sessionId);
          return { ...ch, url: ch.url };
        }
      });
      
      const results = await Promise.all(promises);
      resolved.push(...results);
      
      // تحديث التقدم
      if (onProgress && (processed % 10 === 0 || processed === total)) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = Math.round(processed / elapsed);
        const eta = Math.round((total - processed) / speed);
        onProgress({
          processed,
          total,
          percent: Math.round((processed / total) * 100),
          speed,
          eta,
          batch: batchNumber,
          totalBatches
        });
      }
    }

    logInfo(`الدفعة ${batchNumber}/${totalBatches}: ${resolved.length}/${total}`, sessionId);
    
    // تنظيف الذاكرة
    if (global.gc) global.gc();
  }

  return resolved;
}

// ─── دوال التنسيق ───
function formatAllGroups(channels) {
  const groups = {};
  for (const ch of channels) {
    const g = ch.group || 'عام';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  
  let msg = `📋 *جميع الحزم (${groupNames.length} حزمة)*\n📺 ${channels.length} قناة\n\n`;
  groupNames.forEach((name, i) => {
    msg += `${i + 1}. ${name} (${groups[name].length})\n`;
  });
  msg += `\n💡 .fbex gp [الرقم أو الاسم]`;
  return msg;
}

function formatGroupList(channels) {
  const groups = {};
  for (const ch of channels) {
    const g = ch.group || 'عام';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  let msg = `*✅ ${channels.length} قناة | ${groupNames.length} حزمة*\n\n`;
  
  groupNames.slice(0, MAX_GROUPS_DISPLAY).forEach((name, i) => {
    msg += `*${i + 1}.* ${name} (${groups[name].length})\n`;
  });

  if (groupNames.length > MAX_GROUPS_DISPLAY) {
    msg += `\n*...و ${groupNames.length - MAX_GROUPS_DISPLAY} حزمة أخرى*\n`;
  }

  msg += `\n*.fbex gp [رقم/اسم]* - عرض قنوات حزمة`;
  msg += `\n*.fbex save [رقم/اسم/أرقام قنوات]* - حفظ حزمة أو قنوات محددة`;
  msg += `\n*.fbex search [اسم]* - بحث`;
  msg += `\n*.fbex group all* - كل الحزم`;
  return msg;
}

function getSortedGroups(channels) {
  const groups = {};
  for (const ch of channels) {
    const g = ch.group || 'عام';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }
  return { groups, groupNames: Object.keys(groups).sort((a, b) => a.localeCompare(b)) };
}

function formatGroupChannels(channels, groupName, page = 1, pageSize = 20) {
  const groupChannels = channels.filter(ch => ch.group === groupName);
  const total = groupChannels.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const pageChannels = groupChannels.slice(start, start + pageSize);

  let msg = `📺 ${groupName} (${total})\n📄 ${page}/${totalPages}\n─────────────────\n\n`;
  pageChannels.forEach(ch => msg += `${ch.index}. ${ch.name}\n`);
  
  msg += `─────────────────\n`;
  if (totalPages > 1) msg += `📌 التالي: .fbex gp "${groupName}" page ${page + 1}\n`;
  msg += `📌 بحث: .fbex search اسم_القناة`;
  return msg;
}

function searchChannels(channels, query) {
  const q = query.toLowerCase().trim();
  return channels.filter(ch => ch.name.toLowerCase().includes(q) || (ch.group && ch.group.toLowerCase().includes(q)));
}

// ─── Handler ───
const handler = async (m, { conn, text, command, isOwner }) => {
  const jid = m.chat;

  if (!text) {
    return conn.sendMessage(jid, {
      text: `📌 *أوامر FBEX*\n\n` +
        `🔍 *.fbex <رابط>* - استخراج قنوات\n` +
        `📋 *.fbex group all* - كل الحزم\n` +
        `📺 *.fbex gp <رقم/اسم>* - قنوات حزمة\n` +
        `💾 *.fbex save <رقم/اسم/أرقام قنوات>* - حفظ حزمة أو قنوات محددة\n` +
        `🔎 *.fbex search <اسم>* - بحث\n` +
        `🔎 *.fbex search <اسم> all* - بحث كامل\n` +
        `▶️ *.fbex play FB-KEY <اسم>* - تشغيل\n` +
        `🗑️ *.fbex clear* - مسح\n\n` +
        `💡 *مثال:*\n.fbex http://example.com/get.php?...`
    });
  }

  const args = text.trim().split(/\s+/);
  const subCommand = args[0].toLowerCase();

  // ── group all ──
  if ((subCommand === 'group' || subCommand === 'gp') && args[1]?.toLowerCase() === 'all') {
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات. استخدم .fbex <رابط>` });
    return conn.sendMessage(jid, { text: formatAllGroups(saved.channels) });
  }

  // ── gp ──
  if (subCommand === 'gp' || subCommand === 'group') {
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات. استخدم .fbex <رابط>` });
    if (args.length < 2) return conn.sendMessage(jid, { text: `📌 .fbex gp <رقم/اسم> أو .fbex group all` });

    const { groups, groupNames } = getSortedGroups(saved.channels);
    const arg = args[1];

    let targetGroup = null;
    if (!isNaN(arg) && Number(arg) > 0) {
      const idx = Number(arg) - 1;
      if (idx < groupNames.length) targetGroup = groupNames[idx];
    } else {
      const matched = groupNames.filter(g => g.toLowerCase().includes(arg.toLowerCase()));
      if (matched.length === 1) targetGroup = matched[0];
      else if (matched.length > 1) {
        let msg = `⚠️ عدة حزم:\n`;
        matched.slice(0, 10).forEach(g => msg += `${groupNames.indexOf(g) + 1}. ${g} (${groups[g].length})\n`);
        return conn.sendMessage(jid, { text: msg });
      }
    }

    if (!targetGroup) return conn.sendMessage(jid, { text: `❌ حزمة غير موجودة` });
    
    const page = args.includes('page') ? parseInt(args[args.indexOf('page') + 1]) || 1 : 1;
    return conn.sendMessage(jid, { text: formatGroupChannels(saved.channels, targetGroup, page) });
  }

  // ── search ──
  if (subCommand === 'search') {
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات` });

    const searchArgs = args.slice(1);
    const showAll = searchArgs[searchArgs.length - 1]?.toLowerCase() === 'all';
    const query = showAll ? searchArgs.slice(0, -1).join(' ') : searchArgs.join(' ');
    if (!query) return conn.sendMessage(jid, { text: `❌ أدخل اسم القناة` });

    const results = searchChannels(saved.channels, query);
    if (!results.length) return conn.sendMessage(jid, { text: `❌ لا نتائج لـ "${query}"` });

    const display = showAll ? results : results.slice(0, 30);
    let msg = `🔍 "${query}" (${results.length})\n\n`;
    
    const grouped = {};
    display.forEach(ch => {
      const g = ch.group || 'عام';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(ch);
    });

    for (const [g, chs] of Object.entries(grouped)) {
      msg += `📁 ${g}:\n`;
      chs.forEach(ch => msg += `  ${ch.index}. ${ch.name}\n`);
      msg += '\n';
    }

    if (!showAll && results.length > 30) {
      msg += `...و ${results.length - 30} أخرى\n💡 .fbex search "${query}" all`;
    }
    msg += `\n📌 .fbex play FB-KEY "${display[0]?.name || ''}"`;
    return conn.sendMessage(jid, { text: msg });
  }

  // ── play ──
  if (subCommand === 'play') {
    if (args.length < 3) return conn.sendMessage(jid, { text: `📌 .fbex play <FB-KEY> <اسم>` });
    
    const fbKey = args[1];
    const channelName = args.slice(2).join(' ');
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات` });

    const results = searchChannels(saved.channels, channelName);
    if (!results.length) return conn.sendMessage(jid, { text: `❌ لم يتم العثور على "${channelName}"` });

    if (results.length > 1) {
      let msg = `⚠️ ${results.length} قناة:\n\n`;
      results.slice(0, 10).forEach(ch => msg += `${ch.index}. ${ch.name} [${ch.group}]\n`);
      msg += `\n📌 .fbex play ${fbKey} #${results[0].index}`;
      return conn.sendMessage(jid, { text: msg });
    }

    const channel = results[0];
    const directUrl = await followRedirects(channel.url, `play_${jid.split('@')[0]}`);
    const streamId = `stream_${Date.now()}`;

    await conn.sendMessage(jid, {
      text: `🚀 ${channel.name}\n📁 ${channel.group}\n🆔 ${streamId}`
    });
    return conn.sendMessage(jid, {
      text: `.fbon ${streamId}|${fbKey}|${directUrl}`
    });
  }

  // ── play by index ──
  if (subCommand === 'play' && args[2]?.startsWith('#')) {
    const fbKey = args[1];
    const idx = parseInt(args[2].replace('#', ''));
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات` });

    const channel = saved.channels.find(ch => ch.index === idx);
    if (!channel) return conn.sendMessage(jid, { text: `❌ قناة ${idx} غير موجودة` });

    const directUrl = await followRedirects(channel.url, `play_${jid.split('@')[0]}`);
    const streamId = `stream_${Date.now()}`;
    
    return conn.sendMessage(jid, {
      text: `.fbon ${streamId}|${fbKey}|${directUrl}`
    });
  }

  // ── save ── (الإصدار المصلح - يستخرج جميع القنوات أو قنوات محددة)
  if (subCommand === 'save') {
    const saved = extractedChannels.get(jid);
    if (!saved) return conn.sendMessage(jid, { text: `❌ لا توجد قنوات. استخدم .fbex <رابط>` });

    if (args.length < 2) {
      const { groups, groupNames } = getSortedGroups(saved.channels);
      let msg = `📌 اختر حزمة أو حدد أرقام قنوات:\n\n`;
      groupNames.slice(0, 30).forEach((name, i) => msg += `${i + 1}. ${name} (${groups[name].length})\n`);
      msg += `\n💡 .fbex save <رقم/اسم> أو .fbex save 1 2 5`;
      return conn.sendMessage(jid, { text: msg });
    }

    let channelsToSave = [];
    let saveIdentifier = '';

    // التحقق إذا كانت المدخلات أرقام قنوات
    const channelIndices = args.slice(1).map(arg => parseInt(arg)).filter(num => !isNaN(num) && num > 0);

    if (channelIndices.length > 0) {
      // حفظ قنوات محددة بالترقيم
      channelsToSave = saved.channels.filter(ch => channelIndices.includes(ch.index));
      saveIdentifier = `القنوات المحددة (${channelIndices.join(', ')})`;
    } else {
      // حفظ حزمة بالاسم أو الرقم (المنطق الأصلي)
      const { groups, groupNames } = getSortedGroups(saved.channels);
      const arg = args[1];
      let exactGroup = null;

      if (!isNaN(arg) && Number(arg) > 0) {
        const idx = Number(arg) - 1;
        if (idx < groupNames.length) exactGroup = groupNames[idx];
      } else {
        const matched = groupNames.filter(g => g.toLowerCase().includes(arg.toLowerCase()));
        if (matched.length > 0) exactGroup = matched[0];
      }

      if (!exactGroup) return conn.sendMessage(jid, { text: `❌ حزمة غير موجودة: "${arg}"` });
      channelsToSave = groups[exactGroup];
      saveIdentifier = exactGroup;
    }

    if (channelsToSave.length === 0) {
      return conn.sendMessage(jid, { text: `❌ لم يتم العثور على قنوات للحفظ.` });
    }

    const total = channelsToSave.length;
    
    // رسالة البداية
    const startMsg = await conn.sendMessage(jid, { 
      text: `⏳ *بدء معالجة ${total} قناة*\n📁 ${saveIdentifier}\n⚡ السرعة: ~${CONCURRENCY} قنوات متزامنة\n\n⏳ جاري المعالجة...` 
    });

    const sessionId = `save_${jid.split('@')[0]}_${Date.now()}`;
    let lastUpdateMsg = startMsg;
    let lastUpdateTime = Date.now();

    // ✨ استخدام الدالة الجديدة لتحويل جميع القنوات
    const resolved = await resolveAllChannels(channelsToSave, sessionId, (progress) => {
      // تحديث الرسالة كل 3 ثواني
      const now = Date.now();
      if (now - lastUpdateTime > 3000 || progress.processed === progress.total) {
        lastUpdateTime = now;
        const etaMinutes = Math.floor(progress.eta / 60);
        const etaSeconds = progress.eta % 60;
        
        conn.sendMessage(jid, { 
          text: `⏳ *معالجة القنوات*\n` +
                `📊 ${progress.processed}/${progress.total} (${progress.percent}%)\n` +
                `⚡ ${progress.speed} قناة/ثانية\n` +
                `⏰ الوقت المتبقي: ${etaMinutes}:${etaSeconds.toString().padStart(2, '0')}\n` +
                `📦 الدفعة: ${progress.batch}/${progress.totalBatches}\n` +
                `📁 ${saveIdentifier}`,
          edit: lastUpdateMsg.key
        }).then(msg => lastUpdateMsg = msg).catch(() => {});
      }
    });

    // إنشاء ملف M3U
    let m3uContent = '#EXTM3U\n';
    for (const ch of resolved) {
      m3uContent += `#EXTINF:-1 tvg-id="${ch.epgId}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n${ch.url}\n`;
    }

    const safeName = saveIdentifier.replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `${safeName}_${resolved.length}ch_${Date.now()}.m3u`;
    const filePath = `./${fileName}`;
    
    // كتابة الملف
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(m3uContent);
    await new Promise((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    // حذف رسالة التقدم
    try { await conn.sendMessage(jid, { delete: lastUpdateMsg.key }); } catch (_) {}
    
    // إرسال النتيجة
    await conn.sendMessage(jid, { 
      text: `✅ *تم الحفظ بنجاح!*\n\n📁 ${saveIdentifier}\n📺 ${resolved.length} قناة\n📦 ${fileSize} MB\n📄 ${fileName}` 
    });

    // إرسال الملف
    try {
      await conn.sendMessage(jid, {
        document: fs.readFileSync(filePath),
        mimetype: 'audio/x-mpegurl',
        fileName: fileName
      });
    } catch (e) {
      await conn.sendMessage(jid, { text: `⚠️ حفظ محلياً: ${fileName}` });
    }

    // تنظيف
    try { fs.unlinkSync(filePath); } catch (_) {}
    return;
  }

  // ── clear ──
  if (subCommand === 'clear') {
    extractedChannels.delete(jid);
    return conn.sendMessage(jid, { text: `🗑️ تم مسح القائمة` });
  }

  // ── استخراج من رابط ──
  const url = text.trim();
  if (!url.startsWith('http')) return conn.sendMessage(jid, { text: `❌ رابط غير صحيح` });

  const sessionId = `ex_${jid.split('@')[0]}`;
  await conn.sendMessage(jid, { text: `⏳ جاري الاستخراج...\n${url.substring(0, 80)}...` });

  const result = await extractChannels(url, sessionId);

  if (!result.ok) {
    return conn.sendMessage(jid, { text: `❌ فشل: ${result.error}` });
  }

  if (!result.channels.length) {
    return conn.sendMessage(jid, { text: `⚠️ لا توجد قنوات` });
  }

  // حفظ مع حد أقصى للذاكرة
  const channelsToStore = result.channels.slice(0, MAX_MEMORY_CHANNELS);
  
  extractedChannels.set(jid, {
    channels: channelsToStore,
    source: url,
    type: result.type,
    timestamp: Date.now()
  });

  let msg = formatGroupList(channelsToStore);
  if (result.channels.length > MAX_MEMORY_CHANNELS) {
    msg += `\n\n⚠️ *ملاحظة:* تم تحميل أول ${MAX_MEMORY_CHANNELS} قناة فقط (من ${result.channels.length}) لحماية الذاكرة.`;
  }
  
  return conn.sendMessage(jid, { text: msg });
};

handler.help = ["fbex"];
handler.tags = ["stream", "iptv"];
handler.command = /^(fbex)$/i;

export default handler;
