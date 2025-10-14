const sequelize = require("../src/config/db");

module.exports = async () => {
  console.log("Closing Sequelize connection");
  await sequelize.close();
};
