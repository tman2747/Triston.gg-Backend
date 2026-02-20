import express from "express";
import * as usersController from "../controller/usersController.js";
import { validateSignup } from "../validators/authValidators.js";
import { authenticateToken } from "../controller/authController.js";

const usersRouter = express.Router();

usersRouter.post("/", usersController.createUser);
usersRouter.get("/", usersController.getUsers);
usersRouter.get("/:id", authenticateToken, usersController.getUserById);
// usersRouter.put("/:id", usersController.updateUser);
// usersRouter.delete("/:id", usersController.deleteUser);

export { usersRouter };
