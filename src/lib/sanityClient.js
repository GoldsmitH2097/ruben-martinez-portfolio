import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: '7efeaozz',
  dataset: 'production',
  apiVersion: '2025-04-21',
  useCdn: true, // cached, fast — fine for build-time fetching
})

// Image URL builder helper
export function imageUrl(source) {
  if (!source?.asset?._ref) return null
  // Sanity CDN image URL from asset reference
  const ref = source.asset._ref
  // ref format: image-{id}-{width}x{height}-{format}
  const [, id, dimensions, format] = ref.split('-')
  return `https://cdn.sanity.io/images/7efeaozz/production/${id}-${dimensions}.${format}`
}
