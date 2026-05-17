import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '@lib/site';

export const prerender = true;

type ImageJSX = ConstructorParameters<typeof ImageResponse>[0];

interface PathProps {
  title: string;
  kicker: string;
}

export async function getStaticPaths() {
  const blog = await getCollection('blog', ({ data }) => !data.draft);
  const projects = await getCollection('projects', ({ data }) => !data.draft);

  const blogPaths = blog.map((post: CollectionEntry<'blog'>) => ({
    params: { slug: `blog/${post.slug}` },
    props: { title: post.data.title, kicker: post.data.category },
  }));

  const projectPaths = projects.map((p: CollectionEntry<'projects'>) => ({
    params: { slug: `portfolio/${p.slug}` },
    props: { title: p.data.title, kicker: p.data.category },
  }));

  const pages: Array<{ slug: string; title: string; kicker: string }> = [
    { slug: 'default', title: SITE.name, kicker: 'Editorial Photography · London' },
    { slug: 'home', title: SITE.name, kicker: SITE.tagline },
    { slug: 'blog', title: 'The Journal', kicker: SITE.shortName },
    { slug: 'portfolio', title: 'Selected Work', kicker: SITE.shortName },
    { slug: 'lookbook', title: 'Pricing', kicker: SITE.shortName },
    { slug: 'about', title: 'Meet Atunbi', kicker: SITE.shortName },
    { slug: 'contact', title: 'Begin The Conversation', kicker: SITE.shortName },
  ];

  return [
    ...pages.map((p) => ({ params: { slug: p.slug }, props: { title: p.title, kicker: p.kicker } })),
    ...blogPaths,
    ...projectPaths,
  ];
}

const burgundy = '#6B1A2A';
const paper = '#F5EFE6';
const ink = '#1A1410';
const gold = '#B8965A';

export const GET: APIRoute<PathProps> = async ({ props }) => {
  const { title, kicker } = props;

  const node: ImageJSX = {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 70px',
        background: paper,
        color: ink,
        fontFamily: 'serif',
        position: 'relative',
        borderTop: `12px solid ${burgundy}`,
        borderBottom: `12px solid ${burgundy}`,
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: burgundy },
            children: [
              { type: 'div', props: { children: SITE.issueLabel } },
              { type: 'div', props: { children: SITE.issueDate } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: 24 },
            children: [
              { type: 'div', props: { style: { fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: burgundy }, children: kicker } },
              { type: 'div', props: { style: { fontSize: 84, fontWeight: 300, lineHeight: 1.05, color: ink, fontStyle: 'italic' }, children: title } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: ink },
            children: [
              { type: 'div', props: { style: { fontSize: 36, fontStyle: 'italic', color: burgundy }, children: 'The Atunbi Experience' } },
              { type: 'div', props: { style: { color: gold }, children: 'theatunbiexperience.com' } },
            ],
          },
        },
      ],
    },
  };

  return new ImageResponse(node, { width: 1200, height: 630 });
};
