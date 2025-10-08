"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Ride", "ride_code", {
      type: Sequelize.STRING(10),
      allowNull: true, // temporarily nullable for existing rows
      unique: true,
      comment: "Unique 6-digit ride identifier (e.g., RIDE123456)",
      after: "id",
    });

    // If you want later, you can make it non-nullable after populating new rows
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Ride", "ride_code");
  },
};
