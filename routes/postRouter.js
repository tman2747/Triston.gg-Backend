import express from "express";
import * as postController from "../controller/postController.js";
import { authenticateToken } from "../controller/authController.js";

const postRouter = express.Router();

postRouter.delete("/:slug", authenticateToken, postController.deletePost);
postRouter.post(
  "/:slug/comments",
  authenticateToken,
  postController.postComment,
);
postRouter.delete(
  "/:slug/comments/:commentId",
  authenticateToken,
  postController.deleteComment,
);
postRouter.post("/create", authenticateToken, postController.createPost);
postRouter.put("/:slug", authenticateToken, postController.updatePost);
postRouter.get("/:slug", postController.getPost);
postRouter.get("/", postController.getPosts);
// usersRouter.put("/:id", usersController.updateUser);
// usersRouter.delete("/:id", usersController.deleteUser);

export { postRouter };
