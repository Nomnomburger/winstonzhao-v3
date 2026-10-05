interface ProjectOrder {
  year?: number;
  order?: number;
  featured?: boolean;
}

function compareOrder(a: ProjectOrder, b: ProjectOrder): number {
  const first = a.order ?? Infinity;
  const second = b.order ?? Infinity;
  return first === second ? 0 : first < second ? -1 : 1;
}

// A previous manual order must never put an older year above a newer one.
// Within a year, Sanity's ascending order preserves the researched chronology.
export function sortProjectList<T extends ProjectOrder>(projects: readonly T[]): T[] {
  return [...projects].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || compareOrder(a, b),
  );
}

// Featured cards retain their curated order; the list below is chronological.
export function sortHomeProjects<T extends ProjectOrder>(projects: readonly T[]): T[] {
  const featured = projects.filter((project) => project.featured).sort(
    (a, b) => compareOrder(a, b) || (b.year ?? 0) - (a.year ?? 0),
  );
  return [
    ...featured,
    ...sortProjectList(projects.filter((project) => !project.featured)),
  ];
}
