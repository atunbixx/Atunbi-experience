import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '@lib/site';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  return rss({
    title: `${SITE.name} — Journal`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    customData: `<language>en-gb</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      categories: [post.data.category, ...post.data.tags],
      author: post.data.author,
    })),
    trailingSlash: false,
  });
};
