import express from "express";
import * as authController from "../controller/authController.js";
import { validateSignup } from "../validators/authValidators.js";

const authRouter = express.Router();

authRouter.get("/sign-up", authController.getSignup);
authRouter.post("/sign-up", validateSignup, authController.postSignup); // <--- here

authRouter.get("/login", authController.getLogin);
authRouter.post("/login", authController.postLogin);

authRouter.get("/logout", authController.getLogout);

export { authRouter };
