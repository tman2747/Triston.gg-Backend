import express from "express";
import * as authController from "../controller/authController.js";
import { validateSignup } from "../validators/authValidators.js";
import jwt from "jsonwebtoken";

const authRouter = express.Router();

authRouter.post("/login", authController.login);
authRouter.get("/logout", authController.logout);
authRouter.post("/signUp", validateSignup, authController.signup);
authRouter.get(
  "/posts",
  authController.authenticateToken,
  authController.getPosts
);
authRouter.get("/me", authController.authenticateToken, authController.getMe);
authRouter.post("/refresh", authController.refresh);
// authRouter.put("/:id", authController.updateUser);
// authRouter.delete("/:id", authController.deleteUser);

export { authRouter };
