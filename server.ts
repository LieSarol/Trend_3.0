import { serve } from "bun";
import axios from "axios";
import * as cheerio from "cheerio";

// Sources you wanna crawl
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

// Our thicc crawler boi
const crawl = async () => {
  const articles: {
    title: string;
    link: string;
    source: string;
  }[] = [];

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
      console.error(`❌ Error on ${site.name}:`, err);
    }
  }

  return articles;
};

// Let’s serve this beast
serve({
  port: 3000,
  fetch: async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/crawl") {
      const data = await crawl();
      return new Response(JSON.stringify({
        status: "ok",
        count: data.length,
        data
      }, null, 2), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Default homepage
    return new Response(`
      <h1>🕷️ Crawler API</h1>
      <p>Hit <a href="/crawl">/crawl</a> to run it and get raw JSON logs.</p>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  },
});
