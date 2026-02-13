import { body, validationResult } from "express-validator";

export const validateSignup = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .isAlphanumeric()
    .withMessage("Username must be alphanumeric"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 3 })
    .withMessage("Password must be at least 3 characters"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .bail() // should probably use this after every validation to stop checking if we already know its wrong
    .isLength({ min: 3 })
    .withMessage("Email must be at least 3 characters"),

  (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors.errors);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ error: { message: errors.array()[0].msg } });
    }
    next(); // this might not be needed
  },
];
