"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Settings", "min_wallet_percentage", {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
      after: "tax_rate", // 👈 optional (only works in MySQL)
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Settings", "min_wallet_percentage");
  },
};
