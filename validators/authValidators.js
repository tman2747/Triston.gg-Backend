import { body, validationResult } from "express-validator";

export const validateSignup = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .bail() // stop at the first problem for each field
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3 to 30 characters")
    .bail()
    .isAlphanumeric()
    .withMessage("Username can only use letters and numbers"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Password must be at least 3 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email address")
    .bail()
    .isLength({ max: 320 })
    .withMessage("Email must be 320 characters or less"),

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

  // sends back every problem at once: { error: { message, fields: { username: "...", ... } } }
  // message is the first one, for anything that only shows a single error
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fields = errors.mapped();
      return res.status(400).json({
        error: {
          message: errors.array()[0].msg,
          fields: Object.fromEntries(
            Object.entries(fields).map(([field, err]) => [field, err.msg]),
          ),
        },
      });
    }
    next();
  },
];
