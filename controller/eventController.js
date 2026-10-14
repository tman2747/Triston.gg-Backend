import { prisma } from "../lib/prisma.ts";
import {
  getMaxSlug,
  getExcerpt,
  slugify,
  summarizeReactions,
  reactionSelect,
  parseReactionType,
} from "./helpers.js";

// checks the fields every event needs, returns an error message or null
function validateEventFields(body) {
  if (!body.title?.trim()) return "Title is required";
  if (!body.host?.trim()) return "Host is required";
  if (!body.startTime) return "Start time is required";
  if (!body.eventDate || Number.isNaN(new Date(body.eventDate).getTime())) {
    return "A valid date is required";
  }
  return null;
}

// fields shared by create and update
async function eventData(body) {
  const description = body.description || "";
  return {
    title: body.title.trim(),
    host: body.host.trim(),
    startTime: body.startTime,
    endTime: body.endTime || null,
    date: new Date(body.eventDate),
    location: body.location?.trim() || null,
    description: description,
    excerpt: await getExcerpt(description),
  };
}

// turns the rsvp rows into counts, who's going and what the current user picked
// who's not going is only sent to the host (the user who created the event) and TRISTON
function summarizeRsvps(rsvps, userId, canSeeNotGoing) {
  const going = rsvps.filter((r) => r.status === "GOING");
  const notGoing = rsvps.filter((r) => r.status === "NOT_GOING");
  return {
    goingCount: going.length,
    notGoingCount: notGoing.length,
    going: going.map((r) => r.user.username),
    ...(canSeeNotGoing && { notGoing: notGoing.map((r) => r.user.username) }),
    myRsvp: rsvps.find((r) => r.userId === userId)?.status || null,
  };
}

const rsvpSelect = {
  orderBy: { createdAt: "asc" },
  select: { status: true, userId: true, user: { select: { username: true } } },
};

export const createEvent = async (req, res, next) => {
  const invalid = validateEventFields(req.body);
  if (invalid) {
    return res.status(400).json({ error: { message: invalid } });
  }
  const baseSlug = slugify(req.body.title);
  const existing = await prisma.event.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = getMaxSlug(baseSlug, existing);
  await prisma.event.create({
    data: {
      ...(await eventData(req.body)),
      slug: slug,
      authorId: req.user.id,
    },
  });
  return res.status(201).json({ slug });
};

export async function updateEvent(req, res, next) {
  const slug = req.params.slug.toLowerCase();
  const event = await prisma.event.findFirst({ where: { slug: slug } });
  if (!event) {
    return res.status(404).json({ error: { message: "Event not found" } });
  }
  // whoever created it or TRISTON can edit
  if (event.authorId != req.user.id && req.user.role != "TRISTON") {
    return res.status(403).json({
      error: { message: "You do not have permissions to update this event" },
    });
  }
  const invalid = validateEventFields(req.body);
  if (invalid) {
    return res.status(400).json({ error: { message: invalid } });
  }

  // only make a new slug when the title would slugify differently,
  // otherwise keep the old one so the url doesn't change
  const baseSlug = slugify(req.body.title);
  let newSlug = event.slug;
  if (baseSlug !== slugify(event.title)) {
    const existing = await prisma.event.findMany({
      where: { slug: { startsWith: baseSlug }, NOT: { id: event.id } },
      select: { slug: true },
    });
    newSlug = getMaxSlug(baseSlug, existing);
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { ...(await eventData(req.body)), slug: newSlug },
    select: {
      title: true,
      slug: true,
      host: true,
      startTime: true,
      endTime: true,
      date: true,
      location: true,
      description: true,
    },
  });
  return res.status(200).json(updated);
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

