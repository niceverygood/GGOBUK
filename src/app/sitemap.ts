import type { MetadataRoute } from 'next';
import { SEO_PATHS } from '@/lib/seo/pages';
import { ILJU_PATHS } from '@/lib/seo/ilju_seo';
import { absoluteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [...SEO_PATHS, ...ILJU_PATHS];
  return paths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/ilju/') ? 0.6 : 0.85,
  }));
}
