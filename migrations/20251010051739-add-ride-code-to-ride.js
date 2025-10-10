"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Ride", "ride_code", {
      type: Sequelize.STRING(10),
      allowNull: true,
      after: "id", // ✅ Places it right after 'id'
      comment: "Unique ride code for reference",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Ride", "ride_code");
  },
};
