"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Settings", "ride_auto_cancel_time_limit", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 10,
      after: "ride_edit_time_limit",
      comment:
        "Maximum time (in minutes) after which a ride will auto-cancel if not accepted",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "Settings",
      "ride_auto_cancel_time_limit"
    );
  },
};
