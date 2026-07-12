import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';
import xml2js from 'xml2js';

// =================== الإعدادات ===================
const BOT_TOKEN = '8642487828:AAHOMH6r914HJgPmb7tnB53d8LeW0OZ-LfA';
const DATA_FILE = 'data.json';
const PROXY_PORT = 3000; // منفذ لخادم البروكسي

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();

// =================== تخزين البيانات ===================
let userPages = {};
let userM3u8 = {};
let activePage = {};
let userStreams = {};

// تحميل البيانات من الملف
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      userPages = data.pages || {};
      userM3u8 = data.channels || {};
    }
  } catch (e) {
    console.error('خطأ في تحميل البيانات:', e.message);
  }
}
loadData();

// حفظ البيانات
function saveData() {
  const data = {
    pages: userPages,
    channels: userM3u8
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// =================== دوال مساعدة ===================
function fixDashUrl(url) {
  if (!url) return null;
  const match = url.match(/https:\/\/([^/]*?(?:video|scontent)[^/]*?\.fbcdn\.net)\//);
  if (match) {
    const domain = match[1];
    const replacement = domain.includes('video')
      ? 'https://BeOut@video.xx.fbcdn.net/'
      : 'https://BeOut@scontent.xx.fbcdn.net/';
    return url.replace(/https:\/\/[^/]*?(?:video|scontent)[^/]*?\.fbcdn\.net\//, replacement);
  }
  return url;
}

function getChatId(msg) {
  return String(msg.chat.id);
}

// =================== دوال الـ API ===================
async function getNewStream(chatId) {
  const pageName = activePage[chatId];
  if (!pageName) return { streamUrl: null, liveId: null, dashUrl: null, token: null };

  const page = userPages[chatId]?.[pageName];
  if (!page) return { streamUrl: null, liveId: null, dashUrl: null, token: null };

  try {
    const createRes = await axios.post(
      `https://graph.facebook.com/v17.0/${page.page_id}/live_videos`,
      null,
      {
        params: {
          access_token: page.token,
          status: 'UNPUBLISHED',
          title: 'Live Preview',
          description: 'Preview stream'
        }
      }
    );
    const liveId = createRes.data.id;
    if (!liveId) return { streamUrl: null, liveId: null, dashUrl: null, token: null };

    const infoRes = await axios.get(
      `https://graph.facebook.com/v17.0/${liveId}`,
      {
        params: {
          access_token: page.token,
          fields: 'stream_url,dash_preview_url'
        }
      }
    );
    const streamUrl = infoRes.data.stream_url;
    const dashUrl = fixDashUrl(infoRes.data.dash_preview_url);
    return { streamUrl, liveId, dashUrl, token: page.token };
  } catch (e) {
    console.error('خطأ في إنشاء البث:', e.message);
    return { streamUrl: null, liveId: null, dashUrl: null, token: null };
  }
}

// =================== تشغيل FFmpeg ===================
function launchFfmpeg(source, streamUrl) {
  const args = [
    '-re',
    '-i', source,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'flv',
    streamUrl
  ];
  const proc = spawn('ffmpeg', args, {
    stdio: ['ignore', 'ignore', 'ignore']
  });
  return proc;
}

// =================== دالة البث الأساسية ===================
async function streamThread(chatId, source, name) {
  const { streamUrl, liveId, dashUrl, token } = await getNewStream(chatId);
  if (!streamUrl) {
    bot.sendMessage(chatId, '❌ فشل إنشاء البث.');
    return;
  }

  if (!userStreams[chatId]) userStreams[chatId] = {};
  userStreams[chatId][name] = {
    proc: null,
    live_id: liveId,
    token: token,
    active: true,
    source: source,
    dash_url: dashUrl,
    proxy_url: `http://localhost:${PROXY_PORT}/live/${chatId}/${name}.mpd` // رابط البروكسي الثابت
  };

  // تحديث رابط الـ DASH كل 3 ساعات (أقل من 4 ساعات لضمان التجديد قبل انتهاء الصلاحية)
  const refreshInterval = setInterval(async () => {
    if (!userStreams[chatId]?.[name]?.active) {
      clearInterval(refreshInterval);
      return;
    }
    try {
      const infoRes = await axios.get(
        `https://graph.facebook.com/v17.0/${liveId}`,
        {
          params: {
            access_token: token,
            fields: 'dash_preview_url'
          }
        }
      );
      const fresh = fixDashUrl(infoRes.data.dash_preview_url);
      if (fresh) {
        userStreams[chatId][name].dash_url = fresh;
        console.log(`تم تحديث رابط DASH للقناة ${name}: ${fresh}`);
      }
    } catch (e) {
      console.error(`خطأ في تحديث رابط DASH للقناة ${name}:`, e.message);
    }
  }, 3 * 60 * 60 * 1000); // 3 ساعات

  setTimeout(async () => {
    try {
      const infoRes = await axios.get(
        `https://graph.facebook.com/v17.0/${liveId}`,
        {
          params: {
            access_token: token,
            fields: 'dash_preview_url'
          }
        }
      );
      const fresh = fixDashUrl(infoRes.data.dash_preview_url);
      if (fresh) {
        if (userStreams[chatId]?.[name]) {
          userStreams[chatId][name].dash_url = fresh;
        }
        bot.sendMessage(chatId, `🎥 ${name}\n👁️ DASH (رابط البروكسي):\n${userStreams[chatId][name].proxy_url}`);
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }, 20000);

  while (userStreams[chatId]?.[name]?.active) {
    let proc = userStreams[chatId][name].proc;
    if (!proc || proc.exitCode !== null) {
      proc = launchFfmpeg(source, streamUrl);
      userStreams[chatId][name].proc = proc;
    }
    if (proc.exitCode !== null) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      proc = launchFfmpeg(source, streamUrl);
      userStreams[chatId][name].proc = proc;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const proc = userStreams[chatId]?.[name]?.proc;
  if (proc) {
    proc.kill();
  }
}

// =================== إيقاف بث ===================
async function stopStream(chatId, name) {
  const info = userStreams[chatId]?.[name];
  if (!info) return;

  info.active = false;
  if (info.proc) info.proc.kill();

  try {
    await axios.delete(
      `https://graph.facebook.com/v17.0/${info.live_id}`,
      { params: { access_token: info.token } }
    );
  } catch (e) {
    // تجاهل
  }

  delete userStreams[chatId][name];
}

// =================== أوامر البوت ===================

// /addpage
bot.onText(/^\/addpage (.+)/, (msg, match) => {
  const chatId = getChatId(msg);
  const parts = match[1].split(/\s+/);
  if (parts.length < 3) {
    bot.sendMessage(chatId, '⚠️ الصيغة: /addpage الاسم ID التوكن');
    return;
  }
  const [name, pageId, token] = parts;
  if (!userPages[chatId]) userPages[chatId] = {};
  userPages[chatId][name] = { page_id: pageId, token };
  saveData();
  bot.sendMessage(chatId, `✅ تم إضافة الصفحة ${name} بنجاح.`);
});

// /usepage
bot.onText(/^\/usepage (.+)/, (msg, match) => {
  const chatId = getChatId(msg);
  const name = match[1].trim();
  if (!userPages[chatId]?.[name]) {
    bot.sendMessage(chatId, '❌ الصفحة غير موجودة');
    return;
  }
  activePage[chatId] = name;
  bot.sendMessage(chatId, `🎯 الصفحة النشطة الآن: ${name}`);
});

// /savem3u8
bot.onText(/^\/savem3u8 (.+)/, (msg, match) => {
  const chatId = getChatId(msg);
  const parts = match[1].split(/\s+/);
  if (parts.length < 2) {
    bot.sendMessage(chatId, '⚠️ الصيغة: /savem3u8 الاسم الرابط');
    return;
  }
  const [name, url] = parts;
  if (!userM3u8[chatId]) userM3u8[chatId] = {};
  userM3u8[chatId][name] = url;
  saveData();
  bot.sendMessage(chatId, `💾 تم حفظ القناة: ${name}`);
});

// /m3u8list
bot.onText(/^\/m3u8list$/, (msg) => {
  const chatId = getChatId(msg);
  const data = userM3u8[chatId];
  if (!data || Object.keys(data).length === 0) {
    bot.sendMessage(chatId, '❌ قائمة القنوات فارغة..');
    return;
  }
  let txt = '📺 القنوات المحفوظة:\n';
  for (const name of Object.keys(data)) {
    txt += `- ${name}\n`;
  }
  bot.sendMessage(chatId, txt);
});

// /stopall
bot.onText(/^\/stopall$/, async (msg) => {
  const chatId = getChatId(msg);
  const streams = userStreams[chatId];
  if (!streams || Object.keys(streams).length === 0) {
    bot.sendMessage(chatId, '❌ لا توجد بثوث نشطة');
    return;
  }
  for (const name of Object.keys(streams)) {
    await stopStream(chatId, name);
    bot.sendMessage(chatId, `🛑 تم إيقاف: ${name}`);
  }
  bot.sendMessage(chatId, '🛑 تم تنظيف الرام وإيقاف جميع العمليات..');
});

// /check
bot.onText(/^\/check$/, async (msg) => {
  const chatId = getChatId(msg);
  const pages = userPages[chatId];
  if (!pages || Object.keys(pages).length === 0) {
    bot.sendMessage(chatId, '❌ لا توجد صفحات مسجلة لفحصها.');
    return;
  }
  let report = '📋 تقرير فحص التوكنات:\n';
  for (const [name, info] of Object.entries(pages)) {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v17.0/${info.page_id}`,
        { params: { access_token: info.token, fields: 'name' } }
      );
      if (res.status === 200) {
        report += `✅ ${name}: هذا التوكن شغال\n`;
      } else {
        report += `❌ ${name}: هذا التوكن غير صالح\n`;
      }
    } catch {
      report += `❌ ${name}: هذا التوكن غير صالح\n`;
    }
  }
  bot.sendMessage(chatId, report);
});

// /testall
bot.onText(/^\/testall$/, async (msg) => {
  const chatId = getChatId(msg);
  const streams = userStreams[chatId];
  if (!streams || Object.keys(streams).length === 0) {
    bot.sendMessage(chatId, '❌ لا توجد قنوات تبث حالياً لفحصها.');
    return;
  }
  let report = '🧪 **فحص روابط DASH للبثوث النشطة:**\n\n';
  for (const [name, info] of Object.entries(streams)) {
    const dashUrl = info.dash_url;
    if (!dashUrl) {
      report += `⚪️ **${name}**: لا يوجد رابط DASH لهذا البث.\n`;
      continue;
    }
    try {
      const res = await axios.head(dashUrl, { timeout: 10000 });
      if (res.status === 200) {
        report += `✅ **${name}**: رابط DASH يعمل بنجاح.\n`;
      } else {
        report += `❌ **${name}**: رابط DASH لا يعمل (Error ${res.status}).\n`;
      }
    } catch {
      report += `❌ **${name}**: رابط DASH متعطل (خطأ اتصال).\n`;
    }
  }
  bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
});

// /testm3u8
bot.onText(/^\/testm3u8$/, async (msg) => {
  const chatId = getChatId(msg);
  const channels = userM3u8[chatId];
  if (!channels || Object.keys(channels).length === 0) {
    bot.sendMessage(chatId, '❌ قائمة القنوات فارغة..');
    return;
  }
  const statusMsg = await bot.sendMessage(chatId, '⏳ جاري فحص الروابط المحفوظة...');
  let report = '🧪 تقرير فحص القنوات المحفوظة:\n';
  for (const [name, url] of Object.entries(channels)) {
    let linkType = 'URL';
    if (url.toLowerCase().includes('.m3u8')) linkType = 'M3U8';
    else if (url.toLowerCase().includes('.mpd')) linkType = 'MPD';

    let status;
    try {
      const res = await axios.head(url, { timeout: 5000, maxRedirects: 5 });
      if (res.status >= 200 && res.status < 400) {
        status = 'شغال ✅';
      } else {
        status = `خطأ (${res.status}) ❌`;
      }
    } catch {
      status = 'غير مستجيب ❌';
    }
    report += `- ${name} (${linkType}) -> ${status}\n`;
  }
  bot.editMessageText(report, { chat_id: chatId, message_id: statusMsg.message_id });
});

// =================== استيراد ملف txt ===================
bot.on('document', async (msg) => {
  const chatId = getChatId(msg);
  const doc = msg.document;
  if (!doc.file_name.toLowerCase().endsWith('.txt')) return;

  try {
    const file = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await axios.get(fileUrl, { responseType: 'text' });
    const content = response.data;

    if (!userM3u8[chatId]) userM3u8[chatId] = {};
    let count = 0;
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      const name = parts[0];
      const url = parts.slice(1).join(' ');
      if (url.startsWith('http')) {
        userM3u8[chatId][name] = url;
        count++;
      }
    }
    saveData();
    bot.sendMessage(chatId, `💾 تم استيراد ${count} قناة بنجاح..`);
  } catch (e) {
    bot.sendMessage(chatId, '❌ فشل استيراد الملف: ' + e.message);
  }
});

// =================== معالجة الرسائل النصية (تشغيل القنوات) ===================
bot.on('text', async (msg) => {
  const chatId = getChatId(msg);
  const text = msg.text;

  if (text.startsWith('/')) return;

  if (!activePage[chatId]) {
    bot.sendMessage(chatId, '⚠️ اختر صفحة أولاً باستخدام /usepage.');
    return;
  }

  const saved = userM3u8[chatId] || {};
  const names = text.split('\n').map(s => s.trim()).filter(s => s);
  if (names.length === 0) return;

  let started = 0;
  let notFound = false;

  for (const name of names) {
    if (!saved[name]) {
      notFound = true;
      continue;
    }
    if (userStreams[chatId]?.[name]) {
      bot.sendMessage(chatId, `⚠️ البث '${name}' قيد التشغيل بالفعل.`);
      continue;
    }
    const source = saved[name];
    streamThread(chatId, source, name).catch(err => {
      console.error(`خطأ في بث ${name}:`, err);
    });
    started++;
  }

  if (started === 0 && notFound) {
    bot.sendMessage(chatId, '❌ لم يتم العثور على اسم قناة مطابق.');
  }
});

// =================== Proxy Manifest Endpoint ===================
app.get('/live/:chatId/:channelName.mpd', async (req, res) => {
  const { chatId, channelName } = req.params;
  const streamInfo = userStreams[chatId]?.[channelName];

  if (!streamInfo || !streamInfo.dash_url) {
    return res.status(404).send('MPD not found or stream not active.');
  }

  try {
    // جلب الـ MPD الأصلي من فيسبوك
    const response = await axios.get(streamInfo.dash_url, { responseType: 'text' });
    let mpdContent = response.data;

    // تعديل الـ MPD لتوجيه الروابط عبر البروكسي
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();
    let result = await parser.parseStringPromise(mpdContent);

    // البحث عن جميع الـ BaseURL وتعديلها
    if (result.MPD && result.MPD.Period && result.MPD.Period[0] && result.MPD.Period[0].AdaptationSet) {
      result.MPD.Period[0].AdaptationSet.forEach(adaptationSet => {
        if (adaptationSet.Representation) {
          adaptationSet.Representation.forEach(representation => {
            if (representation.BaseURL) {
              representation.BaseURL.forEach(baseURL => {
                // استبدال النطاق الأصلي برابط البروكسي
                const originalUrl = baseURL._;
                if (originalUrl) {
                  const newBaseUrl = originalUrl.replace(/https:\/\/[^/]*?(?:video|scontent)[^/]*?\.fbcdn\.net/, `http://localhost:${PROXY_PORT}/proxy`);
                  baseURL._ = newBaseUrl;
                }
              });
            }
          });
        }
      });
    }

    mpdContent = builder.buildObject(result);

    res.set('Content-Type', 'application/dash+xml');
    res.send(mpdContent);

  } catch (error) {
    console.error(`خطأ في جلب أو تعديل MPD للقناة ${channelName}:`, error.message);
    res.status(500).send('Error processing MPD.');
  }
});

// =================== Proxy Media Segments Endpoint ===================
app.get('/proxy/*', async (req, res) => {
  const originalUrl = `https://${req.params[0]}`;
  try {
    const response = await axios.get(originalUrl, { responseType: 'stream' });
    response.data.pipe(res);
  } catch (error) {
    console.error('خطأ في بروكسي جزء الميديا:', error.message);
    res.status(500).send('Error proxying media segment.');
  }
});

// =================== تشغيل خادم Express ===================
app.listen(PROXY_PORT, () => {
  console.log(`Proxy server listening on port ${PROXY_PORT}`);
});

// =================== تشغيل البوت ===================
console.log('🎬 Bot BeOut is running ...');
