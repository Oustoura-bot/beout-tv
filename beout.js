import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';

// =================== الإعدادات ===================
const BOT_TOKEN = '8642487828:AAHOMH6r914HJgPmb7tnB53d8LeW0OZ-LfA';
const DATA_FILE = 'data.json';
const SERVER_PORT = 3000; // المنفذ الذي سيعمل عليه خادم الـ Redirect
const SERVER_URL = 'http://YOUR_SERVER_IP:3000'; // استبدل هذا برابط السيرفر الخاص بك (IP أو Domain)

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
  // محاكاة طريقة "mouhatop@" لإضافة معرف فريد للرابط (اختياري)
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
    // الرابط الثابت الذي سيتم إعطاؤه للمستخدم
    fixed_url: `${SERVER_URL}/live/${chatId}/${encodeURIComponent(name)}.mpd`
  };

  // إرسال الرابط الثابت للمستخدم فوراً
  bot.sendMessage(chatId, `🎥 تم تشغيل البث: **${name}**\n\n🔗 الرابط الثابت (يعمل للأبد):\n\`${userStreams[chatId][name].fixed_url}\``, { parse_mode: 'Markdown' });

  while (userStreams[chatId]?.[name]?.active) {
    let proc = userStreams[chatId][name].proc;
    if (!proc || proc.exitCode !== null) {
      proc = launchFfmpeg(source, streamUrl);
      userStreams[chatId][name].proc = proc;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const proc = userStreams[chatId]?.[name]?.proc;
  if (proc) proc.kill();
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
  } catch (e) {}

  delete userStreams[chatId][name];
}

// =================== أوامر البوت ===================

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
  bot.sendMessage(chatId, '🛑 تم إيقاف جميع العمليات..');
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

// =================== معالجة الرسائل النصية ===================
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
  for (const name of names) {
    if (saved[name] && !userStreams[chatId]?.[name]) {
      streamThread(chatId, saved[name], name).catch(console.error);
    }
  }
});

// =================== Redirect Endpoint (السر) ===================
app.get('/live/:chatId/:channelName.mpd', async (req, res) => {
  const { chatId, channelName } = req.params;
  const decodedName = decodeURIComponent(channelName);
  const streamInfo = userStreams[chatId]?.[decodedName];

  if (!streamInfo) {
    return res.status(404).send('Stream not found.');
  }

  try {
    // جلب رابط DASH طازج من فيسبوك عند كل طلب للمشغل
    const infoRes = await axios.get(
      `https://graph.facebook.com/v17.0/${streamInfo.live_id}`,
      {
        params: {
          access_token: streamInfo.token,
          fields: 'dash_preview_url'
        }
      }
    );
    
    const freshDashUrl = fixDashUrl(infoRes.data.dash_preview_url);
    
    if (freshDashUrl) {
      // تحديث الرابط في الذاكرة
      userStreams[chatId][decodedName].dash_url = freshDashUrl;
      // توجيه المشغل إلى الرابط الجديد فوراً
      console.log(`Redirecting ${decodedName} to fresh URL...`);
      res.redirect(freshDashUrl);
    } else {
      res.status(500).send('Could not refresh DASH URL.');
    }
  } catch (error) {
    console.error('Error refreshing DASH URL:', error.message);
    // إذا فشل التحديث، نحاول التوجيه لآخر رابط ناجح لدينا
    if (streamInfo.dash_url) {
      res.redirect(streamInfo.dash_url);
    } else {
      res.status(500).send('Error refreshing DASH URL.');
    }
  }
});

// =================== تشغيل الخادم ===================
app.listen(SERVER_PORT, () => {
  console.log(`Redirect server running on port ${SERVER_PORT}`);
});

console.log('🎬 Bot BeOut (Redirect Version) is running ...');
