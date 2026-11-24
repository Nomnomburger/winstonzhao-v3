interface ProjectOrder {
  year?: number;
  order?: number;
  orderRank?: string;
  featured?: boolean;
}

function compareOrder(a: ProjectOrder, b: ProjectOrder): number {
  const first = a.order ?? Infinity;
  const second = b.order ?? Infinity;
  return first === second ? 0 : first < second ? -1 : 1;
}

// Drag-and-drop ranks take priority once set; unranked projects follow.
function compareRank(a: ProjectOrder, b: ProjectOrder): number {
  if (a.orderRank && b.orderRank) {
    return a.orderRank === b.orderRank ? 0 : a.orderRank < b.orderRank ? -1 : 1;
  }
  return a.orderRank ? -1 : b.orderRank ? 1 : 0;
}

// Until ranks are set, preserve newest year first and the legacy within-year order.
export function sortProjectList<T extends ProjectOrder>(projects: readonly T[]): T[] {
  return [...projects].sort(
    (a, b) => compareRank(a, b) || (b.year ?? 0) - (a.year ?? 0) || compareOrder(a, b),
  );
}

// Keep featured cards together, respecting drag-and-drop order within each section.
export function sortHomeProjects<T extends ProjectOrder>(projects: readonly T[]): T[] {
  const featured = projects.filter((project) => project.featured).sort(
    (a, b) => compareRank(a, b) || compareOrder(a, b) || (b.year ?? 0) - (a.year ?? 0),
  );
  return [
    ...featured,
    ...sortProjectList(projects.filter((project) => !project.featured)),
  ];
}
