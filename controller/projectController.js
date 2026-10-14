import { prisma } from "../lib/prisma.ts";
import { getMaxSlug, slugify } from "./helpers.js";

// fields from the form -> what gets saved
// empty strings become null, server fields are cleared for anything that isn't a server
function projectData(body) {
  const isServer = body.isServer === true;
  return {
    title: body.title,
    description: body.description || "", // optional, saved as "" so the column can stay required
    categoryId: body.categoryId,
    url: body.url || null,
    linkLabel: body.linkLabel || null,
    sourceUrl: body.sourceUrl || null,
    imageUrl: body.imageUrl || null,
    pinned: Boolean(body.pinned),
    // left out = keep it as is (or now, for a new project)
    date: body.date ? new Date(body.date) : undefined,
    isServer,
    serverGame: isServer ? body.serverGame : null,
    serverAddress: isServer ? body.serverAddress : null,
    serverRunning: isServer ? Boolean(body.serverRunning) : false,
  };
}

const projectSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  url: true,
  linkLabel: true,
  sourceUrl: true,
  imageUrl: true,
  pinned: true,
  position: true,
  date: true,
  isServer: true,
  serverGame: true,
  serverAddress: true,
  serverRunning: true,
  createdAt: true,
  updatedAt: true,
};

// the form sends a category id, make sure it's real before saving
async function categoryMissing(req, res) {
  const category = await prisma.projectCategory.findUnique({
    where: { id: req.body.categoryId },
    select: { id: true },
  });
  if (category) return false;
  res.status(400).json({
    error: {
      message: "That category doesn't exist anymore",
      fields: { categoryId: "That category doesn't exist anymore, pick another" },
    },
  });
  return true;
}

// the order projects show in:
// - automatic (nobody has dragged them yet, or it was reset): pinned, then running servers, then
//   newest by date (editable, so projects can be back-dated), same date = the one added last first
// - custom (the admin dragged them): exactly the saved order, projects added since then go first
async function listProjects() {
  const projects = await prisma.project.findMany({
    orderBy: [
      { pinned: "desc" },
      { serverRunning: "desc" },
      { date: "desc" },
      { createdAt: "desc" },
    ],
    select: projectSelect,
  });
  const custom = projects.some((p) => p.position !== null);
  if (!custom) return projects;
  // sort is stable, so the unpositioned (new) ones keep their automatic order at the top
  return projects.sort((a, b) => {
    if (a.position === null || b.position === null) {
      return (b.position === null) - (a.position === null);
    }
    return a.position - b.position;
  });
}

export async function getProjects(req, res, next) {
  res.status(200).json(await listProjects());
}

// body { ids: [...] } in the order they should show, saved all together
export async function saveOrder(req, res, next) {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return res.status(400).json({ error: { message: "ids must be a list of project ids" } });
  }
  const found = await prisma.project.count({ where: { id: { in: ids } } });
  if (found !== ids.length || new Set(ids).size !== ids.length) {
    return res.status(409).json({
      error: { message: "The projects changed while you were reordering. Refresh and try again." },
    });
  }
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.project.update({ where: { id }, data: { position: index } }),
    ),
  );
  res.status(200).json(await listProjects());
}

// back to automatic: pinned, then running servers, then newest
export async function resetOrder(req, res, next) {
  await prisma.project.updateMany({ data: { position: null } });
  res.status(200).json(await listProjects());
}

export async function getProject(req, res, next) {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: projectSelect,
  });
  if (!project) {
    return res.status(404).json({ error: { message: "Project not found" } });
  }
  res.status(200).json(project);
}

export async function createProject(req, res, next) {
  if (await categoryMissing(req, res)) return;
  const project = await prisma.project.create({
    data: { ...projectData(req.body), authorId: req.user.id },
    select: projectSelect,
  });
  res.status(201).json(project);
}

export async function updateProject(req, res, next) {
  if (await categoryMissing(req, res)) return;
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: projectData(req.body),
      select: projectSelect,
    });
    res.status(200).json(project);
  } catch (error) {
    // P2025 = no project with that id
    if (error.code === "P2025") {
      return res.status(404).json({ error: { message: "Project not found" } });
    }
    next(error);
  }
}

// quick on / off for temporary game servers: body { running: true | false }
export async function setServerRunning(req, res, next) {
  if (typeof req.body.running !== "boolean") {
    return res
      .status(400)
      .json({ error: { message: "running must be true or false" } });
  }
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { isServer: true },
  });
  if (!project) {
    return res.status(404).json({ error: { message: "Project not found" } });
  }
  if (!project.isServer) {
    return res.status(400).json({ error: { message: "That project isn't a server" } });
  }
  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: { serverRunning: req.body.running },
    select: projectSelect,
  });
  res.status(200).json(updated);
}

