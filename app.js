import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import cookieParser from "cookie-parser";

// include routers
import { indexRouter } from "./routes/indexRouter.js";
import { usersRouter } from "./routes/usersRouter.js";
import { authRouter } from "./routes/authRouter.js";
import { postRouter } from "./routes/postRouter.js";

// ESM replacement for __dirname / __filename  because esm does not give you __filename as it is built for the browser or something XD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// add ref to public path for ejs?
const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

const PORT = process.env.PORT || 3000;

// use nested parsing almost always should be true
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // Vite dev server
    credentials: true, // REQUIRED for cookies
  }),
);
// routes
app.use("/create", postRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/", indexRouter);
// error handling
app.use((err, req, res, next) => {
  console.log(err);
  res
    .status(500)
    .send("Uncaught error. Contact TristonSquad for support. " + `(${err})`);
});

// server
app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  // TODO: change this to get the domain and port automatically
  console.log(`app running on http://localhost:${PORT}`);
});
