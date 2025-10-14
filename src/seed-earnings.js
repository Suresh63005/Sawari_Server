require("dotenv").config();
const sequelize = require("./config/db"); // Your Sequelize instance
const Earnings = require("./models/earnings.model");
const { v4: uuidv4 } = require("uuid");

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("DB Connected!");

    // Insert multiple records
    await Earnings.bulkCreate([
      {
        id: uuidv4(),
        driver_id: "bf69aeb0-40c6-4e72-89ae-8161328cbdb0",
        ride_id: "9909f52f-db97-492c-8971-0e95ef13fda1",
        amount: 500.0,
        commission: 50.0,
        percentage: 10.0,
        payment_method: "bank_transfer",
        status: "processed",
        createdAt: new Date("2025-07-10T10:00:00Z"),
        updatedAt: new Date("2025-07-10T10:00:00Z"),
      },
      {
        id: uuidv4(),
        driver_id: "bf69aeb0-40c6-4e72-89ae-8161328cbdb0",
        ride_id: "8023d5bd-4dd7-4340-ac40-e3e23e3cdf29",
        amount: 1000.0,
        commission: 100.0,
        percentage: 10.0,
        payment_method: "upi",
        status: "pending",
        createdAt: new Date("2025-07-15T14:00:00Z"),
        updatedAt: new Date("2025-07-15T14:00:00Z"),
      },
    ]);

    console.log("Seed data inserted successfully.");
  } catch (err) {
    console.error("Error seeding data:", err);
  } finally {
    await sequelize.close();
  }
}

seed();

// // My SQL Database
// require("dotenv").config();
// const { Sequelize } = require("sequelize");

// const sequelize = new Sequelize(
//   process.env.DB_NAME || "sawari",
//   process.env.DB_USER || "sawari",
//   process.env.DB_PASSWORD || "tkRhdMSyWJdymdGB",
//   {
//     host: process.env.DB_HOST || "3.109.48.226",
//     port: process.env.DB_PORT || 3306,
//     dialect: "mysql",
//     dialectModule:require('mysql2'),
//     timezone: process.env.TIMEZONE || "+05:30",
//     logging: process.env.NODE_ENV === "development" ? console.log : false,
//   }
// );

// // Test the database connection
// sequelize
//   .authenticate()
//   .then(()=> {
//     console.log(`✅ MySQL connection established.`);
//   })
//   .catch((err) => {
//     console.error(`❌ MySQL connection error:`, err);
//     process.exit(1);
//   });

// module.exports = sequelize;
