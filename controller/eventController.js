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
  console.log("hit");
  return;
}
