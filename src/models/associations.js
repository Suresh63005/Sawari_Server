const Admin = require("./admin.model");
const Ride = require("./ride.model");
const DriverCar = require("./driver-cars.model");
const Driver = require("./driver.model");
const Earnings = require("./earnings.model");
const PaymentReports = require("./payment-report.model");
const Permissions = require("./permissions.model");
const WalletReports = require("./wallet-report.model");
const Review = require("./review.model");
const Car = require("./cars.model");
const Package = require("./package.model");
const SubPackage = require("./sub-package.model");
const PackagePrice = require("./packageprice.model");
const Ticket = require("./ticket.model");
// Admin associations
Admin.hasMany(Ride, {
  foreignKey: "admin_id",
  as: "CreatedRides",
  onDelete: "SET NULL",
  constraints: false,
});
Ride.belongsTo(Admin, {
  foreignKey: "admin_id",
  as: "CreatorAdmin",
  constraints: false,
});

Admin.hasMany(DriverCar, {
  foreignKey: "verified_by",
  as: "VerifiedVehicles",
  onDelete: "SET NULL",
  constraints: false,
});
DriverCar.belongsTo(Admin, {
  foreignKey: "verified_by",
  as: "VerifierAdmin",
  constraints: false,
});

Admin.hasMany(Driver, {
  foreignKey: "verified_by",
  as: "VerifiedDrivers",
  onDelete: "SET NULL",
  constraints: false,
});
Driver.belongsTo(Admin, {
  foreignKey: "verified_by",
  as: "VerifierAdmin",
  constraints: false,
});

Admin.hasMany(Permissions, {
  foreignKey: "granted_by",
  as: "GrantedPermissions",
  onDelete: "SET NULL",
  constraints: false,
});
Permissions.belongsTo(Admin, {
  foreignKey: "granted_by",
  as: "GrantorAdmin",
  constraints: false,
});

Admin.hasMany(Permissions, {
  foreignKey: "user_id",
  as: "AdminPermissions",
  constraints: false,
});
Permissions.belongsTo(Admin, {
  foreignKey: "user_id",
  as: "Admin",
  constraints: false,
});

// Driver associations
Driver.hasMany(Ride, {
  foreignKey: "initiated_by_driver_id",
  as: "InitiatedRides",
  onDelete: "SET NULL",
  constraints: false,
});
Ride.belongsTo(Driver, {
  foreignKey: "initiated_by_driver_id",
  as: "InitiatorDriver",
  constraints: false,
});

Driver.hasMany(Ride, {
  foreignKey: "driver_id",
  as: "AssignedRides",
  onDelete: "SET NULL",
  constraints: false,
});
Ride.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "AssignedDriver",
  constraints: false,
});

Driver.hasMany(DriverCar, {
  foreignKey: "driver_id",
  as: "Vehicles",
  onDelete: "CASCADE",
  constraints: false,
});
DriverCar.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "Driver",
  constraints: false,
});

Driver.hasMany(Earnings, {
  foreignKey: "driver_id",
  as: "Earnings",
  onDelete: "CASCADE",
  constraints: false,
});
Earnings.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "Driver",
  constraints: false,
});

Driver.hasMany(PaymentReports, {
  foreignKey: "driver_id",
  as: "PaymentReports",
  onDelete: "CASCADE",
  constraints: false,
});
PaymentReports.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "Driver",
  constraints: false,
});

Driver.hasMany(WalletReports, {
  foreignKey: "driver_id",
  as: "WalletReports",
  onDelete: "CASCADE",
  constraints: false,
});
WalletReports.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "Driver",
  constraints: false,
});
// ride and package associations
// Ride belongs to Package
Ride.belongsTo(Package, { foreignKey: "package_id", as: "Package" });
Package.hasMany(Ride, { foreignKey: "package_id", as: "Rides" });

