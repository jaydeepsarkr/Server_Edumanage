const Joi = require("joi");

// Common reusable patterns
const indianPhonePattern = /^[6-9]\d{9}$/;

const registerValidation = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name is required.",
    "string.min": "Name must be at least 3 characters.",
    "string.max": "Name must be at most 50 characters.",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format.",
    "string.empty": "Email is required.",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters.",
    "string.empty": "Password is required.",
  }),

  role: Joi.string().valid("student", "parent", "teacher").required().messages({
    "any.only": "Role must be either student, parent, or teacher.",
    "string.empty": "Role is required.",
  }),

  phone: Joi.string().pattern(indianPhonePattern).required().messages({
    "string.pattern.base":
      "Phone number must be a valid 10-digit Indian number.",
    "string.empty": "Phone number is required.",
  }),

  address: Joi.string().min(5).required().messages({
    "string.min": "Address must be at least 5 characters.",
    "string.empty": "Address is required.",
  }),

  // Conditional Fields for Students Only
  class: Joi.alternatives().conditional("role", {
    is: "student",
    then: Joi.number().min(1).max(10).required().messages({
      "number.base": "Class must be a number between 1 and 10.",
      "any.required": "Class is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  rollNumber: Joi.alternatives().conditional("role", {
    is: "student",
    then: Joi.string().required().messages({
      "string.empty": "Roll number is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  enrollmentDate: Joi.alternatives().conditional("role", {
    is: "student",
    then: Joi.date().iso().required().messages({
      "date.base": "Enrollment date must be a valid date.",
      "any.required": "Enrollment date is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.string().valid("active", "leaved", "passout").optional(),

  remark: Joi.string().allow("").optional(),

  // Optional file fields (URLs or base64 data URLs)
  photo: Joi.string().uri().optional().messages({
    "string.uri": "Photo must be a valid URL.",
  }),

  aadhaarCard: Joi.alternatives().conditional("role", {
    is: "student",
    then: Joi.string().required().messages({
      "string.empty": "Aadhaar card is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  birthCertificate: Joi.alternatives().conditional("role", {
    is: "student",
    then: Joi.string().required().messages({
      "string.empty": "Birth certificate is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  transferCertificate: Joi.string().optional().allow("").messages({
    "string.base": "Transfer certificate must be a string.",
  }),

  marksheet: Joi.string().optional().allow("").messages({
    "string.base": "Marksheet must be a string.",
  }),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format.",
    "string.empty": "Email is required.",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required.",
  }),
});

module.exports = {
  registerValidation,
  loginValidation,
};
