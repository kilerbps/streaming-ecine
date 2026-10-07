import { getTranslations } from 'next-intl/server';
import { formatDate } from '@/lib/format';
import { getArticle } from '@/server/data';
import { ogCard, ogContentType, ogSize } from '@/server/og';

export const size = ogSize;
export const contentType = ogContentType;
export const alt = 'Actualité E-Ciné';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, t] = await Promise.all([getArticle(slug), getTranslations('kinds')]);
  return ogCard({
    eyebrow: t(article.kind),
    title: article.title,
    meta: formatDate(article.publishedAt),
  });
}
