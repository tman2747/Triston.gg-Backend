import { remark } from "remark";
import strip from "strip-markdown";
import remarkParse from "remark-parse";

export function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD") // remove accents
    .replace(/[\u0300-\u036f]/g, "") // accent cleanup
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphen
    .replace(/-+/g, "-"); // collapse hyphens
}

export function getMaxSlug(baseSlug, existing) {
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
