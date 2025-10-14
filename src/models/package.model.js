const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Package = sequelize.define(
  "Package",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment:
        "Package type name, e.g., 'airport', 'hourly', 'full_day', 'corporate'",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        "Detailed description of the package, e.g., 'Airport transfer from Dubai Airport to Dubai City'",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
      comment: "Status of the package, either 'active' or 'inactive'",
    },
  },
  { tableName: "Packages", timestamps: true, paranoid: true }
);

module.exports = Package;
