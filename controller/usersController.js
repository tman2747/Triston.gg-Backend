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
  console.log(req.headers["authorization"]);
  const user = await prisma.user.findFirst({
    where: { username: req.params.id },
    select: { id: true, username: true, role: true },
  });
  res.json(user);
};