// body: { status: "GOING" | "NOT_GOING" | null }, null clears your answer
export async function rsvpEvent(req, res, next) {
  const status = req.body.status;
  if (status !== null && status !== "GOING" && status !== "NOT_GOING") {
    return res
      .status(400)
      .json({ error: { message: "status must be GOING, NOT_GOING or null" } });
  }
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug.toLowerCase() },
    select: { id: true, authorId: true },
  });
  if (!event) {
    return res.status(404).json({ error: { message: "Event not found" } });
  }
  if (status === null) {
    await prisma.eventRsvp.deleteMany({
      where: { eventId: event.id, userId: req.user.id },
    });
  } else {
    await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: event.id, userId: req.user.id } },
      create: { eventId: event.id, userId: req.user.id, status },
      update: { status },
    });
  }
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: event.id },
    ...rsvpSelect,
  });
  return res
    .status(200)
    .json(
      summarizeRsvps(
        rsvps,
        req.user.id,
        req.user.id === event.authorId || req.user.role === "TRISTON",
      ),
    );
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
      return res.status(404).json({ error: { message: "Event not found" } });
    }
    const commentContent = req.body.content?.trim() || "";
    if (commentContent.length < 2) {
      return res
        .status(400)
        .json({ error: { message: "Comment must be at least 2 characters" } });
    }
    // replying to another comment, it has to be on the same event
    const parentId = req.body.parentId || null;
    if (parentId) {
      const parent = await prisma.eventComment.findUnique({
        where: { id: parentId },
        select: { eventId: true },
      });
      if (!parent || parent.eventId !== currentEvent.id) {
        return res
          .status(400)
          .json({ error: { message: "The comment you replied to is gone" } });
      }
    }
    const newComment = await prisma.eventComment.create({
      data: {
        eventId: currentEvent.id,
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

// body: { type: "LIKE" | "DISLIKE" | null }, null removes your reaction
export async function reactToEventComment(req, res, next) {
  const type = parseReactionType(req.body.type);
  if (type === undefined) {
    return res
      .status(400)
      .json({ error: { message: "type must be LIKE, DISLIKE or null" } });
  }
  const commentId = req.params.commentId;
  const comment = await prisma.eventComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) {
    return res.status(404).json({ error: { message: "Comment not found" } });
  }
  if (type === null) {
    await prisma.eventCommentReaction.deleteMany({
      where: { commentId, userId: req.user.id },
    });
  } else {
    await prisma.eventCommentReaction.upsert({
      where: { commentId_userId: { commentId, userId: req.user.id } },
      create: { commentId, userId: req.user.id, type },
      update: { type },
    });
  }
  const reactions = await prisma.eventCommentReaction.findMany({
    where: { commentId },
    ...reactionSelect,
  });
  return res.status(200).json(summarizeReactions(reactions, req.user.id));
}

// deleting a comment also deletes its replies (onDelete: Cascade in the schema)
export async function deleteEventComment(req, res, next) {
  try {
    const comment = await prisma.eventComment.findUnique({
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
    await prisma.eventComment.delete({ where: { id: comment.id } });
    return res.status(201).json({ message: "DELETED" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: { message: "Failed to delete comment" } });
  }
}

export async function getEvents(req, res, next) {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: threeDaysAgo,
        },
      },
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
        _count: { select: { rsvps: { where: { status: "GOING" } } } },
      },
    });
    res
      .status(200)
      .json(
        events.map(({ _count, ...event }) => ({
          ...event,
          goingCount: _count.rsvps,
        })),
      );
  } catch (error) {
    console.log(error);
    next(error);
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
        authorId: true,
        author: { select: { username: true } },
        rsvps: rsvpSelect,

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

    if (event === null) {
      return res.status(404).json({ error: { message: "Event not found" } });
    }
    // req.user is only set when the request had a valid token (optionalAuth)
    const userId = req.user?.id;
    const { rsvps, comments, authorId, ...rest } = event;
    res.status(200).json({
      ...rest,
      ...summarizeRsvps(
        rsvps,
        userId,
        userId === authorId || req.user?.role === "TRISTON",
      ),
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

// --- add to calendar (.ics file) ---

// events are saved as midnight UTC of their day plus "HH:MM" times with no timezone,
// so calendars get "floating" times: 5:00 PM shows as 5:00 PM in whatever timezone the calendar is in
function eventTimes(event) {
  const [y, m, d] = event.date.toISOString().slice(0, 10).split("-").map(Number);
  const [sh, sm] = event.startTime.split(":").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, sh, sm));
  let end;
  if (event.endTime) {
    const [eh, em] = event.endTime.split(":").map(Number);
    end = new Date(Date.UTC(y, m - 1, d, eh, em));
    // ends at or before it starts (like 5 PM - 2 AM) means it ends the next day
    if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
  } else {
    // calendars need an end, guess 2 hours when there isn't one
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }
  return { start, end };
}

// 20261231T170000 (no Z on the end = floating time)
const icsDate = (date) => date.toISOString().slice(0, 19).replace(/[-:]/g, "");

// commas, semicolons, backslashes and newlines have to be escaped in .ics text
const icsText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// .ics lines can't be longer than 75 bytes, longer ones continue on the next line after a space
function foldLine(line) {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    // the space at the start of continuation lines counts too
    if (size + bytes > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

// the frontend's address, for the "view event" link in the calendar entry
function frontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  try {
    return JSON.parse(process.env.CORS)[0];
  } catch {
    return null;
  }
}

// GET /events/:slug/calendar.ics - Apple Calendar, Outlook, etc. open this to add the event
export async function getEventCalendar(req, res, next) {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug.toLowerCase() },
  });
  if (!event) {
    return res.status(404).json({ error: { message: "Event not found" } });
  }
  const { start, end } = eventTimes(event);
  const site = frontendUrl();
  const link = site ? `${site}/events/${event.slug}` : null;
  const description = [event.description, link].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Triston Land//Blog Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@triston-land-blog`,
    `DTSTAMP:${icsDate(new Date())}Z`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    description && `DESCRIPTION:${icsText(description)}`,
    event.location && `LOCATION:${icsText(event.location)}`,
    link && `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${event.slug}.ics"`);
  return res.send(lines.map(foldLine).join("\r\n") + "\r\n");
}
