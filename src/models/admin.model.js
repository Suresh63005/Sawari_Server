module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    phone: DataTypes.STRING,
    role: DataTypes.ENUM('super_admin', 'admin', 'executive_admin', 'hotel_admin'),
    password: DataTypes.STRING,
    status: DataTypes.ENUM('active', 'inactive', 'blocked'),
    last_login: DataTypes.DATE,
  }, {
    tableName: 'admins',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return Admin;
};
