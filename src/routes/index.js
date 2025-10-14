const fs = require("fs").promises;
const path = require("path");
const express = require("express");

module.exports = async (app) => {
  const isTestMode = process.env.NODE_ENV === "test";
  try {
    const versionPath = path.join(__dirname, "../api");
    if (!isTestMode) console.log(`Loading routes from: ${versionPath}`);

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
                if (!isTestMode)
                  console.warn(
                    `⚠️ Skipping ${file.name}: Not a valid Express router`
                  );
                continue;
              }

              const routeName = file.name.replace(".routes.js", "");
              const routeUrl = `/api/${version}/${groupName}/${routeName}`;

              app.use(routeUrl, route);
              if (!isTestMode) console.log(`✅ Registered route: ${routeUrl}`);
            } catch (err) {
              if (!isTestMode)
                console.error(
                  `❌ Failed to load route ${file.name}: ${err.message}`
                );
            }
          }
        }
      }
    }
  } catch (err) {
    if (!isTestMode) console.error(`❌ Failed to load routes: ${err.message}`);
    throw err;
  }
};

// const fs = require("fs").promises;
// const path = require("path");
// const express = require("express"); // Ensure express is imported to check for router type

// module.exports = async (app) => {
//   const { API_VERSION } = require("../api/api");
//   console.log(`🌍 API Version: ${API_VERSION}`); // Debugging the API version

//   const versionDirPath = path.join(__dirname, `../api/${API_VERSION.toLowerCase()}`);
//   console.log(`📦 Loading routes from: ${versionDirPath}`);

//   try {
//     // Read all files and directories inside the version folder (e.g., v1)
//     const groups = await fs.readdir(versionDirPath, { withFileTypes: true });
//     // console.log("🔍 Groups found:", groups.map(g => g.name)); // List of group directories

//     for (const group of groups) {
//       if (group.isDirectory()) {
//         const groupName = group.name; // e.g., 'admin' or 'mobile'
//         // console.log(`🏷️ Group Name: ${groupName}`);

//         const groupDirPath = path.join(versionDirPath, groupName);
//         console.log(`🛠️ Group Directory Path: ${groupDirPath}`);

//         // Read all files in the group folder (admin, mobile, etc.)
//         const files = await fs.readdir(groupDirPath, { withFileTypes: true });
//         // console.log(`🗂️ Files in ${groupName}:`, files.map(f => f.name));

//         for (const file of files) {
//           if (file.isFile() && file.name.endsWith(".routes.js")) {
//             const routePath = path.join(groupDirPath, file.name);
//             // console.log(`📑 Found Route File: ${routePath}`);

//             try {
//               const route = require(routePath);
//               // console.log(`📥 Required route from: ${routePath}`);

//               // Check if the route is a valid Express Router
//               if (!(route instanceof express.Router)) {
//                 console.warn(`⚠️ Skipping ${file.name}: Not a valid Express router`);
//                 continue; // Skip if it's not a valid router
//               }

//               // Construct the route URL (e.g., /api/v1/admin/user)
//               const routeName = file.name.replace(".routes.js", "");
//               const routeUrl = `/api/${API_VERSION.toLowerCase()}/${groupName}/${routeName}`;
//               // console.log(`📍 Registering Route: ${routeUrl}`);

//               app.use(routeUrl, route); // Register the route with the URL
//               console.log(`✅ Registered Route: ${routeUrl}`);
//             } catch (err) {
//               console.error(`❌ Failed to load route ${file.name}: ${err.message}`);
//               console.error("Stack Trace:", err.stack); // Log full stack trace for debugging
//             }
//           } else {
//             console.log(`❌ Skipping Non-Route File: ${file.name}`);
//           }
//         }
//       } else {
//         console.log(`❌ Skipping Non-Directory: ${group.name}`);
//       }
//     }
//   } catch (err) {
//     console.error(`❌ Failed to load routes: ${err.message}`);
//     console.error("Stack Trace:", err.stack); // Full error trace to debug issues
//   }
// };
