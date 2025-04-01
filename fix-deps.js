const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Checking and fixing dependencies for ES module issues...");

// Packages that might need to be installed or reinstalled
const packagesToCheck = [
  "react",
  "react-dom",
  "react-markdown",
  "react-syntax-highlighter",
  "prop-types",
];

try {
  console.log("Installing additional required dependencies...");
  execSync("npm install --save prop-types", { stdio: "inherit" });

  // Fix potential issues with react-markdown
  console.log("Reinstalling react-markdown...");
  execSync("npm uninstall react-markdown", { stdio: "inherit" });
  execSync("npm install --save react-markdown@8.0.7", { stdio: "inherit" });

  // Force reinstall of React to ensure proper imports
  console.log("Reinstalling React...");
  execSync("npm install --save react@latest react-dom@latest", {
    stdio: "inherit",
  });

  console.log("Dependencies fixed successfully! Try running your app now.");
} catch (error) {
  console.error("Error fixing dependencies:", error.message);
  console.log("\nPlease try manually running these commands:");
  console.log("npm install --save prop-types");
  console.log("npm uninstall react-markdown");
  console.log("npm install --save react-markdown@8.0.7");
  console.log("npm install --save react@latest react-dom@latest");
}
