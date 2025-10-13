const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

let sequelize;

module.exports.connect = async () => {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  });

  const models = {};

  // Load all model files
  fs.readdirSync(path.join(__dirname, "../src/models"))
    .filter((file) => file !== "index.js" && file.endsWith(".js"))
    .forEach((file) => {
      const model = require(path.join(__dirname, "../src/models", file));
      if (model && model.name) {
        models[model.name] = model;
      }
    });

  // Import associations.js to apply associations (no function call needed)
  require("../src/models/associations");

  await sequelize.sync({ force: true });
};

module.exports.closeDatabase = async () => {
  if (sequelize) await sequelize.close();
};

module.exports.clearDatabase = async () => {
  const models = Object.values(sequelize.models);
  await Promise.all(
    models.map((model) => model.destroy({ truncate: true, cascade: true }))
  );
};

beforeAll(async () => {
  await module.exports.connect();
});

afterEach(async () => {
  await module.exports.clearDatabase();
});

afterAll(async () => {
  await module.exports.closeDatabase();
});
