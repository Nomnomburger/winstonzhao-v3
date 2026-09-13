import ClientLayout from '../ClientLayout';
import { getProjects } from '../../../sanity/lib/projects';

// Re-fetch the project list from Sanity at most once a minute.
export const revalidate = 60;

/**
 * Layout for the horizontally-scrolling panel routes (home, projects,
 * playground, about, contact). Fetches the project list on the server so the
 * home panel can render its featured grid and project list without a
 * client-side request.
 */
export default async function ScrollerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await getProjects();
  return <ClientLayout projects={projects}>{children}</ClientLayout>;
}
