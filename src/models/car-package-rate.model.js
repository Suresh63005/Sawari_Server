const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const CarPackageRate = sequelize.define("CarPackageRate", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  car_details_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "CarDetails",
      key: "id",
    },
  },
  package_type: {
    type: DataTypes.ENUM("airport", "hourly", "full_day", "corporate"),
    allowNull: false,
  },
  sub_package: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Descriptive name, e.g., 'Airport - Dubai City', 'Hourly - 3hr', 'Corporate Monthly - 12hr x 6 days/week'",
  },
  hours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Number of hours for hourly packages, e.g., 3, 10",
  },
  days_per_month: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Number of days per month for corporate packages, e.g., 2 or 22",
  },
  hours_per_day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Hours per day for corporate packages, e.g., 10 or 12",
  },
  base_fare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Cost per hour for hourly packages or total cost for other packages, e.g., 120.00 for hourly, 20000.00 for corporate",
  },
}, {
  tableName: "CarPackageRates",
  timestamps: true,
  paranoid: true,
});

module.exports = CarPackageRate;