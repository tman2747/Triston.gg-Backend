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
    orderBy: { createdAt: "desc" },
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

export async function getPost(req, res, next) {
  console.log("hit");
  try {
    const slug = req.params.slug.toLowerCase();
    const posts = await prisma.post.findFirst({
      where: { slug: slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        createdAt: true,
        author: { select: { username: true } },
      },
    });

    if (posts !== null) {
      console.log(posts);
      res.status(200).json(posts);
    } else {
      res.status(404).json({});
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({});
  }
}
