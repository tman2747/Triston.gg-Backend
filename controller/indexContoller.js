import { prisma } from "../lib/prisma.ts";

export const getIndex = (req, res, next) => {
  // console.log(req.user); // if passport authed the user this will be attached to req
  // console.log(req.isAuthenticated());
  res.render("index", { stuff: "you can send stuff to ejs here" });
};

export const getProtectedRoute = (req, res, next) => {
  res.render("protectedPage");
};

