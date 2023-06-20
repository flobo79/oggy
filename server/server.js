const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const { parseStringPromise } = require("xml2js");
const visitedUrls = new Set(); // T
const setting = require("../settings.js"); // o track visited URLs and avoid duplicates

let currentCount = 0;
let maxCount = 10;

// Define a route for scraping
const publicRoute = (router) => {
  // Define a route for scraping
  router.get("/scrape", async (req, res) => {
    currentCount = 0;
    visitedUrls.clear();
    try {
      const url = req.query.url || false; // Replace with the website's URL
      const sitemap = req.query.sitemap || false; // Replace with the website's URL

      if (!url && !sitemap) {
        throw "no url or sitemap.xml provided";
      }

      // try to fetch the sitemap from the robots.txt
      //const sitemapUrl = await getSitemapUrl(url);
      let list = [];

      if (sitemap) {
        await scrapeWebsiteUsingSitemap(sitemap, list);
      } else {
        await scrapeWebsite(url, list);
      }
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: "An error occurred", error: error });
    }
  });
};

// Helper function to get the URL of the sitemap.xml file
async function getSitemapUrl(url) {
  const robotsTxtUrl = `${url}/robots.txt`;
  try {
    const response = await axios.get(robotsTxtUrl);
    const robotsTxtContent = response.data;

    // Extract sitemap URL from robots.txt
    const regex = /sitemap:\s*([^\s]+)/gi;
    const match = regex.exec(robotsTxtContent);

    if (match && match[1]) {
      return match[1];
    }
  } catch (error) {
    console.error(`Error fetching robots.txt: ${error}`);
  }

  return null;
}

// Helper function to scrape the website using the sitemap
async function scrapeWebsiteUsingSitemap(sitemapUrl, list) {
  const sitemap = await parseSitemap(sitemapUrl);
  // Recursively scrape each URL in the sitemap

  let promises = [];
  for (var i = 0; i <= sitemap.length; i++) {
    promises.push(scrapeWebsite(sitemap[i], list, false));
    currentCount++;
    if (currentCount >= maxCount) {
      break;
    }
  }

  // Wait for all recursive scraping promises to resolve
  return Promise.allSettled(promises);
  /*
    let subTrees = await Promise.allSettled(promises);

    // Attach the sub-trees to the current tree
    subTrees.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const subTree = result.value;
        if (subTree) {
          // tree[sitemap[index]] = subTree;
        }
      } else {
        console.error(`Error scraping ${sitemap[index]}: ${result.reason}`);
      }
    });

    return tree;

     */
}

// Helper function to parse the sitemap XML
const parseSitemap = async (url) => {
  // get XML
  let xmlData = await axios.get(url);
  let sitemap = await parseStringPromise(xmlData.data);

  // is this sitemap a sitemapindex?
  if (sitemap.sitemapindex) {
    const xmlData = await axios.get(sitemap.sitemapindex.sitemap[0].loc[0]);
    sitemap = await parseStringPromise(xmlData.data);
  }
  return sitemap.urlset.url.map((url) => url.loc[0]);
};

// Helper function to scrape the website
async function scrapeWebsite(url, list, followLinks = true) {
  if (visitedUrls.has(url)) {
    console.log("skipping, url already in index");
    return null; // Skip if URL has already been visited
  }
  console.log("scraping site ", url);
  const html = await axios.get(url);
  const $ = cheerio.load(html.data);
  const metadata = extractMetadata($);
  const images = []; //extractImages(url, $);
  const text = ""; //extractText($);
  const internalLinks = findInternalLinks(url, $);

  // add site to the list
  let item = getScore({ url, metadata, images, text });
  console.log(item);
  list.push(item);
  console.log(list);

  if (followLinks) {
    // traverse all child sites
    let promises = [];
    for (let i = 0; i < internalLinks.length; i++) {
      promises.push(scrapeWebsite(internalLinks[i], list));
      currentCount += 1;
      if (currentCount > maxCount) {
        break;
      }
    }

    // Wait for all recursive scraping promises to resolve
    return Promise.allSettled(promises).then((results) => {
      // Attach the sub-trees to the current tree
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const subTree = result.value;
          if (subTree) {
            //list.push(subTree);
          }
        } else {
          console.error(
            `Error scraping ${internalLinks[index]}: ${result.reason}`
          );
        }
      });
    });
  } else {
    console.log(list);
    return Promise.resolve(list);
  }
}

