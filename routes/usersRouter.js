import express from "express";
import * as usersController from "../controller/usersController.js";
import { validateProfileUpdate } from "../validators/userValidators.js";
import {
  authenticateToken,
  requireSelf,
} from "../controller/authController.js";

const usersRouter = express.Router();

usersRouter.post("/", usersController.createUser);
usersRouter.get("/", usersController.getUsers);
usersRouter.get(
  "/:id",
  authenticateToken,
  requireSelf,
  usersController.getUserById,
);
usersRouter.put(
  "/:id",
  authenticateToken,
  requireSelf,
  validateProfileUpdate,
  usersController.updateUser,
);
// usersRouter.delete("/:id", usersController.deleteUser);

export { usersRouter };
