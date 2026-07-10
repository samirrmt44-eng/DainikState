// ============================================================
// DainikState Backend v3 - Comment-Focused Edition
// ============================================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  ODYSEE: {
    CLAIM_ID: process.env.ODYSEE_CLAIM_ID || '@DainikState:1',
    API_URL: 'https://api.odysee.com/api/v1/proxy',
    API_KEY: process.env.ODYSEE_API_KEY || '',
  },
  RSS: {
    URL: 'https://dainikstate.com/feed/',
  },
};

// ============================================================
// DISTRICTS (Jharkhand + Bihar major)
// ============================================================
const DISTRICTS = [
  'रांची', 'जमशेदपुर', 'धनबाद', 'बोकारो', 'देवघर', 'हजारीबाग',
  'गिरिडीह', 'कोडरमा', 'चतरा', 'लातेहार', 'लोहरदगा', 'गुमला',
  'सिमडेगा', 'पश्चिमी सिंहभूम', 'पूर्वी सिंहभूम', 'सरायकेला',
  'खूंटी', 'रामगढ़', 'पलामू', 'गढ़वा', 'जामताड़ा', 'साहेबगंज',
  'पाकुड़', 'दुमका', 'गोड्डा', 'साहेबगंज', 'भागलपुर', 'मुंगेर',
  'पटना', 'गया', 'नालंदा', 'राजगीर', 'बिहारशरीफ', 'दरभंगा',
  'मुजफ्फरपुर', 'पूर्णिया', 'कटिहार', 'सहरसा', 'आरा', 'छपरा',
  'बेगूसराय', 'समस्तीपुर', 'सीवान', 'गोपालगंज', 'सीतामढ़ी',
];

// Auto-detect district from text
function detectDistrict(text) {
  const lower = (text || '').toLowerCase();
  for (const d of DISTRICTS) {
    if (lower.includes(d.toLowerCase()) || lower.includes(d.replace('ी', 'i'))) {
      return d;
    }
  }
  return null;
}

