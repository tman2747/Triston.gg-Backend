import { prisma } from "../lib/prisma.ts";

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
  const user = await prisma.user.findFirst({
    where: { id: req.params.id },
    select: {
      id: true,
      username: true,
      role: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });
  res.status(200).json(user);
};
