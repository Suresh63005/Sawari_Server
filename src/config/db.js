// My SQL Database
require("dotenv").config();
const { Sequelize } = require("sequelize");
const config = require("../config/config");

// Pick environment (default = development)
const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone:process.env.TIMEZONE || "+05:30",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

// const sequelize = new Sequelize(
//   process.env.DB_NAME,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     dialect: "mysql",
//     dialectModule:require('mysql2'),
//     timezone: process.env.TIMEZONE || "+05:30",
//     logging: process.env.NODE_ENV === "development" ? console.log : false,
//   }
// );

// Test the database connection
sequelize
  .authenticate()
  .then(()=> {
    console.log(`✅ MySQL connection established.`);
  })
  .catch((err) => {
    console.error(`❌ MySQL connection error:`, err);
    process.exit(1);
  });

module.exports = sequelize;
