// utils/adminHierarchy.js
const getAdminHierarchy = (currentRole) => {
  const hierarchy = {
    super_admin: ["super_admin", "admin", "executive_admin", "ride_manager"],
    admin: ["admin", "executive_admin", "ride_manager"],
    executive_admin: ["executive_admin", "ride_manager"],
    ride_manager: ["ride_manager"],
  };
  return hierarchy[currentRole] || ["ride_manager"];
};

module.exports = { getAdminHierarchy };
