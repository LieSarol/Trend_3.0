import express from 'express';
import RSSParser from 'rss-parser';
import Mercury from '@postlight/parser';
import fetch from 'node-fetch'; // Optional if Node < 18

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new RSSParser();

// 🧩 Define feeds
const feeds = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", type: "news" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", type: "news" },
  { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/", type: "blogs" },
  { name: "CSS-Tricks", url: "https://css-tricks.com/feed/", type: "blogs" }
];

// Timestamped logger
function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// 🚀 Main crawler route
app.get('/crawl', async (req, res) => {
  const { type, source, limit = 10, q, full } = req.query;
  log("📥 Incoming request:", { type, source, limit, q, full });

  let selectedFeeds = feeds;

  if (type) {
    selectedFeeds = selectedFeeds.filter(f => f.type === type);
    log(`🔍 Filtered by type '${type}':`, selectedFeeds.map(f => f.name));
  }

  if (source) {
    selectedFeeds = selectedFeeds.filter(f =>
      f.name.toLowerCase().includes(source.toLowerCase())
    );
    log(`🔍 Filtered by source '${source}':`, selectedFeeds.map(f => f.name));
  }

  const allItems = [];

  for (const feed of selectedFeeds) {
    log(`🌐 Fetching feed: ${feed.name} (${feed.url})`);
    try {
      const result = await parser.parseURL(feed.url);
      log(`✅ Parsed ${feed.name} - ${result.items.length} items found`);

      for (const item of result.items) {
        log(`📄 Processing item:`, { title: item.title, link: item.link });

        if (q && !item.title?.toLowerCase().includes(q.toLowerCase())) {
          log(`⏭ Skipping due to query filter: "${q}"`);
          continue;
        }

        const article = {
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: feed.name
        };

        if (full) {
          article.description = item.contentSnippet || item.summary || null;
          article.content = item['content:encoded'] || item.content || null;
          article.categories = item.categories || [];
          article.author = item.creator || item.author || null;
          article.image = item.enclosure?.url || null;
        }

        if (full === 'deep') {
          log(`🔎 Deep parsing via Mercury: ${item.link}`);
          try {
            const mercuryResult = await Mercury.parse(item.link);
            log(`📥 Mercury raw result:`, mercuryResult);

            article.title = mercuryResult.title || article.title;
            article.content = mercuryResult.content || article.content;
            article.description = mercuryResult.excerpt || article.description;
            article.author = mercuryResult.author || article.author;
            article.image = mercuryResult.lead_image_url || article.image;
            article.date_published = mercuryResult.date_published || article.pubDate;
            article.domain = mercuryResult.domain;
          } catch (err) {
            log(`🛑 Mercury failed for ${item.link}:`, err);
          }
        }

        allItems.push(article);
      }
    } catch (err) {
      log(`❌ Failed to parse ${feed.name}:`, err);
    }
  }

  const sorted = allItems
    .filter(item => item.title && item.link)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, parseInt(limit));

  log(`📊 Final result count: ${sorted.length}`);

  res.json({
    status: "ok",
    type: type || "all",
    source: source || "all",
    count: sorted.length,
    data: sorted
  });
});

app.get('/', (req, res) => {
  res.send('I have crush on Precious.');
});

app.listen(PORT, () => {
  log(`🔥 RSS Crawler running at http://localhost:${PORT}`);
});
