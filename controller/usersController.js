import { prisma } from "../lib/prisma.ts";

// fields that are safe to send back to the user themselves (no password)
const profileSelect = {
  id: true,
  username: true,
  role: true,
  email: true,
  firstName: true,
  lastName: true,
};

export const createUser = (req, res, next) => {
  res.json({ name: "hello POST" });
};

export const getUsers = async (req, res, next) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  });
  console.log(users);
  res.json(users);
};
export const getUserById = async (req, res, next) => {
  // make sure that the route being hit has params it should because the way routes are setup but just testing XD
  if (!req.params.id) {
    res.sendStatus(400);
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: profileSelect,
  });
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }
  res.status(200).json(user);
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        // store empty names as null so they match users who never set one
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
        email: req.body.email,
      },
      select: profileSelect,
    });
    res.status(200).json(user);
  } catch (error) {
    // P2025 = record to update was not found
    if (error.code === "P2025") {
      return res.status(404).json({ error: { message: "User not found" } });
    }
    next(error);
  }
};
