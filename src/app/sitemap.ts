import type { MetadataRoute } from 'next';
import { SEO_PATHS } from '@/lib/seo/pages';
import { absoluteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return SEO_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/preview' ? 0.7 : 0.85,
  }));
}
