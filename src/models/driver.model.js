const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Driver = sequelize.define(
  "Driver",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    emirates_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    emirates_doc_front: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emirates_doc_back: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    one_signal_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    license_front: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    license_back: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    license_verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    emirates_verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reason:{
        type:DataTypes.STRING,
        allowNull:true,
    },
    verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    availability_status: {
      type: DataTypes.ENUM("online", "offline"),
      allowNull: false,
      defaultValue: "offline",
    },
    wallet_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    ride_request: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
    system_alerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
    earning_updates: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "blocked"),
      allowNull: false,
      defaultValue: "active",
    },
    ride_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    tableName: "Driver",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Driver;
