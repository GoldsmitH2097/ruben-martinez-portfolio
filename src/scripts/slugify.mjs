export function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9\s-]/g, '')     // remove special chars
    .trim()
    .replace(/\s+/g, '-')             // spaces to hyphens
    .replace(/-+/g, '-');             // collapse multiple hyphens
}
