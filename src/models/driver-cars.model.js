const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const DriverCar = sequelize.define(
  "DriverCar",
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
    car_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    car_photos: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    rc_doc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rc_doc_back: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    insurance_doc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rc_doc_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    insurance_doc_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "rejected"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "DriverCars",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = DriverCar;
