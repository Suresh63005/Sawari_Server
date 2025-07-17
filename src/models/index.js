// src/models/index.js
const sequelize = require("../config/db");
const fs = require("fs");
const path = require("path");

const basename = path.basename(__filename);
const models = {};

// Dynamically import all model files
fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith(".js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, file));
    models[model.name] = model;
  });

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = require("sequelize");

module.exports = models;
