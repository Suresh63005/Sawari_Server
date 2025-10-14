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
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    profile_pic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      allowNull: true,
    },
    license_front: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_back: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: true,
      defaultValue: "pending",
    },
    emirates_verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: true,
      defaultValue: "pending",
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
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
    availability_status: {
      type: DataTypes.ENUM("online", "offline"),
      allowNull: true,
      defaultValue: "offline",
    },
    wallet_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
      type: DataTypes.ENUM("active", "inactive", "blocked", "rejected"),
      allowNull: false,
      defaultValue: "inactive",
    },
    ride_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: { msg: "Last login must be a valid date" },
      },
    },
    social_login: {
      type: DataTypes.ENUM("google"),
      allowNull: true,
      validate: {
        isIn: {
          args: [["google"]],
          msg: "Social login must be one of:google",
        },
      },
    },
    full_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    document_check_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    credit_ride_count: {
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