// Helper function to extract meta tags (including OpenGraph tags)
function extractMetadata($) {
  const metadata = {};

  $("head meta").each((index, element) => {
    const name = $(element).attr("name") || $(element).attr("property");
    const content = $(element).attr("content");
    if (name && content) {
      metadata[name] = content;
    }
  });

  return metadata;
}

// Helper function to extract images
function extractImages(baseUrl, $) {
  const images = [];

  $("img").each((index, element) => {
    const src = $(element).attr("src");
    if (src) {
      const absoluteUrl = new URL(src, baseUrl).href;
      images.push(absoluteUrl);
    }
  });

  return images;
}

// Helper function to extract text
function extractText($) {
  return $("body")
    .text()
    .trim()
    .replace(/\n+|\s+|\t+/g, " ");
}

// Helper function to find internal links
function findInternalLinks(baseUrl, $) {
  const internalLinks = [];

  $("a").each((index, element) => {
    const href = $(element).attr("href");
    if (href) {
      const absoluteUrl = new URL(href, baseUrl).href;
      if (isSameDomain(baseUrl, absoluteUrl) && !isAnchor(absoluteUrl)) {
        internalLinks.push(absoluteUrl);
      }
    }
  });

  return internalLinks;
}

// Helper function to check if two URLs have the same domain
const isSameDomain = (url1, url2) => {
  const domain1 = new URL(url1).hostname;
  const domain2 = new URL(url2).hostname;
  return domain1 === domain2;
};

const isAnchor = (url) => {
  return !!new URL(url).hash;
};

const getScore = (item) => {
  item.scores = {};
  item.scoreMax = 0;
  item.score = 0;
  item.scoreGraph = "";

  const getScores = {
    "og:title": (e) => (e.length < 10 ? 0.5 : e.length > 100 ? 0.5 : 1),
    "og:image": (e) => (e ? 1 : 0),
    "og:description": (e) => (e.length < 50 ? 0.5 : e.length > 300 ? 0.5 : 1),
    "og:type": (e) => (e ? 1 : 0),
    "og:url": (e) => (e ? 1 : 0),
    "og:site_name": (e) => (e ? 1 : 0),
    "twitter:title": (e) => (e ? 1 : 0),
    "twitter:image": (e) => (e ? 1 : 0),
    "twitter:description": (e) => (e ? 1 : 0),
    "fb:app_id": (e) => (e ? 1 : 0),
    "fb:pages": (e) => (e ? 1 : 0),
  };

  Object.keys(getScores).forEach((key) => {
    item.scoreMax += 1;
    item.scores[key] = getScores[key](item.metadata[key]);
    item.score += item.scores[key];
  });

  item.scoreGraph =
    "#".repeat(item.score) + "-".repeat(item.scoreMax - item.score);

  return item;
};

const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const { set } = require("express/lib/application");

const app = express();
const router = express.Router();
app.disable("etag");

app.use(bodyParser.json());
app.use(publicRoute);

app.use(
  compression({
    level: 9,
    filter: (req, res) => {
      const header = `${res.getHeader("Content-Type")}`; // as string
      return /json|text|javascript|css|xml|csv|html/.test(header);
    },
  })
);

app.use(express.static(__dirname, { etag: true }), (req, res) => {
  res.redirect("localhost", setting.node.port);
  res.sendFile(__dirname + "/blank.html");
});

const start = async () => {
  try {
    app.listen(setting.node.port, async () => {
      console.log(`Server started on port ${setting.node.port}`.green);
    });
  } catch (error) {
    if (error !== null) {
      console.log(error, JSON.stringify(error));
    }
    process.nextTick(start); // if mysql error then next 5 sec wait
  }
};

start();
