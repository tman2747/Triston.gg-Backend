import express from "express";
import * as postController from "../controller/postController.js";
import { authenticateToken } from "../controller/authController.js";

const postRouter = express.Router();

postRouter.post("/create", authenticateToken, postController.createPost);
postRouter.get("/:slug", postController.getPost);
postRouter.get("/", postController.getPosts);
// usersRouter.put("/:id", usersController.updateUser);
// usersRouter.delete("/:id", usersController.deleteUser);

export { postRouter };
