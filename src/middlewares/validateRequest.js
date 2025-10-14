// const validateRequest = (schema) => {
//     return (req, res, next) => {
//         const { error } = schema.validate(req.body);
//         if (error) {
//             return res.status(400).json({ success: false, message: error.details[0].message });
//         }
//         next();
//     };
// };
// module.exports = {
//     validateRequest
// };

const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const data = source === "params" ? req.params : req.body;
    const { error } = schema.validate(data);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    next();
  };
};

module.exports = {
  validateRequest,
};
