const { TuskDrift } = require("@use-tusk/drift-node-sdk");

TuskDrift.initialize({
  env: process.env.NODE_ENV,
  logLevel: "debug",
});

module.exports = { TuskDrift };
