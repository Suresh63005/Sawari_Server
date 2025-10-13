const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const PackagePrice = sequelize.define(
  "PackagePrice",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated package",
    },
    sub_package_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated sub-package",
    },
    car_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated car",
    },
    base_fare: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment:
        "Base fare (price) for the package, sub-package, and car combination, e.g., 150.00",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Detailed description of the package price",
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment:
        "Indicates if the package price is active (true) or inactive (false)",
    },
  },
  {
    tableName: "PackagePrices",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = PackagePrice;
