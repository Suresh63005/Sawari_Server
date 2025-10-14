"se strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Ride", "scheduled_time", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "accept_time", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "pickup_time", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "dropoff_time", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // rollback: convert back to DATE if needed
    await queryInterface.changeColumn("Ride", "scheduled_time", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "accept_time", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "pickup_time", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.changeColumn("Ride", "dropoff_time", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