// ============================================================
// HELPERS
// ============================================================
function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstImage(html) {
  const m = (html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function extractAllImages(html) {
  const matches = [...(html || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
  return matches.map(m => m[1]);
}

// Extract embedded videos (YouTube, mp4, etc.)
function extractVideos(html) {
  const videos = [];
  // YouTube
  const ytMatches = [...(html || '').matchAll(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi)];
  ytMatches.forEach(m => videos.push({ type: 'youtube', id: m[1] }));
  // Direct mp4
  const mp4Matches = [...(html || '').matchAll(/(https?:\/\/[^\s"'<>]+\.mp4)/gi)];
  mp4Matches.forEach(m => videos.push({ type: 'mp4', url: m[1] }));
  return videos;
}

// Simple AI-style summary generator (rule-based)
function generateSummary(text, maxLen = 200) {
  if (!text) return '';
  // Remove URLs
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  // Take first 2 sentences or first N words
  const sentences = clean.split(/[।.!?]/).filter(s => s.trim().length > 10);
  let summary = sentences.slice(0, 2).join('। ');
  if (!summary) {
    summary = clean.split(' ').slice(0, 30).join(' ') + '...';
  } else {
    summary += '।';
  }
  if (summary.length > maxLen) {
    summary = summary.slice(0, maxLen) + '...';
  }
  return summary;
}

// Extract key points
function extractKeyPoints(text) {
  const clean = (text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/[।.!?]/).filter(s => s.trim().length > 15 && s.trim().length < 150);
  return sentences.slice(0, 3).map(s => s.trim());
}

function parseRssItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const raw of itemMatches) {
    const titleMatch = raw.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = raw.match(/<link>(.*?)<\/link>/i);
    const descMatch = raw.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const contentMatch = raw.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
    const pubDateMatch = raw.match(/<pubDate>(.*?)<\/pubDate>/i);
    const creatorMatch = raw.match(/<dc:creator>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/i);
    const catMatch = raw.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/i);

    if (!titleMatch) continue;
    const fullContent = (contentMatch ? contentMatch[1] : '') || (descMatch ? descMatch[1] : '');
    const desc = stripHtml(descMatch ? descMatch[1] : '');

    const title = stripHtml(titleMatch[1]);
    const fullText = stripHtml(fullContent);

    items.push({
      title,
      link: linkMatch ? linkMatch[1].trim() : '',
      description: desc.slice(0, 280),
      summary: generateSummary(fullText || title),
      keyPoints: extractKeyPoints(fullText),
      thumbnail: extractFirstImage(fullContent || desc),
      images: extractAllImages(fullContent),
      videos: extractVideos(fullContent),
      pubDate: pubDateMatch ? new Date(pubDateMatch[1]).getTime() : Date.now(),
      author: creatorMatch ? stripHtml(creatorMatch[1]) : 'DainikState Desk',
      category: catMatch ? stripHtml(catMatch[1]) : 'News',
      district: detectDistrict(title + ' ' + fullText),
    });
  }
  return items;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 0) return 'अभी अभी';
  if (diff < 60_000) return 'अभी अभी';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' मिनट पहले';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' घंटे पहले';
  if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + ' दिन पहले';
  return Math.floor(diff / 604_800_000) + ' हफ़्ते पहले';
}

// ============================================================
// ROUTES
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DainikState v3 server is running' });
});

// ---- DISTRICTS LIST ----
app.get('/api/districts', (req, res) => {
  res.json({ success: true, items: DISTRICTS });
});

// ---- DAINIKSTATE NEWS (RSS) ----
app.get('/api/news', async (req, res) => {
  try {
    const response = await axios.get(CONFIG.RSS.URL, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 DainikStateApp' },
    });
    const items = parseRssItems(response.data);
    res.json({
      success: true,
      source: 'dainikstate.com',
      count: items.length,
      items: items.slice(0, 50),
    });
  } catch (err) {
    console.error('News fetch error:', err.message);
    res.json({
      success: false,
      source: 'error',
      count: 0,
      items: [],
      message: 'News temporarily unavailable',
    });
  }
});

// ---- ODYSEE VIDEOS ----
app.get('/api/videos', async (req, res) => {
  try {
    const payload = {
      method: 'claim_search',
      params: {
        claim_type: 'stream',
        channel_id: CONFIG.ODYSEE.CLAIM_ID,
        page: 1,
        page_size: 20,
        order_by: ['release_time'],
        no_totals: true,
      },
    };
    const headers = { 'Content-Type': 'application/json' };
    if (CONFIG.ODYSEE.API_KEY) headers['X-Api-Key'] = CONFIG.ODYSEE.API_KEY;

    const response = await axios.post(CONFIG.ODYSEE.API_URL, payload, { headers, timeout: 10000 });
    const items = (response.data?.result?.items || []).map(item => ({
      claim_id: item.claim_id,
      title: item.value?.title || 'Untitled',
      description: item.value?.description || '',
      summary: generateSummary(item.value?.description || item.value?.title || ''),
      thumbnail: item.value?.thumbnail?.url
        ? `https://thumbnails.odycdn.com/600x400/${item.value.thumbnail.url.split('/').pop()}`
        : '',
      url: `https://odysee.com/${item.name}#${item.claim_id}`,
      duration: item.value?.video?.duration || 0,
      release_time: item.meta?.release_time ? item.meta.release_time * 1000 : Date.now(),
      views: item.meta?.views || 0,
    }));

    res.json({
      success: true,
      source: 'odysee',
      channel: CONFIG.ODYSEE.CLAIM_ID,
      count: items.length,
      items,
    });
  } catch (err) {
    console.warn('Odysee fetch failed:', err.message);
    res.json({
      success: true,
      source: 'pending',
      channel: CONFIG.ODYSEE.CLAIM_ID,
      count: 0,
      items: [],
      message: `Odysee channel "${CONFIG.ODYSEE.CLAIM_ID}" not found yet.`,
    });
  }
});

// ---- COMBINED FEED ----
app.get('/api/feed', async (req, res) => {
  const [newsRes, videosRes] = await Promise.all([
    axios.get(`http://localhost:${PORT}/api/news`).catch(() => ({ data: { items: [] } })),
    axios.get(`http://localhost:${PORT}/api/videos`).catch(() => ({ data: { items: [] } })),
  ]);

  res.json({
    success: true,
    news: newsRes.data,
    videos: videosRes.data,
  });
});

// ---- AI SUMMARIZE (any text) ----
app.post('/api/summarize', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  res.json({
    summary: generateSummary(text),
    keyPoints: extractKeyPoints(text),
    district: detectDistrict(text),
  });
});

// ---- LEADERBOARD (top commenters — tracked client-side, served as example) ----
app.get('/api/leaderboard', (req, res) => {
  // Client posts their stats; this is for future backend aggregation
  res.json({
    success: true,
    message: 'Leaderboard is client-side. Check localStorage.',
    sample: [
      { name: 'राजेश', comments: 145, badge: '👑 दैनिक चैंपियन' },
      { name: 'प्रिया', comments: 98, badge: '🥈 कमेंट क्वीन' },
      { name: 'अमित', comments: 76, badge: '🥉 बहस बादशाह' },
    ],
  });
});

// ---- START ----
app.listen(PORT, () => {
  console.log(`🚀 DainikState v3 server running on http://localhost:${PORT}`);
  console.log(`📰 News source: ${CONFIG.RSS.URL}`);
  console.log(`📺 Odysee channel: ${CONFIG.ODYSEE.CLAIM_ID}`);
  console.log(`📍 Districts loaded: ${DISTRICTS.length}`);
  console.log(`🔑 API Key: ${CONFIG.ODYSEE.API_KEY ? '***configured***' : '***not set***'}`);
});
