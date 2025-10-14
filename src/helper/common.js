const isValidStatus = (status) => {
  const validStatuses = ["online", "offline"];
  return validStatuses.includes(status);
};

const isRideStatus = (status, validStatuses) => {
  return validStatuses.includes(status);
};

const isValidPriority = (priority) => {
  const validPriority = ["low", "medium", "high", "urgent"];
  return validPriority.includes(priority);
};

module.exports = {
  isValidStatus,
  isRideStatus,
  isValidPriority,
};
