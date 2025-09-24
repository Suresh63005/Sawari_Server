'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Driver', 'credit_ride_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      after: 'document_check_count' // 👈 optional (only works in MySQL)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Driver', 'credit_ride_count');
  }
};
