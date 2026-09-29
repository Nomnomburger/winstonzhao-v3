import HomePage from '@/components/HomePage';
import { getProjects } from '@/lib/projects';

// Re-fetch projects from Sanity at most once a minute
export const revalidate = 60;

export default async function Page() {
  const projects = await getProjects();
  return <HomePage projects={projects} />;
}
