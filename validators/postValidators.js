import { body, validationResult } from "express-validator";

export const validateSignup = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),

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
