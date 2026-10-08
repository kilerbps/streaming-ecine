'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Image as ImageData } from '@ecine/contracts';
import { MediaImage } from './media-image';

export interface FeaturedItem {
  key: string;
  title: string;
  /** Titre dessiné (PNG ou SVG transparent) : remplace le titre en Archivo s'il existe. */
  titleImage?: ImageData | null;
  image: ImageData | null;
  color?: string | null;
  focal?: string | null;
  /** Métadonnées (genre, langue, durée), espacées et jamais enchaînées par des points médians. */
  meta?: string[];
  /** Boutons : un seul principal (Regarder) et un secondaire (Ma liste). */
  actions?: ReactNode;
}

/** Textes accessibles, tirés de messages/fr.json par l'écran ({index}, {total}, {title}). */
export interface FeaturedLabels {
  region: string;
  carousel: string;
  slide: string;
  show: string;
}

const ADVANCE_EVERY_MS = 7_000;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/**
 * Affiche à la une : 5 titres au plus. Une seule image par titre, recadrée par le point focal :
 * carte 4:5 (rayon 16) sur mobile, plein cadre 16:9 sur PC avec le texte dans les 40 % de gauche.
 * Voile bas pour la lisibilité. Avance toutes les 7 s seulement si elle est visible et sans geste en
 * cours ; s'arrête définitivement au premier glissement. Jamais d'avance automatique en mode allégé,
 * en économie de données ou en mouvement réduit. Tirets de progression cliquables.
 */
export function Featured({ items, labels }: { items: FeaturedItem[]; labels: FeaturedLabels }) {
  const shown = items.slice(0, 5);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const visible = useRef(false);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.6);
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(node);
    const onScroll = () => setActive(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)));
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (stopped || shown.length < 2) return;
    const html = document.documentElement;
    const calm =
      html.dataset.perf === 'lite' ||
      html.dataset.savedata === 'on' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) return;
    const timer = window.setInterval(() => {
      const node = track.current;
      if (!node || !visible.current || document.hidden) return;
      const next = (Math.round(node.scrollLeft / node.clientWidth) + 1) % shown.length;
      node.scrollTo({ left: next * node.clientWidth, behavior: 'smooth' });
    }, ADVANCE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [stopped, shown.length]);

  if (shown.length === 0) return null;
  return (
    // Zone d'image : toujours en Nuit, quel que soit le thème (voile sombre, texte et boutons blancs).
    <section
      data-theme="dark"
      aria-roledescription={labels.carousel}
      aria-label={labels.region}
      className="relative"
    >
      <div
        ref={track}
        onPointerDown={() => setStopped(true)}
        onWheel={() => setStopped(true)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {shown.map((item, index) => (
          <article
            key={item.key}
            aria-roledescription={labels.slide}
            aria-label={fill('{index} / {total} : {title}', {
              index: index + 1,
              total: shown.length,
              title: item.title,
            })}
            className="w-full shrink-0 snap-start px-4 lg:px-0"
          >
            <div className="relative overflow-hidden rounded-lg lg:rounded-none">
              <MediaImage
                image={item.image}
                color={item.color}
                focal={item.focal}
                ratio={null}
                sizes="(min-width: 1056px) 100vw, calc(100vw - 32px)"
                preload={index === 0}
                className="aspect-[4/5] lg:aspect-video lg:max-h-[80dvh]"
              />
              <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 pb-12 lg:bottom-[12%] lg:w-[40%] lg:p-0 lg:pl-12">
                {item.titleImage ? (
                  <MediaImage
                    image={item.titleImage}
                    ratio="3/2"
                    sizes="(min-width: 1056px) 30vw, 60vw"
                    className="max-w-[60%] bg-transparent"
                    imageClassName="object-contain object-left-bottom"
                  />
                ) : (
                  <h2 className="font-display text-[34px] font-extrabold leading-[38px] tracking-[-0.02em] lg:text-[56px] lg:leading-[60px]">
                    {item.title}
                  </h2>
                )}
                {item.meta?.length ? (
                  <ul className="meta flex flex-wrap gap-x-3 text-text">
                    {item.meta.map((value) => (
                      <li key={value}>{value}</li>
                    ))}
                  </ul>
                ) : null}
                {item.actions ? <div className="flex flex-wrap gap-2">{item.actions}</div> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      {shown.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1 lg:bottom-6 lg:justify-start lg:pl-12">
          {shown.map((item, index) => (
            <button
              key={item.key}
              type="button"
              aria-label={fill(labels.show, { title: item.title })}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => {
                setStopped(true);
                const node = track.current;
                node?.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
              }}
              className="grid h-6 w-7 place-items-center"
            >
              <span
                className={`block h-1 w-6 origin-center rounded-full transition-[transform,background-color] duration-[var(--dur-base)] ease-[var(--ease-standard)] ${
                  index === active ? 'scale-x-100 bg-text' : 'scale-x-50 bg-border-strong'
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
