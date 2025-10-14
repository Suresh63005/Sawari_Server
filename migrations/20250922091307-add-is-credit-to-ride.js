"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Ride", "is_credit", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        "Indicates if the ride was accepted on credit due to insufficient wallet balance",
      after: "payment_status", // 👈 optional (works only in MySQL)
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Ride", "is_credit");
  },
};
