const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Earnings = sequelize.define(
  "Earnings",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ride_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("bank_transfer", "upi"),
    },
    status: {
      type: DataTypes.ENUM("pending", "processed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "Earnings",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Earnings;
