require("module-alias/register"); // this is required for dynamic imports to work
const app = require("./src/app");
// const PORT = process.env.PORT || 4445;

app.get("/", (req, res) => {
  res.send("Server is Running");
});
