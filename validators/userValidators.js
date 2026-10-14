import { body, validationResult } from "express-validator";

export const validateProfileUpdate = [
  body("firstName")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("First name must be 50 characters or less"),
  body("lastName")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Last name must be 50 characters or less"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Email must be a valid email address")
    .bail()
    .isLength({ max: 320 })
    .withMessage("Email must be 320 characters or less"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: { message: errors.array()[0].msg } });
    }
    next();
  },
];
