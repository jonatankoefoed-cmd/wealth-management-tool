#!/usr/bin/env node

(function enforceNodeVersion() {
  var minMajor = 20;
  var version = (process.versions && process.versions.node) || "";
  var major = parseInt(version.split(".")[0], 10);

  if (!major || major < minMajor) {
    console.error("Node.js " + minMajor + "+ is required.");
    console.error("Current runtime: " + process.execPath + " (" + version + ")");
    console.error("Use Node 20 before running project scripts.");
    console.error("");
    console.error("Example (local shell):");
    console.error("PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run <script>");
    process.exit(1);
  }
})();
