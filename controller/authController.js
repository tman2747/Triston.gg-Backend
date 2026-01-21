import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";
import bcrypt from "bcryptjs";
import { use } from "react";

export function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "5s" });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN, { expiresIn: "30d" });
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
    if (err) {
      console.log("failed to verify token (could of timed out)");
      return res
        .status(401)
        .json({ error: { message: "failed to verify token" } });
    }
    req.user = user;
    next();
  });
}
export const signup = async (req, res, next) => {
  // make sure user doesnt already exist in the db
  // then add the user to db and hash password

  // later i could send back the auth token after sign up so they're auto signed in
  // but that would be after i figure out auth in the first place XD
  try {
    const username = req.body.username;
    const password = await bcrypt.hash(req.body.password, 10);
    const email = req.body.email;
    const exist = await prisma.user.findFirst({
      where: { username: username },
    });
    if (exist) {
      console.log(true);
      res.status(409).json({ error: { message: "Username is taken" } });
      return;
    }
    let createdUser = await prisma.user.create({
      data: { username: username, password: password, email: email },
      select: { id: true, username: true },
    });
    console.log(await createdUser);
    res.status(201).json({ error: { message: "Test" } });
  } catch (error) {
    console.log(error);
    res.status(500).json([{ test: "Error signing up" }]);
  }
};

export const login = async (req, res, next) => {
  // auth the user
  try {
    const username = req.body?.username;
    const password = req.body?.password;

    const user = await prisma.user.findFirst({
      where: { username: username },
    });
    if (!user || !password) {
      return res
        .status(401)
        .json({ error: { message: "Invalid Credentials" } });
    }
    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password,
    );
    if (!passwordMatch) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const infoWeWantSerlized = { id: user.id, name: username, role: user.role };

    const accessToken = generateAccessToken(infoWeWantSerlized);
    const refreshToken = generateRefreshToken({ id: infoWeWantSerlized.id });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false, // TODO change to true in production
      sameSite: "lax", // review this
      path: "/auth/refresh",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: accessToken });
  } catch (error) {
    console.log("ERROR!!! at auth controller: ", error);
    return res.status(401).json({ msg: "error logging in" });
  }
};

export const getPosts = async (req, res, next) => {
  if (req.user) {
    res.json(
      await prisma.user.findFirst({
        where: { username: req.user.name },
        select: { id: true, username: true },
      }),
    );
  } else console.log("error");
};

export const getMe = async (req, res, next) => {
  if (req.user) {
    res.status(200).json(req.user);
  }
};

export const refresh = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN); // { id }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.sendStatus(401);

    const newAccessPayload = {
      id: user.id,
      name: user.username,
      role: user.role,
    };
    const newAccessToken = generateAccessToken(newAccessPayload);

    const newRefreshToken = generateRefreshToken({ id: user.id });
    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/auth/refresh",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.sendStatus(401);
  }
};

export const logout = async (req, res) => {
  // delete refresh token from db once i add "sessions"
  res.clearCookie("refresh_token", { path: "/auth/refresh" });
  return res.sendStatus(204);
};
