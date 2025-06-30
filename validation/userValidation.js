const Joi = require("joi");

// ✅ Only allow PDF, JPEG, JPG for certificate documents
const certificateFilePattern =
  /^data:(application\/pdf|image\/jpeg|image\/jpg);base64,/;

const registerValidation = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),

  role: Joi.string().valid("student", "parent", "teacher").required(),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid 10-digit Indian number.",
    }),

  address: Joi.string().min(5).required(),

  class: Joi.when("role", {
    is: "student",
    then: Joi.number().min(1).max(10).required(),
    otherwise: Joi.forbidden(),
  }),

  rollNumber: Joi.when("role", {
    is: "student",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),

  enrollmentDate: Joi.when("role", {
    is: "student",
    then: Joi.date().required(),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.string().valid("active", "leaved", "passout").optional(),

  photo: Joi.string()
    .pattern(/^data:image\/(jpeg|jpg);base64,/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base":
        "Photo must be a base64 encoded image (JPEG or JPG).",
    }),

  remark: Joi.string().optional().allow(""),

  aadhaarCard: Joi.when("role", {
    is: "student",
    then: Joi.string().pattern(certificateFilePattern).required().messages({
      "string.pattern.base":
        "Aadhaar card must be a base64 encoded .jpg, .jpeg, or .pdf file.",
    }),
    otherwise: Joi.forbidden(),
  }),

  birthCertificate: Joi.when("role", {
    is: "student",
    then: Joi.string().pattern(certificateFilePattern).required().messages({
      "string.pattern.base":
        "Birth certificate must be a base64 encoded .jpg, .jpeg, or .pdf file.",
    }),
    otherwise: Joi.forbidden(),
  }),

  transferCertificate: Joi.string()
    .pattern(certificateFilePattern)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base":
        "Transfer certificate must be a base64 encoded .jpg, .jpeg, or .pdf file.",
    }),

  marksheet: Joi.string()
    .pattern(certificateFilePattern)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base":
        "Marksheet must be a base64 encoded .jpg, .jpeg, or .pdf file.",
    }),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerValidation,
  loginValidation,
};
