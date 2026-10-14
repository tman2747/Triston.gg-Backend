import { body, validationResult } from "express-validator";

const SERVER_GAMES = ["MINECRAFT", "RUST", "OTHER"];
// .if() conditions get (value, { req }), not req
const isServer = (value, { req }) => req.body.isServer === true;
const httpUrl = { protocols: ["http", "https"], require_protocol: true };

// same shape as signup errors: { error: { message, fields: { title: "...", ... } } }
function sendErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        message: errors.array()[0].msg,
        fields: Object.fromEntries(
          Object.entries(errors.mapped()).map(([field, err]) => [field, err.msg]),
        ),
      },
    });
  }
  next();
}

export const validateProject = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Title must be 100 characters or less"),
  body("description")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Description must be 300 characters or less"),
  // that the category actually exists is checked in the controller
  body("categoryId").isString().notEmpty().withMessage("Pick a category"),
  body("linkLabel")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 30 })
    .withMessage("Button text must be 30 characters or less"),
  body("isServer").optional().isBoolean().toBoolean(),

  // a full link, or a page on this site like /pomodoro
  body("url")
    .optional({ values: "falsy" })
    .trim()
    .custom(
      (value) =>
        (value.startsWith("/") && !value.startsWith("//")) ||
        /^https?:\/\/\S+$/.test(value),
    )
    .withMessage("Use a full link (https://...) or a page on this site (/pomodoro)"),
  body("sourceUrl")
    .optional({ values: "falsy" })
    .trim()
    .isURL(httpUrl)
    .withMessage("Use a full link starting with https://"),
  body("imageUrl")
    .optional({ values: "falsy" })
    .trim()
    .isURL(httpUrl)
    .withMessage("Use a full image link starting with https://"),
  body("pinned").optional().isBoolean().toBoolean(),

  // server fields only matter for servers
  body("serverGame")
    .if(isServer)
    .isIn(SERVER_GAMES)
    .withMessage("Pick which game the server is for"),
  body("serverAddress")
    .if(isServer)
    .trim()
    .notEmpty()
    .withMessage("Add the address people connect to")
    .bail()
    .isLength({ max: 255 })
    .withMessage("Address must be 255 characters or less"),
  body("serverRunning").optional().isBoolean().toBoolean(),

  sendErrors,
];

export const validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Give the category a name")
    .bail()
    .isLength({ max: 30 })
    .withMessage("Category names must be 30 characters or less"),
  sendErrors,
];
