const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Settings = sequelize.define(
  "Settings",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    weblogo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    web_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tax_rate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    about_us: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    terms_conditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privacy_policy: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    min_wallet_percentage: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
    ride_edit_time_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ride_auto_cancel_time_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  { tableName: "Settings", timestamps: true, paranoid: true }
);

module.exports = Settings;
