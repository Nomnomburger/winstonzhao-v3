import { NextResponse } from 'next/server';
import { client } from '../../../../sanity/lib/client';

export async function GET() {
  try {
    const query = `*[_type == "project"] | order(year desc) {
      _id,
      title,
      year,
      description,
      coverImage,
      tags,
      slug
    }`;
    
    const projects = await client.fetch(query);
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

