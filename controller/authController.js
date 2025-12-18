import passport from "passport";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

export const getSignup = (req, res, next) => {
  res.render("signup");
};

export const postSignup = async (req, res, next) => {
  try {
    const username = req.body.username;
    const hashedpassword = await bcrypt.hash(req.body.password, 10);
    await prisma.user.create({
      data: {
        username: username,
        password: hashedpassword,
      },
    });
    res.redirect("/login");
  } catch (error) {
    console.log("error in signup");
    next(error);
  }
};

export const getLogin = (req, res, next) => {
  res.render("login");
};

// i can add the express validator to this if I want but its not really needed unless I want to add messages i guess
export const postLogin = (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    // THIS CALLBACK is where `done` returns to from passport.js config
    if (error) {
      return next(error);
    }

    //failed login
    if (!user) {
      const errors = [{ msg: info.message }]; // seems kinda crazy to include a you got the username right but not the password message
      res.render("login", { errors: errors });
      return;
    }

    //sucssesful Login
    req.logIn(user, (error) => {
      if (error) {
        return next(error);
      }
      res.redirect("/");
    });
  })(req, res, next);
};

export const getLogout = (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    res.redirect("/");
  });
};
