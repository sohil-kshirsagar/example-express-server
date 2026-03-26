const { TuskDrift } = require("@use-tusk/drift-node-sdk");

TuskDrift.initialize({
  env: process.env.NODE_ENV,
  logLevel: "debug",
  apiKey: process.env.TUSK_API_KEY,
});

module.exports = { TuskDrift };
