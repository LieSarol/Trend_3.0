import express from 'express';
import RSSParser from 'rss-parser';

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new RSSParser();

// 🧩 Define feeds before using them
const feeds = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    type: "news"
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    type: "news"
  },
  {
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    type: "blogs"
  },
  {
    name: "CSS-Tricks",
    url: "https://css-tricks.com/feed/",
    type: "blogs"
  }
];

// 🚀 Main crawler route
app.get('/crawl', async (req, res) => {
  const { type, source, limit = 10, q, full } = req.query;

  let selectedFeeds = feeds;

  if (type) {
    selectedFeeds = selectedFeeds.filter(f => f.type === type);
  }

  if (source) {
    selectedFeeds = selectedFeeds.filter(f =>
      f.name.toLowerCase().includes(source.toLowerCase())
    );
  }

  const allItems = [];

  for (const feed of selectedFeeds) {
    try {
      const result = await parser.parseURL(feed.url);

      for (const item of result.items) {
        if (q && !item.title?.toLowerCase().includes(q.toLowerCase())) continue;

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

        allItems.push(article);
      }

    } catch (err) {
      console.error(`❌ Failed to parse ${feed.name}`, err.message);
    }
  }

  const sorted = allItems
    .filter(item => item.title && item.link)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, parseInt(limit));

  res.json({
    status: "ok",
    type: type || "all",
    source: source || "all",
    count: sorted.length,
    data: sorted
  });
});

app.listen(PORT, () => {
  console.log(`🔥 RSS Crawler running at http://localhost:${PORT}`);
});
