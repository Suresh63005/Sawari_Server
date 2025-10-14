const moment = require("moment-timezone");

exports.formatToAST = (val) => {
  if (!val) return null;
  return moment(val).tz("Asia/Riyadh").format("YYYY-MM-DDTHH:mm:ss");
};
