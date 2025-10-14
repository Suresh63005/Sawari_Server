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
    ride_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Unique ride code for reference",
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID of the admin who created the ride",
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
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickup_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickup_location: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    drop_location: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    drop_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ride_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated package",
    },
    subpackage_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated sub-package",
    },
    car_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the associated car",
    },
    scheduled_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    driver_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID of the assigned driver",
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Base fare for the ride, sourced from PackagePrice",
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Tax amount for the ride",
    },
    Total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment:
        "Total cost for the ride, calculated as Price * rider_hours for 1-hour sub-packages, otherwise equals Price",
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "completed", "failed"),
      allowNull: true,
      defaultValue: "pending",
    },
    is_credit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        "Indicates if the ride was accepted on credit due to insufficient wallet balance",
    },
    accept_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pickup_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dropoff_time: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rider_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment:
        "Number of hours for the ride, applicable only for 1-hour sub-packages",
    },
  },
  {
    tableName: "Ride",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Ride;
