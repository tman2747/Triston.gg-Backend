import express from "express";
import * as indexContoller from "../controller/indexContoller.js";
const indexRouter = express.Router();

function isAuthed(req, res, next) {
  if (req.user) {
    return next();
  } else {
    res.redirect("/errorPage"); // no error page setup but this is where you'd redirect the request
  }
}

function isAdmin(req, res, next) {
  // you'd first have to make sure deserializeuser adds its admin status to the
  // req.user (req.user.admin) and then you could just check if (req.user.admin)
}

indexRouter.get("/protectedPage", isAuthed, indexContoller.getProtectedRoute);
indexRouter.get("/posts", indexContoller.getPosts);
indexRouter.get("/", indexContoller.getIndex);
indexRouter.get("/{*error}", (req, res) => {
  res.status(404).send("404 PAGE NOT FOUND. (this message is in index router)");
});

export { indexRouter };
