/**
 * fetchProjects.mjs — Sanity CMS data source
 * Replaces the old Behance RSS scraper.
 * All project data now lives in Sanity (projectId: 7efeaozz).
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: '7efeaozz',
  dataset: 'production',
  apiVersion: '2025-04-21',
  useCdn: true,
})

// GROQ query — fetch all visible projects ordered by featured first, then displayOrder
const PROJECTS_QUERY = `
  *[_type == "project" && visible == true] | order(featured desc, displayOrder asc) {
    "id": _id,
    title,
    "slug": slug.current,
    year,
    client,
    role,
    tags,
    description,
    "thumbnail": coverImage.asset->url + "?w=800&auto=format",
    "coverImage": coverImage.asset->url + "?w=1600&auto=format",
    "coverImageHotspot": coverImage.hotspot,
    gallery[] {
      "url": image.asset->url + "?w=1600&auto=format",
      "hotspot": image.hotspot,
      aspectRatio,
      caption
    },
    vimeoUrl,
    "loopVideoUrl": loopVideo.asset->url,
    liveUrl,
    collaborators,
    "hasPassword": defined(password) && password != "",
    password,
    featured,
    displayOrder,
  }
`

export async function fetchAllProjects() {
  try {
    console.log('[sanity] Fetching projects...')
    const projects = await client.fetch(PROJECTS_QUERY)
    console.log(`[sanity] ✓ ${projects.length} project(s) fetched`)
    return {
      fetchedAt: new Date().toISOString(),
      projects,
    }
  } catch (err) {
    console.error('[sanity] Fetch failed:', err.message)
    return { fetchedAt: null, projects: [] }
  }
}

// Legacy alias — some pages may still call these
export const fetchProjects = fetchAllProjects
export const fetchProjectsWithTags = fetchAllProjects
