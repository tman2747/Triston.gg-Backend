import express from "express";
import * as projectController from "../controller/projectController.js";
import {
  authenticateToken,
  requireTriston,
} from "../controller/authController.js";
import {
  validateCategory,
  validateProject,
} from "../validators/projectValidators.js";

const projectRouter = express.Router();

const admin = [authenticateToken, requireTriston];

// categories (these have to come before the /:id routes so "categories" isn't read as an id)
projectRouter.get("/categories", projectController.getCategories);
projectRouter.post("/categories", admin, validateCategory, projectController.createCategory);
projectRouter.delete("/categories/:id", admin, projectController.deleteCategory);

// custom order (also before /:id)
projectRouter.put("/order", admin, projectController.saveOrder);
projectRouter.delete("/order", admin, projectController.resetOrder);

// anyone can look
projectRouter.get("/", projectController.getProjects);
projectRouter.get("/:id", projectController.getProject);
projectRouter.get("/:id/status", projectController.getServerStatus);

// only TRISTON (admin) can change things
projectRouter.post("/", admin, validateProject, projectController.createProject);
projectRouter.put("/:id", admin, validateProject, projectController.updateProject);
projectRouter.put("/:id/running", admin, projectController.setServerRunning);
projectRouter.delete("/:id", admin, projectController.deleteProject);

export { projectRouter };
