import { prisma } from "../lib/prisma.ts";
import { getMaxSlug, getExcerpt, slugify } from "./helpers.js";

export const createEvent = async (req, res, next) => {
  // todo THIS NEEDS HEAVY REWORKING. error checking/validation/trycatch/response codes ect.. its bare bones right now
  const title = req.body.title;
  const host = req.body.host;
  const startTime = req.body.startTime;
  const endTime = req.body.endTime;
  const eventDate = req.body.eventDate;
  const location = req.body.location;
  const description = req.body.description;

  if (!title || !host || !startTime || !eventDate) {
    console.log("missing required field"); // not robust so maybe add some real checking. maybe need user checking too?
    //todo add
    return;
  }
  const baseSlug = slugify(title);
  const existing = await prisma.event.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = getMaxSlug(baseSlug, existing);
  const isoDate = new Date(eventDate);
  const excerpt = await getExcerpt(description);
  await prisma.event.create({
    data: {
      title: title,
      slug: slug,
      host: host,
      startTime: startTime,
      endTime: endTime,
      date: isoDate,
      location: location,
      description: description,
      excerpt: excerpt,
      authorId: req.user.id, // i think thats it
    },
  });
  res.status(201).json({}); // todo check all
  return;
};

export async function updateEvent(req, res, next) {
  const slug = req.params.slug.toLowerCase();
  const event = await prisma.event.findFirst({ where: { slug: slug } });
  if (!event) {
    return res.status(404).json({ error: { message: "Event not found" } });
  }
  if (event.authorId != req.user.id) {
    return res.status(403).json({
      error: { message: "You do not have permissions to update this event" },
    });
  }
  const updatedTitle = req.body.title;
  const updatedDescription = req.body.description;
  const updatedExcerpt = await getExcerpt(updatedDescription);
  const updatedDate = new Date(req.body.eventDate);

  const existing = await prisma.event.findMany({
    where: { slug: { startsWith: slugify(updatedTitle) } },
    select: { slug: true },
  });
  const newSlug = getMaxSlug(slugify(updatedTitle), existing);

  await prisma.event.update({
    where: { id: event.id },
    data: {
      title: updatedTitle,
      slug: newSlug,
      host: req.body.host,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      date: updatedDate,
      location: req.body.location,
      description: updatedDescription,
      excerpt: updatedExcerpt,
    },
  });
  return res.status(201).json({ message: "Updated" });
}

export async function deleteEvent(req, res, next) {
  const slug = req.params.slug.toLowerCase();
  const event = await prisma.event.findFirst({ where: { slug: slug } });
  if (!event) {
    return res
      .status(400)
      .json({ error: { message: "Unable to locate event" } });
  }
  if (req.user.id == event.authorId || req.user.role == "TRISTON") {
    await prisma.event.delete({ where: { id: event.id } });
    return res.status(201).json({ message: "DELETED" });
  }
  return res.status(403).json({
    error: { message: "You do not have permissions to delete this event" },
  });
}

export async function postEventComment(req, res, next) {
  if (!req.user) {
    return res.status(401).json({});
  }
  const slug = req.params.slug.toLowerCase();
  try {
    const currentEvent = await prisma.event.findUnique({
      where: { slug: slug },
      select: { id: true },
    });
    if (currentEvent == null) {
      throw new Error("Current Event was null inside eventController");
    }
    const commentAuthorId = req.user.id;
    const commentContent = req.body.content;
    if (commentContent.length < 2) {
      return res
        .status(400)
        .json({ message: "Message must be longer than 2 char" });
    }
    const newComment = await prisma.eventComment.create({
      data: {
        eventId: currentEvent.id,
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

export async function deleteEventComment(req, res, next) {
  try {
    const comment = await prisma.eventComment.findUnique({
      where: { id: req.body.content },
    });
    if (!comment) {
      res.status(400).json({
        error: { message: "no comment or it was already deleted" },
      });
      return;
    }
    if (comment.authorId == req.user.id || req.user.role == "TRISTON") {
      await prisma.eventComment.delete({ where: { id: comment.id } });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: { message: error } });
  }
  return res.status(201).json({ message: "DELETED" });
}

export async function getEvents(req, res, next) {
  try {
    const events = await prisma.event.findMany({
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        host: true,
        title: true,
        slug: true,
        startTime: true,
        endTime: true,
        date: true,
        location: true,
        excerpt: true,
        author: { select: { username: true } },
      },
    });
    res.status(200).json(events);
  } catch (error) {
    console.log(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const slug = req.params.slug.toLowerCase();
    const event = await prisma.event.findFirst({
      where: { slug: slug },
      select: {
        id: true,
        title: true,
        slug: true,
        host: true,
        startTime: true,
        endTime: true,
        date: true,
        location: true,
        description: true,
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

    if (event !== null) {
      res.status(200).json(event);
    } else {
      res.status(404).json({}); //TODO add  message
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({});
  }

  return;
}
