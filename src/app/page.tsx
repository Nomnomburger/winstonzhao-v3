import HomePage from '@/components/home/HomePage';
import { getProjects } from '../../sanity/lib/projects';

// Re-fetch the project list from Sanity at most once a minute.
export const revalidate = 60;

export default async function Home() {
  const projects = await getProjects();
  return <HomePage projects={projects} />;
}
