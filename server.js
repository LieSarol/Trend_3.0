import { serve } from "bun";
import axios from "axios";
import cheerio from "cheerio";

// 🔍 Target sites to crawl
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

// 🕷️ The crawler function
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

// 🚀 The API server
serve({
  port: 3000,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/crawl") {
      const articles = await crawl();
      return new Response(JSON.stringify({
        status: "ok",
        count: articles.length,
        data: articles
      }, null, 2), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    return new Response(`
      <h1>🕷️ NodeJS-Style Crawler Server</h1>
      <p>Go to <a href="/crawl">/crawl</a> to fetch latest articles in raw JSON.</p>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  },
});
