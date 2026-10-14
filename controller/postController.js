import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "../lib/prisma.ts";
import { remark } from "remark";
import strip from "strip-markdown";
import remarkParse from "remark-parse";
import {
  getMaxSlug,
  getExcerpt,
  slugify,
  summarizeReactions,
  reactionSelect,
  parseReactionType,
} from "./helpers.js";

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
    const post = await prisma.post.findFirst({
      where: { slug: slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        createdAt: true,
        author: { select: { username: true } },
        reactions: reactionSelect,

        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            parentId: true,
            author: { select: { username: true } },
            reactions: reactionSelect,
          },
        },
      },
    });

    if (post === null) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }
    // req.user is only set when the request had a valid token (optionalAuth)
    const userId = req.user?.id;
    const { reactions, comments, ...rest } = post;
    res.status(200).json({
      ...rest,
      ...summarizeReactions(reactions, userId),
      comments: comments.map(({ reactions, ...comment }) => ({
        ...comment,
        ...summarizeReactions(reactions, userId),
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({});
  }
}

export async function reactToPost(req, res, next) {
  const type = parseReactionType(req.body.type);
  if (type === undefined) {
    return res
      .status(400)
      .json({ error: { message: "type must be LIKE, DISLIKE or null" } });
  }
  const post = await prisma.post.findUnique({
    where: { slug: req.params.slug.toLowerCase() },
    select: { id: true },
  });
  if (!post) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }
  const key = { postId_userId: { postId: post.id, userId: req.user.id } };
  if (type === null) {
    await prisma.postReaction.deleteMany({
      where: { postId: post.id, userId: req.user.id },
    });
  } else {
    await prisma.postReaction.upsert({
      where: key,
      create: { postId: post.id, userId: req.user.id, type },
      update: { type },
    });
  }
  const reactions = await prisma.postReaction.findMany({
    where: { postId: post.id },
    ...reactionSelect,
  });
  return res.status(200).json(summarizeReactions(reactions, req.user.id));
}

export async function reactToComment(req, res, next) {
  const type = parseReactionType(req.body.type);
  if (type === undefined) {
    return res
      .status(400)
      .json({ error: { message: "type must be LIKE, DISLIKE or null" } });
  }
  const commentId = req.params.commentId;
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) {
    return res.status(404).json({ error: { message: "Comment not found" } });
  }
  if (type === null) {
    await prisma.postCommentReaction.deleteMany({
      where: { commentId, userId: req.user.id },
    });
  } else {
    await prisma.postCommentReaction.upsert({
      where: { commentId_userId: { commentId, userId: req.user.id } },
      create: { commentId, userId: req.user.id, type },
      update: { type },
    });
  }
  const reactions = await prisma.postCommentReaction.findMany({
    where: { commentId },
    ...reactionSelect,
  });
  return res.status(200).json(summarizeReactions(reactions, req.user.id));
}
export async function updatePost(req, res, next) {
  const slug = req.params.slug.toLowerCase();
  const post = await prisma.post.findFirst({ where: { slug: slug } });
  if (!post) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }
  // the author or TRISTON can edit
  if (post.authorId != req.user.id && req.user.role != "TRISTON") {
    return res.status(403).json({
      error: { message: "You do not have permissions to update this post" },
    });
  }
  const updatedTitle = req.body.title?.trim();
  const updatedContent = req.body.content;
  if (!updatedTitle || !updatedContent?.trim()) {
    return res
      .status(400)
      .json({ error: { message: "Title or content cannot be empty" } });
  }
  const updatedExcerpt = await getExcerpt(updatedContent);

  // only make a new slug when the title would slugify differently,
  // otherwise keep the old one so the url doesn't change
  const baseSlug = slugify(updatedTitle);
  let newSlug = post.slug;
  if (baseSlug !== slugify(post.title)) {
    const existing = await prisma.post.findMany({
      where: { slug: { startsWith: baseSlug }, NOT: { id: post.id } },
      select: { slug: true },
    });
    newSlug = getMaxSlug(baseSlug, existing);
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      title: updatedTitle,
      content: updatedContent,
      slug: newSlug,
      excerpt: updatedExcerpt,
    },
    select: { title: true, slug: true, content: true },
  });
  // send the new slug back so the frontend can move to the new url
  return res.status(200).json(updated);
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
    return res.status(401).json({});
  }
  const slug = req.params.slug.toLowerCase();
  try {
    const currentPost = await prisma.post.findUnique({
      where: { slug: slug },
      select: { id: true },
    });
    if (currentPost == null) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }
    const commentContent = req.body.content?.trim() || "";
    if (commentContent.length < 2) {
      return res
        .status(400)
        .json({ error: { message: "Comment must be at least 2 characters" } });
    }
    // replying to another comment, it has to be on the same post
    const parentId = req.body.parentId || null;
    if (parentId) {
      const parent = await prisma.postComment.findUnique({
        where: { id: parentId },
        select: { postId: true },
      });
      if (!parent || parent.postId !== currentPost.id) {
        return res
          .status(400)
          .json({ error: { message: "The comment you replied to is gone" } });
      }
    }
    const newComment = await prisma.postComment.create({
      data: {
        postId: currentPost.id,
        authorId: req.user.id,
        body: commentContent,
        parentId,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        parentId: true,
        author: { select: { username: true } },
      },
    });
    return res.status(201).json({
      commentId: newComment.id,
      comment: { ...newComment, likes: 0, dislikes: 0, myReaction: null },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: { message: "Failed to post comment" } });
  }
}

// deleting a comment also deletes its replies (onDelete: Cascade in the schema)
export async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.postComment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!comment) {
      return res.status(400).json({
        error: { message: "no comment or it was already deleted" },
      });
    }
    if (comment.authorId != req.user.id && req.user.role != "TRISTON") {
      return res.status(403).json({
        error: { message: "You can only delete your own comments" },
      });
    }
    await prisma.postComment.delete({ where: { id: comment.id } });
    return res.status(201).json({ message: "DELETED" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: { message: "Failed to delete comment" } });
  }
}
