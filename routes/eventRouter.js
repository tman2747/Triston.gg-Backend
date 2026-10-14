import express from "express";
import * as eventContoller from "../controller/eventController.js";
import {
  authenticateToken,
  optionalAuth,
} from "../controller/authController.js";

const eventRouter = express.Router();

eventRouter.post("/create", authenticateToken, eventContoller.createEvent);
eventRouter.put("/:slug", authenticateToken, eventContoller.updateEvent);
eventRouter.delete("/:slug", authenticateToken, eventContoller.deleteEvent);
eventRouter.put("/:slug/rsvp", authenticateToken, eventContoller.rsvpEvent);
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
eventRouter.put(
  "/:slug/comments/:commentId/reaction",
  authenticateToken,
  eventContoller.reactToEventComment,
);
// optionalAuth so logged in users get their own rsvp back
eventRouter.get("/:slug", optionalAuth, eventContoller.getEvent);
eventRouter.get("/", eventContoller.getEvents);

export { eventRouter };
