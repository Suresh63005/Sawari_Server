const Driver = require("../../models/driver.model");
const jwt = require("jsonwebtoken");

const isAuthenticated = async (req, res, next) => {
  try {
    // Extract the token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No token provided" });
    }

    // Verify the token using your JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Find driver by ID from the token payload
    const driver = await Driver.findByPk(decoded.id);
    if (!driver) {
      console.log("Driver not found for ID:", decoded.id);
      return res
        .status(401)
        .json({ message: "Invalid or blocked account - Driver not found" });
    }

    // Check if driver exists and is not blocked
    if (!driver || driver.status === "blocked") {
      return res.status(401).json({ message: "Invalid or blocked account" });
    }

    // Attach driver to request for further use in routes
    req.driver = driver;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = { isAuthenticated };
