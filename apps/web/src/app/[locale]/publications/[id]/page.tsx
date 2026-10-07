import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { LikeButton } from '@/components/features/interactions/like-button';
import { ShareButton } from '@/components/features/interactions/share-button';
import { formatDate, truncate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { getLikedIds, getPost } from '@/server/data';
import { loadOrNotFound } from '@/server/not-found';
import { pageMetadata } from '@/server/seo';

type Props = PageProps<'/[locale]/publications/[id]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const post = await loadOrNotFound(() => getPost(id), `/${locale}/publications/${id}`);
  return pageMetadata({
    locale: locale as Locale,
    path: `/publications/${post.id}`,
    title: truncate(post.caption, 55),
    description: post.caption,
    image: post.images[0],
  });
}

export default async function PostPage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  const post = await loadOrNotFound(() => getPost(id), `/${locale}/publications/${id}`);
  const [tk, liked] = await Promise.all([getTranslations('kinds'), getLikedIds('POST', [post.id])]);
  return (
    <article className="container-page max-w-3xl pt-8 md:pt-12">
      <p className="eyebrow text-muted">
        {tk('POST')} · {formatDate(post.publishedAt)}
      </p>
      <h1 className="sr-only">{truncate(post.caption, 80)}</h1>
      <ul className="mt-6 flex flex-col gap-4">
        {post.images.map((image, index) => (
          <li key={`${image.src}-${index}`}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 720px, 100vw"
              className="h-auto w-full"
              preload={index === 0}
            />
          </li>
        ))}
      </ul>
      <p className="mt-6 whitespace-pre-line text-lg">{post.caption}</p>
      <div className="-ml-2 mt-4 flex items-center">
        <LikeButton
          targetType="POST"
          targetId={post.id}
          initialLiked={liked.includes(post.id)}
          initialCount={post.likeCount}
        />
        <ShareButton title={truncate(post.caption, 60)} path={routes.post(locale, post.id)} />
      </div>
    </article>
  );
}
