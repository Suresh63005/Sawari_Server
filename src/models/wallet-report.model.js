const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const WalletReports = sequelize.define(
  "WalletReports",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transaction_type: {
      type: DataTypes.ENUM("credit", "debit"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    balance_after: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    transaction_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "reversed"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "WalletReports",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = WalletReports;
