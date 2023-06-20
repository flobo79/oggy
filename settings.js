// @ts-check
require("dotenv").config({ debug: true });

const path = require("path");
const _domainUrl = process.env.NODE_ENV_DOMAIN_URL || "http://localhost:8080";

const setting = {
  path: {
    dist:
      process.env.NODE_ENV_PATH_DIST || path.resolve(__dirname, "../../dist/"),
    url: _domainUrl,
  },
  jwt: {
    secret: process.env.NODE_ENV_JWT_SECRET || "", // => secret-oggy-key
    tokenLifetime: "1h",
    tokenChangetime: 300, // a new token
  },
  node: {
    port: process.env.NODE_ENV_PORT || 8080,
  },
  db: {
    type: "mariadb",
    query: { pool: true },
    host: process.env.NODE_ENV_MYSQL_HOST || "localhost",
    database: process.env.NODE_ENV_MYSQL_DATABASE || "oggy",
    user: process.env.NODE_ENV_MYSQL_USER || "root",
    password: process.env.NODE_ENV_MYSQL_PASSWORD || "",
    port: +(process.env.NODE_ENV_MYSQL_PORT || 3306),
    timezone: process.env.NODE_ENV_MYSQL_TIMEZONE || "Etc/GMT0",
    logging: process.env.NODE_ENV_MYSQL_LOGGING || console.log,
  },
  job: {
    site: {
      timeSecond: 15,
      maxConnection: 20, // max connection
      limitSites: 25, // get data for one client from mysql
      limitLinks: 1000,
    },
  },
  stripe: {
    successUrl:
      process.env.NODE_ENV_STRIPE_SUCCESSURL ||
      `${process.env.NODE_ENV_DOMAIN_URL || _domainUrl}/plan/retrieve`,
    cancelUrl:
      process.env.NODE_ENV_STRIPE_CANCELURL ||
      `${process.env.NODE_ENV_DOMAIN_URL || _domainUrl}/plan`,
    imageUrl:
      process.env.NODE_ENV_STRIPE_IMAGEURL ||
      `${process.env.NODE_ENV_DOMAIN_URL || _domainUrl}/favicon-96x96.png`,
    secret: process.env.NODE_ENV_STRIPE_SECRET || "",
  },
  mail: {
    transport: {
      service: process.env.NODE_ENV_MAIL_SERVICE || "gmail",
      host: process.env.NODE_ENV_MAIL_HOST,
      port: process.env.NODE_ENV_MAIL_PORT && +process.env.NODE_ENV_MAIL_PORT,
      auth: {
        user: process.env.NODE_ENV_MAIL_USER || "d.krzeminski.mm@gmail.com",
        pass: process.env.NODE_ENV_MAIL_PASSWORD || "zzaptpacxabmjzix",
      },
    },
    url: process.env.NODE_ENV_MAIL_URL || _domainUrl,
    from: process.env.NODE_ENV_MAIL_FROM || "d.krzeminski.mm@gmail.com",
    bcc: process.env.NODE_ENV_MAIL_BCC || "d.krzeminski@keeen.net",
    // toreply: process.env.NODE_ENV_MAIL_NOREPLY || 'noreply@oggy.keeen.com' // later
  },
};

// console.log('process.env.NODE_ENV'.yellow, process.env.NODE_ENV);
// console.log('setting: ', JSON.stringify(setting, null, 4));

module.exports = setting;
