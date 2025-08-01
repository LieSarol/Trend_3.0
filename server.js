import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

const sources = [
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/",
    selector: "article a",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/",
    selector: "h2.c-entry-box--compact__title a",
  },
];

async function crawl() {
  const articles = [];

  for (const site of sources) {
    try {
      const res = await axios.get(site.url);
      const $ = cheerio.load(res.data);

      $(site.selector).each((_, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr("href");

        if (title && link) {
          articles.push({ title, link, source: site.name });
        }
      });
    } catch (err) {
      console.error(`❌ Error on ${site.name}:`, err.message);
    }
  }

  return articles;
}

// API endpoint
app.get('/crawl', async (req, res) => {
  const articles = await crawl();
  res.json({
    status: "ok",
    count: articles.length,
    data: articles
  });
});

// Home
app.get('/', (req, res) => {
  res.send(`
    <h1>🕷️ NodeJS Crawler</h1>
    <p>Visit <a href="/crawl">/crawl</a> to trigger crawl and see raw logs.</p>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
