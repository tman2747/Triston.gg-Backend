import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";
import bcrypt from "bcryptjs";

export function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "15m" });
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
// usernames are unique no matter the capitalization ("Triston" and "triston" are the same person)
function findByUsername(username) {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
}

// logs the user in: sets the refresh cookie and returns a new access token
function issueTokens(res, user) {
  const accessToken = generateAccessToken({
    id: user.id,
    name: user.username,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({ id: user.id });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/auth/refresh",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return accessToken;
}

export const signup = async (req, res, next) => {
  try {
    const username = req.body.username;
    if (await findByUsername(username)) {
      return res.status(409).json({
        error: {
          message: "Username is taken",
          fields: { username: "That username is taken" },
        },
      });
    }
    const user = await prisma.user.create({
      data: {
        username: username,
        password: await bcrypt.hash(req.body.password, 10),
        email: req.body.email,
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
      },
    });
    // log them straight in so they don't have to type it all again
    return res.status(201).json({ accessToken: issueTokens(res, user) });
  } catch (error) {
    // two people grabbing the same username at the same time
    if (error.code === "P2002") {
      return res.status(409).json({
        error: {
          message: "Username is taken",
          fields: { username: "That username is taken" },
        },
      });
    }
    console.log(error);
    return res
      .status(500)
      .json({ error: { message: "Something went wrong signing up" } });
  }
};

export const login = async (req, res, next) => {
  try {
    const username = req.body?.username?.trim();
    const password = req.body?.password;

    const user = username && (await findByUsername(username));
    if (!user || !password) {
      return res
        .status(401)
        .json({ error: { message: "Invalid username or password" } });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ error: { message: "Invalid username or password" } });
    }

    return res.status(200).json({ accessToken: issueTokens(res, user) });
  } catch (error) {
    console.log("ERROR!!! at auth controller: ", error);
    return res
      .status(500)
      .json({ error: { message: "Something went wrong logging in" } });
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
      secure: true,
      sameSite: "none",
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

// use after authenticateToken on routes with an :id param for a user
// only lets the user themselves (or TRISTON) through
export function requireSelf(req, res, next) {
  if (req.user.id === req.params.id || req.user.role === "TRISTON") {
    return next();
  }
  return res.status(403).json({ error: { message: "Forbidden" } });
}

// like authenticateToken but lets logged out users through (req.user stays undefined)
// a bad/expired token still gets a 401 so the frontend refreshes and retries
export function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();
  return authenticateToken(req, res, next);
}
