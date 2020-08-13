const dotenv = require("dotenv").config();

const { parsed } = dotenv;

const { MONGODB_URI, PORT, JWT_SECRET, ALLOWED_URL } = process.env;

const config = Object.freeze({
  MONGODB_URI: MONGODB_URI,
  PORT: PORT,
  JWT_SECRET: JWT_SECRET,
  ALLOWED_URL: ALLOWED_URL,
});
module.exports = config;
