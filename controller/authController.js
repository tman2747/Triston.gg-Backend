import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  console.log(jwt());
};
