import express from "express";
import * as eventContoller from "../controller/eventController.js";
import { authenticateToken } from "../controller/authController.js";

const eventRouter = express.Router();

eventRouter.post("/create", authenticateToken, eventContoller.createEvent);
eventRouter.put("/:slug", authenticateToken, eventContoller.updateEvent);
eventRouter.delete("/:slug", authenticateToken, eventContoller.deleteEvent);
eventRouter.post(
  "/:slug/comments",
  authenticateToken,
  eventContoller.postEventComment,
);
eventRouter.delete(
  "/:slug/comments/:commentId",
  authenticateToken,
  eventContoller.deleteEventComment,
);
eventRouter.get("/:slug", eventContoller.getEvent);
eventRouter.get("/", eventContoller.getEvents);

export { eventRouter };
