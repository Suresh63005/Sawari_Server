const Admin = require('./admin.model');
const Ride = require('./ride.model');
const Vehicle = require('./vehicle.model');
const Driver = require('./driver.model');
const Earnings = require('./earnings.model');
const PaymentReports = require('./payment-report.model');
const Permissions = require('./permissions.model');
const WalletReports = require('./wallet-report.model');


// Admin associations
Admin.hasMany(Ride, { foreignKey: 'admin_id', as: 'CreatedRides', onDelete: 'SET NULL' });
Ride.belongsTo(Admin, { foreignKey: 'admin_id', as: 'CreatorAdmin' });

Admin.hasMany(Vehicle, { foreignKey: 'verified_by', as: 'VerifiedVehicles', onDelete: 'SET NULL' });
Vehicle.belongsTo(Admin, { foreignKey: 'verified_by', as: 'VerifierAdmin' });

Admin.hasMany(Driver, { foreignKey: 'verified_by', as: 'VerifiedDrivers', onDelete: 'SET NULL' });
Driver.belongsTo(Admin, { foreignKey: 'verified_by', as: 'VerifierAdmin' });

Admin.hasMany(Permissions, { foreignKey: 'granted_by', as: 'GrantedPermissions', onDelete: 'SET NULL' });
Permissions.belongsTo(Admin, { foreignKey: 'granted_by', as: 'GrantorAdmin' });

Admin.hasMany(Permissions, { foreignKey: 'user_id', as: 'AdminPermissions', constraints: false, scope: { user_type: 'admin' } });
Permissions.belongsTo(Admin, { foreignKey: 'user_id', as: 'Admin', constraints: false, scope: { user_type: 'admin' } });

// Driver associations
Driver.hasMany(Ride, { foreignKey: 'initiated_by_driver_id', as: 'InitiatedRides', onDelete: 'SET NULL' });
Ride.belongsTo(Driver, { foreignKey: 'initiated_by_driver_id', as: 'InitiatorDriver' });

Driver.hasMany(Ride, { foreignKey: 'driver_id', as: 'AssignedRides', onDelete: 'SET NULL' });
Ride.belongsTo(Driver, { foreignKey: 'driver_id', as: 'AssignedDriver' });

Driver.hasMany(Vehicle, { foreignKey: 'driver_id', as: 'Vehicles', onDelete: 'CASCADE' });
Vehicle.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver' });

Driver.hasMany(Earnings, { foreignKey: 'driver_id', as: 'Earnings', onDelete: 'CASCADE' });
Earnings.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver' });

Driver.hasMany(PaymentReports, { foreignKey: 'driver_id', as: 'PaymentReports', onDelete: 'CASCADE' });
PaymentReports.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver' });

Driver.hasMany(WalletReports, { foreignKey: 'driver_id', as: 'WalletReports', onDelete: 'CASCADE' });
WalletReports.belongsTo(Driver, { foreignKey: 'driver_id', as: 'Driver' });

Driver.hasMany(Permissions, { foreignKey: 'user_id', as: 'DriverPermissions', constraints: false, scope: { user_type: 'driver' } });
Permissions.belongsTo(Driver, { foreignKey: 'user_id', as: 'Driver', constraints: false, scope: { user_type: 'driver' } });

// Ride associations
Ride.hasMany(Earnings, { foreignKey: 'ride_id', as: 'Earnings', onDelete: 'CASCADE' });
Earnings.belongsTo(Ride, { foreignKey: 'ride_id', as: 'Ride' });

Ride.hasMany(PaymentReports, { foreignKey: 'ride_id', as: 'PaymentReports', onDelete: 'SET NULL' });
PaymentReports.belongsTo(Ride, { foreignKey: 'ride_id', as: 'Ride' });

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