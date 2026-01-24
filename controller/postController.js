import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "../lib/prisma.ts";
import { remark } from "remark";
import strip from "strip-markdown";
import remarkParse from "remark-parse";

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD") // remove accents
    .replace(/[\u0300-\u036f]/g, "") // accent cleanup
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphen
    .replace(/-+/g, "-"); // collapse hyphens
}

function getMaxSlug(baseSlug, existing) {
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escapeRegex(baseSlug)}-(\\d+)$`);

  let max = 0;
  let baseExists = false;

  for (const { slug } of existing) {
    if (slug === baseSlug) baseExists = true;

    const match = slug.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }

  const slug = !baseExists && max === 0 ? baseSlug : `${baseSlug}-${max + 1}`;
  return slug;
}

export async function getExcerpt(content, maxLength = 134) {
  const file = await remark().use(remarkParse).use(strip).process(content);

  let text = String(file).replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim() + "...";
  }

  return text;
}

export async function createPost(req, res, next) {
  console.log(req.user);
  if (req.user?.role !== "TRISTON") {
    // return proper status with json message

    // might  be able to bundle something like this into
    // a authchecker middleware but for now it works
    console.log("no access");
    //todo fix status
    return res.status(400).json({});
  }
  // probably should pass this in to a validation middleware
  const title = req.body.title;
  const baseSlug = slugify(req.body.title);
  const content = req.body.content;
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
