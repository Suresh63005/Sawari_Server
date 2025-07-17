const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const CarDetails = sequelize.define(
  "CarDetails",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    variant: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    car_type: {
      type: DataTypes.ENUM(
        "sedan",
        "suv",
        "hatchback",
        "luxury",
        "van",
        "other"
      ),
      allowNull: false,
    },
    fuel_type: {
      type: DataTypes.ENUM("petrol", "diesel", "electric", "hybrid"),
      allowNull: false,
    },
    transmission: {
      type: DataTypes.ENUM("manual", "automatic"),
      allowNull: false,
    },
    seating_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    luggage_capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    price_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "CarDetails",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = CarDetails;
