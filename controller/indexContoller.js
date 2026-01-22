import { prisma } from "../lib/prisma.ts";

export const getIndex = (req, res, next) => {
  // console.log(req.user); // if passport authed the user this will be attached to req
  // console.log(req.isAuthenticated());
  res.render("index", { stuff: "you can send stuff to ejs here" });
};

export const getProtectedRoute = (req, res, next) => {
  res.render("protectedPage");
};

export async function getPosts(req, res, next) {
  console.log("hit");
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      createdAt: true,
      author: { select: { username: true } },
    },
  });
  res.status(200).json(posts);
  console.log(posts);
  try {
  } catch (error) {}
}
