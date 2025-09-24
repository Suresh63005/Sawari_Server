const fs = require("fs").promises;
const path = require("path");
const express = require("express");

module.exports = async (app) => {
  try {
    const versionPath = path.join(__dirname, "../api");
    console.log(`Loading routes from: ${versionPath}`);

    const versions = await fs.readdir(versionPath, { withFileTypes: true });

    for (const versionDir of versions) {
      if (!versionDir.isDirectory()) continue;

      const version = versionDir.name;
      const versionDirPath = path.join(versionPath, version);

      const groups = await fs.readdir(versionDirPath, { withFileTypes: true });

      for (const groupDir of groups) {
        if (!groupDir.isDirectory()) continue;

        const groupName = groupDir.name;
        const groupDirPath = path.join(versionDirPath, groupName);

        const files = await fs.readdir(groupDirPath, { withFileTypes: true });

        for (const file of files) {
          if (file.isFile() && file.name.endsWith(".routes.js")) {
            try {
              const routePath = path.join(groupDirPath, file.name);
              const route = require(routePath);

              if (!(route instanceof express.Router)) {
                console.warn(`⚠️ Skipping ${file.name}: Not a valid Express router`);
                continue;
              }

              const routeName = file.name.replace(".routes.js", "");
              const routeUrl = `/api/${version}/${groupName}/${routeName}`;

              app.use(routeUrl, route);
              console.log(`✅ Registered route: ${routeUrl}`);
            } catch (err) {
              console.error(`❌ Failed to load route ${file.name}: ${err.message}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`❌ Failed to load routes: ${err.message}`);
    throw err;
  }
};