// Ride belongs to SubPackage
Ride.belongsTo(SubPackage, { foreignKey: "subpackage_id", as: "SubPackage" });
SubPackage.hasMany(Ride, { foreignKey: "subpackage_id", as: "Rides" });

// Ride belongs to Car
Ride.belongsTo(Car, { foreignKey: "car_id", as: "Car" });
Car.hasMany(Ride, { foreignKey: "car_id", as: "Rides" });

// package price car associations

PackagePrice.belongsTo(Car, { foreignKey: "car_id", as: "Car" });
Car.hasMany(PackagePrice, { foreignKey: "car_id", as: "PackagePrices" });

Driver.hasMany(Review, {
  foreignKey: "driver_id",
  as: "Reviews",
  onDelete: "CASCADE",
  constraints: false,
});
Review.belongsTo(Driver, {
  foreignKey: "driver_id",
  as: "Driver",
  constraints: false,
});

Driver.hasMany(Permissions, {
  foreignKey: "user_id",
  as: "DriverPermissions",
  constraints: false,
});
Permissions.belongsTo(Driver, {
  foreignKey: "user_id",
  as: "Driver",
  constraints: false,
});

// Ride associations
Ride.hasMany(Earnings, {
  foreignKey: "ride_id",
  as: "Earnings",
  onDelete: "CASCADE",
  constraints: false,
});
Earnings.belongsTo(Ride, {
  foreignKey: "ride_id",
  as: "Ride",
  constraints: false,
});

Ride.hasMany(PaymentReports, {
  foreignKey: "ride_id",
  as: "PaymentReports",
  onDelete: "SET NULL",
  constraints: false,
});
PaymentReports.belongsTo(Ride, {
  foreignKey: "ride_id",
  as: "Ride",
  constraints: false,
});

Ride.hasMany(Review, {
  foreignKey: "ride_id",
  as: "Reviews",
  onDelete: "CASCADE",
  constraints: false,
});
Review.belongsTo(Ride, {
  foreignKey: "ride_id",
  as: "Ride",
  constraints: false,
});

// CarDetails associations
Car.hasMany(SubPackage, {
  foreignKey: "car_details_id",
  as: "PackageRates",
  onDelete: "CASCADE",
  constraints: false,
});
SubPackage.belongsTo(Car, {
  foreignKey: "car_details_id",
  as: "CarDetails",
  constraints: false,
});

// Package associations
Package.hasMany(SubPackage, {
  foreignKey: "package_id",
  as: "PackageRates",
  onDelete: "CASCADE",
  constraints: false,
});
SubPackage.belongsTo(Package, {
  foreignKey: "package_id",
  as: "Package",
  constraints: false,
});

// DriverCar associations
DriverCar.belongsTo(Car, {
  foreignKey: "car_id",
  as: "Car",
  constraints: false,
});
Car.hasMany(DriverCar, {
  foreignKey: "car_id",
  as: "DriverCars",
  onDelete: "SET NULL",
  constraints: false,
});

PackagePrice.belongsTo(Package, { foreignKey: "package_id", as: "Package" });
Package.hasMany(PackagePrice, {
  foreignKey: "package_id",
  as: "PackagePrices",
});

PackagePrice.belongsTo(SubPackage, {
  foreignKey: "sub_package_id",
  as: "SubPackage",
});
SubPackage.hasMany(PackagePrice, {
  foreignKey: "sub_package_id",
  as: "PackagePrices",
});

Ticket.belongsTo(Driver, {
  foreignKey: "raised_by",
  as: "driver",
  constraints: false,
});
Driver.hasMany(Ticket, {
  foreignKey: "raised_by",
  as: "tickets",
  onDelete: "CASCADE",
  constraints: false,
});
// Export models
module.exports = {
  Admin,
  Driver,
  DriverCar,
  Ride,
  Earnings,
  PaymentReports,
  Permissions,
  WalletReports,
  Review,
  Car,
  Package,
  SubPackage,
};
