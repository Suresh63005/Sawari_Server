const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Permissions = sequelize.define(
  "Permissions",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dashboard_access: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_drivers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_vehicles: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_ride: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_earnings: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_push_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_support_tickets: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_fleet: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    manage_reports: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    granted_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { tableName: "Permissions", timestamps: true, paranoid: true }
);

module.exports = Permissions;
