import type { ImageSource } from '@/lib/image';

// What the home page needs to know about each project (serialisable, so it
// can be passed from the server page into the client panels).
export interface ProjectCardData {
  _id: string;
  title: string;
  slug: string;
  year?: number;
  featured?: boolean;
  description?: string;
  coverImage?: ImageSource;
}