export async function deleteProject(req, res, next) {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: { message: "Project not found" } });
    }
    next(error);
  }
}

// --- live minecraft status ---
// looked up from here (not from visitors' browsers) and cached for a minute so a busy page
// doesn't spam anyone's api. two free services because either one can wrongly say a server
// is offline now and then (mcsrvstat kept saying hypixel was down while mcstatus.io had it up)
const statusCache = new Map(); // address -> { at, data }
const CACHE_MS = 60 * 1000;
async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "tristonland.com project hub" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

// both return { online, players: { online, max } | null, version }
const statusSources = [
  async (address) => {
    const s = await getJson(
      `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address)}`,
    );
    return {
      online: Boolean(s.online),
      players: s.players ? { online: s.players.online, max: s.players.max } : null,
      version: s.version?.name_clean || null,
    };
  },
  async (address) => {
    const s = await getJson(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`);
    return {
      online: Boolean(s.online),
      players: s.players ? { online: s.players.online, max: s.players.max } : null,
      version: s.version || null,
    };
  },
];

// first source that says online wins; offline only if every source that answered says so
async function lookUpMinecraft(address) {
  let answered = null;
  for (const source of statusSources) {
    try {
      const data = await source(address);
      if (data.online) return data;
      answered = data;
    } catch (error) {
      console.log("minecraft status lookup failed:", error.message);
    }
  }
  if (answered) return answered;
  throw new Error("no status source answered");
}

export async function getServerStatus(req, res, next) {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { isServer: true, serverGame: true, serverAddress: true, serverRunning: true },
  });
  if (!project || !project.isServer) {
    return res.status(404).json({ error: { message: "Server not found" } });
  }
  if (project.serverGame !== "MINECRAFT") {
    return res
      .status(400)
      .json({ error: { message: "Live status only works for Minecraft servers" } });
  }
  if (!project.serverRunning) {
    return res.status(200).json({ online: false });
  }

  const cached = statusCache.get(project.serverAddress);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return res.status(200).json(cached.data);
  }
  try {
    const data = await lookUpMinecraft(project.serverAddress);
    statusCache.set(project.serverAddress, { at: Date.now(), data });
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: { message: "Couldn't check the server right now" } });
  }
}

// --- categories ---

const OTHER_SLUG = "other"; // can't be deleted, projects from deleted categories go here

// alphabetical with "Other" at the end, plus how many projects each has
export async function getCategories(req, res, next) {
  const categories = await prisma.projectCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { projects: true } } },
  });
  const list = categories.map(({ _count, ...category }) => ({
    ...category,
    projectCount: _count.projects,
    deletable: category.slug !== OTHER_SLUG,
  }));
  list.sort((a, b) => (a.slug === OTHER_SLUG) - (b.slug === OTHER_SLUG));
  res.status(200).json(list);
}

export async function createCategory(req, res, next) {
  const name = req.body.name;
  const taken = await prisma.projectCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (taken) {
    return res.status(409).json({
      error: {
        message: "There's already a category with that name",
        fields: { name: "There's already a category with that name" },
      },
    });
  }
  // the slug is what shows in the filter link, like ?type=steam-mods
  const baseSlug = slugify(name) || "category";
  const existing = await prisma.projectCategory.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const category = await prisma.projectCategory.create({
    data: { name, slug: getMaxSlug(baseSlug, existing) },
    select: { id: true, name: true, slug: true },
  });
  res.status(201).json({ ...category, projectCount: 0, deletable: true });
}

// any projects in it move to "Other" first, both steps happen together or not at all
export async function deleteCategory(req, res, next) {
  const category = await prisma.projectCategory.findUnique({
    where: { id: req.params.id },
    select: { id: true, slug: true },
  });
  if (!category) {
    return res.status(404).json({ error: { message: "Category not found" } });
  }
  if (category.slug === OTHER_SLUG) {
    return res.status(400).json({ error: { message: "\"Other\" can't be deleted" } });
  }
  const other = await prisma.projectCategory.findUnique({
    where: { slug: OTHER_SLUG },
    select: { id: true },
  });
  const [moved] = await prisma.$transaction([
    prisma.project.updateMany({
      where: { categoryId: category.id },
      data: { categoryId: other.id },
    }),
    prisma.projectCategory.delete({ where: { id: category.id } }),
  ]);
  res.status(200).json({ message: "Deleted", movedToOther: moved.count });
}
