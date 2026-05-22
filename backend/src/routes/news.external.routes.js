// backend/src/routes/news.external.routes.js
import { Router } from 'express';
import Parser from 'rss-parser';

const router = Router();
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumb'],
      ['enclosure', 'enclosure'],
    ],
  },
});

// Sumber RSS (bisa ditambah/kurangi)
const FEEDS = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
];

// cache sederhana 10 menit
let cache = { at: 0, items: [] };
const TTL_MS = 10 * 60 * 1000;

function pickImage(it) {
  // coba urutan: media:content -> media:thumbnail -> enclosure -> content:encoded -> description
  const mc = it.mediaContent?.$?.url || it.mediaContent?.url;
  const mt = it.mediaThumb?.$?.url || it.mediaThumb?.url;
  const enc = it.enclosure?.url;
  const fromContent = (it['content:encoded'] || '').match(/<img[^>]+src="([^"]+)"/i)?.[1];
  const fromDesc = (it.contentSnippet || it.content || '').match(/https?:\/\/[^"')\s]+?\.(?:jpg|jpeg|png|gif)/i)?.[0];
  return mc || mt || enc || fromContent || fromDesc || '';
}

router.get('/news/external', async (req, res) => {
  try {
    // pakai cache
    if (Date.now() - cache.at < TTL_MS && cache.items.length) {
      return res.json(cache.items);
    }

    const results = [];
    for (const f of FEEDS) {
      const feed = await parser.parseURL(f.url);
      for (const it of (feed.items || []).slice(0, 10)) {
        results.push({
          source: f.name,
          title: it.title,
          link: it.link,
          publishedAt: it.isoDate || it.pubDate || new Date().toISOString(),
          image: pickImage(it),
          summary: it.contentSnippet || '',
        });
      }
    }

    // sort terbaru, ambil 20
    results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const items = results.slice(0, 20);

    cache = { at: Date.now(), items };
    res.json(items);
  } catch (err) {
    console.error('NEWS EXTERNAL ERROR:', err);
    res.status(500).json({ message: 'Gagal mengambil berita' });
  }
});

export default router;
