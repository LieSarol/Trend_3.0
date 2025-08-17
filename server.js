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
  { name: "CNN News", url: "http://rss.cnn.com/rss/cnn_topstories.rss", type: "news" },
  { name: "Minecraft News", url: "https://news.google.com/rss/search?q=Minecraft", type: "news" }
];

// Timestamped logger
function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// 🚀 Main crawler route
app.get('/crawl', async (req, res) => {
  const { type, source, q, mode } = req.query;
  log("📥 Incoming request:", { type, source, q, mode });

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

  // 🔧 helper to clean authors like "email (Name)" -> "Name"
  function cleanAuthor(author) {
    if (!author) return "Unknown";
    const match = author.match(/\(([^)]+)\)/);
    if (match) return match[1].trim();
    return author.trim();
  }

  for (const feed of selectedFeeds) {
    log(`🌐 Fetching feed: ${feed.name} (${feed.url})`);
    try {
      const result = await parser.parseURL(feed.url);
      log(`✅ Parsed ${feed.name} - ${result.items.length} items found`);

      for (const item of result.items) {
        if (q && !item.title?.toLowerCase().includes(q.toLowerCase())) {
          log(`⏭ Skipping due to query filter: "${q}"`);
          continue;
        }
        if (item.link) {
          const rawAuthor =
            item.creator ||
            item.author ||
            item["dc:creator"] ||
            item["itunes:author"] ||
            item["media:credit"];

          allItems.push({
            link: item.link,
            title: item.title || "No title",
            author: cleanAuthor(rawAuthor), // 🧑 Cleaned-up author
            source: feed.name,              // 📰 Source
            pubDate: item.pubDate || null   // ⏰ Publish time
          });
        }
      }
    } catch (err) {
      log(`❌ Failed to parse ${feed.name}:`, err);
    }
  }

  if (allItems.length === 0) {
    return res.status(404).json({ status: "error", message: "No links found" });
  }

  let chosenItem;

  if (mode === "latest") {
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    chosenItem = allItems[0];
    log(`📊 Returning latest item:`, chosenItem.link);
  } else {
    const randomIndex = Math.floor(Math.random() * allItems.length);
    chosenItem = allItems[randomIndex];
    log(`📊 Returning random item:`, chosenItem.link);
  }

  res.json({
    status: "ok",
    ...chosenItem
  });
});

app.get('/', (req, res) => {
  res.send('I have crush on Precious.');
});

app.listen(PORT, () => {
  log(`🔥 RSS Crawler running at http://localhost:${PORT}`);
});
