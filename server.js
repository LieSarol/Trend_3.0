import express from 'express';
import RSSParser from 'rss-parser';

const app = express();
const PORT = process.env.PORT || 3000;

const parser = new RSSParser();

// You can later turn this into a DB or allow user input
const feeds = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "BBC", url: "http://feeds.bbci.co.uk/news/rss.xml" },
  { name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
];

app.get('/crawl', async (req, res) => {
  const { limit = 10, source, q } = req.query;

  let selectedFeeds = feeds;
  if (source) {
    selectedFeeds = feeds.filter(f =>
      f.name.toLowerCase().includes(source.toLowerCase())
    );
  }

  const allItems = [];

  for (const feed of selectedFeeds) {
    try {
      const result = await parser.parseURL(feed.url);
      const items = result.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        source: feed.name
      }));

      allItems.push(...items);
    } catch (err) {
      console.error(`❌ Failed to parse ${feed.name}`, err.message);
    }
  }

  // Sort by date descending
  const sorted = allItems
    .filter(item => item.title && item.link)
    .filter(item =>
      q ? item.title.toLowerCase().includes(q.toLowerCase()) : true
    )
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, parseInt(limit));

  res.json({
    status: "ok",
    count: sorted.length,
    data: sorted
  });
});

app.listen(PORT, () => {
  console.log(`📰 RSS Crawler Server running at http://localhost:${PORT}`);
});
