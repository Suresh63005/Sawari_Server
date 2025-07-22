const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Ride = sequelize.define(
  "Ride",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    initiated_by_driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Set only if the ride was initiated by a driver",
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email:{
      type:DataTypes.STRING,
      allowNull:true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickup_address:{
      type:DataTypes.STRING,
      allowNull:true
    },
    pickup_location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    drop_location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ride_date:{
      type:DataTypes.DATE,
      allowNull:true
    },
    car_brand:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    car_model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scheduled_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "on-route",
        "completed",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    ride_type: {
      type: DataTypes.ENUM(
        "hourly",
        "weekly",
        "monthly",
        "airport",
        "local",
        "outstation"
      ),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    distance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estimated_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    actual_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      allowNull: true,
    },
    pickup_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dropoff_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Ride",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Ride;
