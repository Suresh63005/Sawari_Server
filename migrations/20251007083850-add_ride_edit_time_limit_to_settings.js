"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Settings", "ride_edit_time_limit", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 15,
      after: "min_wallet_percentage",
      comment:
        "Maximum time (in minutes) allowed for editing a ride after booking",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Settings", "ride_edit_time_limit");
  },
};
