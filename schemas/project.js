import { defineType, defineField } from 'sanity'

const TAG_OPTIONS = [
  { title: 'Art Direction', value: 'art-direction' },
  { title: 'Branding', value: 'branding' },
  { title: 'Motion', value: 'motion' },
  { title: 'Social Media', value: 'social-media' },
  { title: 'AI', value: 'ai' },
  { title: '3D', value: '3d' },
  { title: 'Photography', value: 'photography' },
  { title: 'Web & App', value: 'web-app' },
]

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],
  fields: [
    // ── Core ─────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. "Logitech — Quickstrike Mouse Launch"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (R) => R.required().min(2000).max(2030),
    }),
    defineField({
      name: 'client',
      title: 'Client (leave blank for NDA)',
      type: 'string',
      description: 'Visible on the project page. Leave blank to omit.',
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. "Art Direction, Motion Design"',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: TAG_OPTIONS },
      validation: (R) => R.min(1),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 6,
      description: 'Case study text. Write what you did, why it matters.',
    }),
    // ── Media ─────────────────────────────────────────────
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Shown on the homepage card. 16:9 recommended.',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      description: 'Images and loop videos for the project page. Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'galleryImage',
          title: 'Image',
          fields: [
            defineField({ name: 'image', type: 'image', options: { hotspot: true }, validation: (R) => R.required() }),
            defineField({
              name: 'aspectRatio',
              title: 'Aspect Ratio',
              type: 'string',
              options: { list: [
                { title: '16:9 (landscape)', value: '16:9' },
                { title: '9:16 (portrait / phone)', value: '9:16' },
                { title: '1:1 (square)', value: '1:1' },
                { title: '4:3 (classic)', value: '4:3' },
              ]},
              initialValue: '16:9',
            }),
            defineField({ name: 'caption', type: 'string', title: 'Caption (optional)' }),
          ],
          preview: {
            select: { media: 'image', title: 'caption', subtitle: 'aspectRatio' },
            prepare: ({ media, title, subtitle }) => ({
              title: title || 'Image',
              subtitle: subtitle,
              media,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'vimeoUrl',
      title: 'Vimeo URL',
      type: 'url',
      description: 'e.g. https://vimeo.com/123456789 — embedded as the hero of the project page.',
    }),
    defineField({
      name: 'loopVideo',
      title: 'Loop Video (MP4)',
      type: 'file',
      options: { accept: 'video/mp4,video/webm' },
      description: 'Silent autoplay loop shown in the gallery. Better than GIF.',
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live URL (own sites only)',
      type: 'url',
      description: 'Only for your own projects. Shown as the last element of the case study.',
    }),
    // ── Credits ───────────────────────────────────────────
    defineField({
      name: 'collaborators',
      title: 'Collaborators',
      type: 'string',
      description: 'e.g. "With Marta Fernández (video production)"',
    }),
    // ── Access & Display ──────────────────────────────────
    defineField({
      name: 'password',
      title: 'Password (NDA projects)',
      type: 'string',
      description: 'If set, the project page is password-protected. Name and thumbnail are always visible.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      description: 'Pinned to top on homepage regardless of display order.',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Lower = higher on the page. Set manually.',
      validation: (R) => R.required(),
      initialValue: 99,
    }),
    defineField({
      name: 'visible',
      title: 'Visible',
      type: 'boolean',
      initialValue: true,
      description: 'Hide from site without deleting.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      year: 'year',
      media: 'coverImage',
      visible: 'visible',
      featured: 'featured',
    },
    prepare: ({ title, year, media, visible, featured }) => ({
      title: `${featured ? '★ ' : ''}${title}`,
      subtitle: `${year || '—'} ${!visible ? '· HIDDEN' : ''}`,
      media,
    }),
  },
})
