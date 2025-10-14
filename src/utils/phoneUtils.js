const normalizePhone = async (phone) => {
  phone = phone.trim();
  if (!phone.startsWith("+971")) {
    phone = phone.replace(/^(\+|0)*/, "");
    phone = "+971" + phone;
  }
  return phone;
};
module.exports = {
  normalizePhone,
};
