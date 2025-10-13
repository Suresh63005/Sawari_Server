const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const SubPackage = sequelize.define(
  "SubPackage",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment:
        "Descriptive name, e.g., 'Airport - Dubai City', 'Hourly - 3hr', 'Corporate Monthly - 12hr x 6 days/week'",
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Detailed description of the sub-package",
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment:
        "Indicates if the sub-package is active (true) or inactive (false)",
    },
  },
  {
    tableName: "SubPackages",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = SubPackage;
