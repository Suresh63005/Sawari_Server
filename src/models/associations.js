const Admin = require('./admin.model');
const Ride = require('./ride.model');
const Vehicle = require('./vehicle.model');
const Driver = require('./driver.model');
const Earnings = require('./earnings.model');
const PaymentReports = require('./payment-report.model');
const Permissions = require('./permissions.model');
const WalletReports = require('./wallet-report.model');
const Review = require('./review.model');
const CarDetails = require('./car-details.model');
const CarPackageRate = require('./car-package-rate.model');
const Package = require('./package.model');


// Admin associations
Admin.hasMany(Ride, { foreignKey: 'admin_id', as: 'CreatedRides', onDelete: 'SET NULL', constraints: false });
Ride.belongsTo(Admin, { foreignKey: 'admin_id', as: 'CreatorAdmin', constraints: false });

Admin.hasMany(Vehicle, { foreignKey: 'verified_by', as: 'VerifiedVehicles', onDelete: 'SET NULL', constraints: false });
Vehicle.belongsTo(Admin, { foreignKey: 'verified_by', as: 'VerifierAdmin', constraints: false });

Admin.hasMany(Driver, { foreignKey: 'verified_by', as: 'VerifiedDrivers', onDelete: 'SET NULL', constraints: false });
Driver.belongsTo(Admin, { foreignKey: 'verified_by', as: 'VerifierAdmin', constraints: false });

Admin.hasMany(Permissions, { foreignKey: 'granted_by', as: 'GrantedPermissions', onDelete: 'SET NULL', constraints: false });
Permissions.belongsTo(Admin, { foreignKey: 'granted_by', as: 'GrantorAdmin', constraints: false });

Admin.hasMany(Permissions, { foreignKey: 'user_id', as: 'AdminPermissions', constraints: false, scope: { user_type: 'admin' } });
Permissions.belongsTo(Admin, { foreignKey: 'user_id', as: 'Admin', constraints: false, scope: { user_type: 'admin' } });

// Driver associations
Driver.hasMany(Ride, { foreignKey: 'initiated_by_driver_id', as: 'InitiatedRides', onDelete: 'SET NULL', constraints: false });
Ride.belongsTo(Driver, { foreignKey: 'initiated_by_driver_id', as: 'InitiatorDriver', constraints: false });

Driver.hasMany(Ride, { foreignKey: 'driver_id', as: 'AssignedRides', onDelete: 'SET NULL', constraints: false });
Ride.belongsTo(Driver, { foreignKey: 'driver_id', as: 'AssignedDriver', constraints: false });

Driver.hasMany(Vehicle, { foreignKey: 'driver_id', as: 'Vehicles', onDelete: 'CASCADE', constraints: false });
Vehicle.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver', constraints: false });

Driver.hasMany(Earnings, { foreignKey: 'driver_id', as: 'Earnings', onDelete: 'CASCADE', constraints: false });
Earnings.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver', constraints: false });

Driver.hasMany(PaymentReports, { foreignKey: 'driver_id', as: 'PaymentReports', onDelete: 'CASCADE', constraints: false });
PaymentReports.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver', constraints: false });

Driver.hasMany(WalletReports, { foreignKey: 'driver_id', as: 'WalletReports', onDelete: 'CASCADE', constraints: false });
WalletReports.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver', constraints: false });

Driver.hasMany(Review, { foreignKey: 'driver_id', as: 'Reviews', onDelete: 'CASCADE', constraints: false });
Review.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver', constraints: false });

Driver.hasMany(Permissions, { foreignKey: 'user_id', as: 'DriverPermissions', constraints: false, scope: { user_type: 'driver' } });
Permissions.belongsTo(Driver, { foreignKey: 'user_id', as: 'Driver', constraints: false, scope: { user_type: 'driver' } });

// Ride associations
Ride.hasMany(Earnings, { foreignKey: 'ride_id', as: 'Earnings', onDelete: 'CASCADE', constraints: false });
Earnings.belongsTo(Ride, { foreignKey: 'ride_id', as: 'Ride', constraints: false });

Ride.hasMany(PaymentReports, { foreignKey: 'ride_id', as: 'PaymentReports', onDelete: 'SET NULL', constraints: false });
PaymentReports.belongsTo(Ride, { foreignKey: 'ride_id', as: 'Ride', constraints: false });

Ride.hasMany(Review, { foreignKey: 'ride_id', as: 'Reviews', onDelete: 'CASCADE', constraints: false });
Review.belongsTo(Ride, { foreignKey: 'ride_id', as: 'Ride', constraints: false });

// CarDetails associations
CarDetails.hasMany(CarPackageRate, { foreignKey: 'car_details_id', as: 'PackageRates', onDelete: 'CASCADE', constraints: false });
CarPackageRate.belongsTo(CarDetails, { foreignKey: 'car_details_id', as: 'CarDetails', constraints: false });

// Package associations
Package.hasMany(CarPackageRate, { foreignKey: 'package_id', as: 'PackageRates', onDelete: 'CASCADE', constraints: false });
CarPackageRate.belongsTo(Package, { foreignKey: 'package_id', as: 'Package', constraints: false });
// Export models
module.exports = {
  Admin,
  Driver,
  Vehicle,
  Ride,
  Earnings,
  PaymentReports,
  Permissions,
  WalletReports,
};