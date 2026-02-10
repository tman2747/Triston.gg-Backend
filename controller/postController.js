import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "../lib/prisma.ts";
import { remark } from "remark";
import strip from "strip-markdown";
import remarkParse from "remark-parse";
import { getMaxSlug, getExcerpt, slugify } from "./helpers.js";

export async function createPost(req, res, next) {
  console.log(req.user);
  if (req.user?.role !== "TRISTON") {
    // return proper status with json message

    // might  be able to bundle something like this into
    // a authchecker middleware but for now it works
    console.log("no access");
    return res
      .status(403)
      .json({ error: { message: "You do not have permissions to post" } });
  }
  // probably should pass this in to a validation middleware
  const title = req.body.title;
  const baseSlug = slugify(req.body.title);
  const content = req.body.content;

  if (title == "" || content == "") {
    return res
      .status(400)
      .json({ error: { message: "Title or content cannot be empty" } });
  }
  const existing = await prisma.post.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = getMaxSlug(baseSlug, existing);
  const excerpt = await getExcerpt(content);
  const authorId = req.user.id;
  try {
    await prisma.post.create({
      data: {
        title: title,
        slug: slug,
        excerpt: excerpt,
        content: content,
        authorId: authorId,
      },
    });
  } catch (error) {
    console.log("Error creating post inside postController" + error);
    return res.status(500).json({ error: { message: error } });
  }
  return res.status(201).json({ message: "Created" });
}

// todo Cache posts
export async function getPosts(req, res, next) {
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
  try {
  } catch (error) {}
}

export async function getPost(req, res, next) {
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

        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { username: true } },
          },
        },
      },
    });

    if (posts !== null) {
      res.status(200).json(posts);
    } else {
      res.status(404).json({}); //TODO add  message
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({});
  }
}
export async function updatePost(req, res, next) {
  // todo send a res status back and wrap in trycatch
  const slug = req.params.slug.toLowerCase();
  const post = await prisma.post.findFirst({ where: { slug: slug } });
  console.log(post);
  console.log(req.user);
  if (post.authorId != req.user.id) {
    return res.status(403).json({
      error: { message: "You do not have permissions to update this post" },
    });
  }
  const updatedTitle = req.body.title;
  const updatedContent = req.body.content;
  const updatedExcerpt = await getExcerpt(updatedContent);

  const existing = await prisma.post.findMany({
    where: { slug: { startsWith: updatedTitle } },
    select: { slug: true },
  });
  const newTitle = slugify(updatedTitle);
  const newSlug = getMaxSlug(newTitle, existing);
  // update slug and excerpt
  await prisma.post.update({
    where: { id: post.id },
    data: {
      title: updatedTitle,
      content: updatedContent,
      slug: newSlug,
      excerpt: updatedExcerpt,
    },
  });
}

export async function deletePost(req, res, next) {
  console.log("inside delete post");

  const postid = req.body.content;
  const postToDelete = await prisma.post.findUnique({ where: { id: postid } });
  if (!postToDelete) {
    return res
      .status(400)
      .json({ error: { message: "Unable to locate post" } });
  }
  if (req.user.id == postToDelete.authorId || req.user.role == "TRISTON") {
    await prisma.post.delete({ where: { id: postid } });
    return res.status(201).json({ message: "DELETED" });
  }
  return;
}

export async function postComment(req, res, next) {
  if (!req.user) {
    console.log("not a user");
    return res.status(401).json({});
  }
  const slug = req.params.slug.toLowerCase();
  try {
    const currentPost = await prisma.post.findUnique({
      where: { slug: slug },
      select: { id: true },
    });
    if (currentPost == null) {
      throw new Error("Current Post Was null inside postController");
    }
    console.log(currentPost);
    const commentAuthorId = req.user.id;
    const commentContent = req.body.content;
    console.log(commentContent.length);
    if (commentContent.length < 2) {
      return res
        .status(400)
        .json({ message: "Message must be longer than 2 char" });
    }
    const postId = currentPost.id;
    const newComment = await prisma.postComment.create({
      data: {
        postId: postId,
        authorId: commentAuthorId,
        body: commentContent,
      },
    });
    return res.status(201).json({ commentId: newComment.id });
  } catch (error) {
    console.log(error);
    return;
  }
}
export async function deleteComment(req, res, next) {
  console.log("inside delete");
  console.log(req.user);
  console.log(req.body.content);
  try {
    const comment = await prisma.postComment.findUnique({
      where: { id: req.body.content },
    });
    if (!comment) {
      console.log("no comment or it was already deleted");
      res.status(400).json({
        error: { message: "no comment or it was already deleted" },
      });
      return;
    }
    if (comment.authorId == req.user.id || req.user.role == "TRISTON") {
      await prisma.postComment.delete({ where: { id: comment.id } });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { message: error } });
  }
  return res.status(201).json({ message: "DELETED" });
}
