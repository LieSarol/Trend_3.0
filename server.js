import express from 'express';
import RSSParser from 'rss-parser';

const app = express();
const PORT = process.env.PORT || 3000;
const parser = new RSSParser();

app.get('/crawl', async (req, res) => {
  const { type, source, limit = 10, q, full } = req.query;

  let selectedFeeds = feeds;

  // 🔎 Filter by type (e.g. news, blogs)
  if (type) {
    selectedFeeds = selectedFeeds.filter(f => f.type === type);
  }

  // 🔎 Filter by source name (e.g. bbc, verge)
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
        // Optional keyword filtering
        if (q && !item.title?.toLowerCase().includes(q.toLowerCase())) continue;

        const article = {
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          source: feed.name
        };

        // Add extra metadata if `?full=1`
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

  // 🧹 Sort by pubDate descending
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
  console.log(`🧠 Crawler API running at http://localhost:${PORT}`);
});
