const jwt = require("jsonwebtoken");

const generateToken = async (driverId) => {
  return jwt.sign({ id: driverId }, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
};
