import express from "express";
import * as eventContoller from "../controller/eventController.js";
import { authenticateToken } from "../controller/authController.js";

const eventRouter = express.Router();

eventRouter.post("/create", authenticateToken, eventContoller.createEvent);
eventRouter.get("/:slug", eventContoller.getEvent);
eventRouter.get("/", eventContoller.getEvents);

export { eventRouter };
