import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { hasRole, type Locale } from '@ecine/contracts';
import {
  DesignToolbar,
  MenuDemo,
  SegmentedDemo,
  SheetDemo,
  SpringDemo,
  SwitchDemo,
  ToastDemo,
} from '@/components/design/design-demos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TextField } from '@/components/ui/field';
import { Featured } from '@/components/ui/featured';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ACTIVE_STYLE, SOLAR_ICONS, type IconName } from '@/components/ui/icons/solar.generated';
import { Illustration } from '@/components/ui/illustration';
import { LinkButton } from '@/components/ui/link-button';
import {
  Loader,
  SkeletonHero,
  SkeletonLandscape,
  SkeletonPoster,
  SkeletonRow,
  SkeletonText,
} from '@/components/ui/loader';
import { MediaImage } from '@/components/ui/media-image';
import { PillLink } from '@/components/ui/pill';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Row } from '@/components/ui/row';
import { SearchField } from '@/components/ui/search-field';
import { Tag } from '@/components/ui/tag';
import { LandscapeTile, Portrait, PosterTile, Top10Tile } from '@/components/ui/tiles';
import { routes } from '@/lib/routes';
import { serverConfig } from '@/server/config';
import { getFilms, getPeople, getPreferences, getViewer } from '@/server/data';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('design');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

const COLORS = [
  '--bg',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--border-strong',
  '--text',
  '--text-muted',
  '--text-subtle',
  '--accent',
  '--accent-pressed',
  '--accent-text',
  '--signal',
  '--signal-text',
  '--success',
  '--danger',
  '--warning',
] as const;

const RADII = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl'] as const;

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`design-${id}`}
      className="flex flex-col gap-4 border-t border-border pt-8"
    >
      <div>
        <h2 id={`design-${id}`} className="text-xl leading-[25px] lg:text-2xl lg:leading-[30px]">
          {title}
        </h2>
        {note ? <p className="mt-1 max-w-[70ch] text-[15px] leading-5 text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Spécimen typographique : l'échantillon, puis le nom du style en police d'interface. */
function TypeSample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {children}
      <p className="mt-1 text-xs font-semibold text-subtle">{label}</p>
    </div>
  );
}

/**
 * Catalogue du design system « Nuit de Kin » (lot 1 de la refonte) : chaque composant dans ses états,
 * en Nuit et en Jour, en mode allégé, en économie de données et en mouvement réduit. Visible en
 * développement, avec DESIGN_PAGE_ENABLED, ou pour l'équipe connectée (modérateur et plus). Non indexée.
 */
export default async function DesignPage({ params }: PageProps<'/[locale]/design'>) {
  const locale = (await params).locale as Locale;
  const config = serverConfig();
  const viewer = await getViewer().catch(() => null);
  const allowed =
    config.NODE_ENV !== 'production' ||
    config.DESIGN_PAGE_ENABLED ||
    (viewer !== null && hasRole(viewer.role, 'MODERATOR'));
  if (!allowed) notFound();

  const [t, ts, tt, tf, preferences, films, people] = await Promise.all([
    getTranslations('design'),
    getTranslations('design.samples'),
    getTranslations('design.typeStyles'),
    getTranslations('design.featured'),
    getPreferences(),
    getFilms({ limit: 8 }).catch(() => null),
    getPeople().catch(() => null),
  ]);
  const list = films?.items ?? [];
  const first = list[0];
  const talents = (people?.items ?? []).slice(0, 6);
  const filmHref = (slug: string) => routes.film(locale, slug);

  return (
    <div className="container-page flex flex-col gap-10 py-8 md:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-8 lg:text-[40px] lg:leading-[44px]">{t('title')}</h1>
        <p className="max-w-[70ch] text-muted">{t('intro')}</p>
      </header>
      <DesignToolbar initialTheme={preferences.theme} />

      <Section id="colors" title={t('sections.colors')} note={t('notes.colors')}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {COLORS.map((token) => (
            <li key={token} className="overflow-hidden rounded-md bg-surface-1">
              <div
                className="h-14 border-b border-border"
                style={{ background: `var(${token})` }}
              />
              <p className="px-2 py-1.5 text-xs font-semibold">{token}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="typography" title={t('sections.typography')} note={t('notes.typography')}>
        <div className="flex flex-col gap-4">
          <TypeSample label={tt('poster')}>
            <p className="font-display text-[34px] font-extrabold leading-[38px] tracking-[-0.02em] lg:text-[56px] lg:leading-[60px]">
              {ts('posterTitle')}
            </p>
          </TypeSample>
          <TypeSample label={tt('title1')}>
            <p className="font-display text-[28px] font-extrabold leading-8 lg:text-[40px] lg:leading-[44px]">
              {ts('rowNew')}
            </p>
          </TypeSample>
          <TypeSample label={tt('title2')}>
            <p className="text-xl font-bold leading-[25px] lg:text-2xl">{ts('rowTop10')}</p>
          </TypeSample>
          <TypeSample label={tt('heading')}>
            <p className="text-[17px] font-semibold leading-[22px]">{ts('sheetTitle')}</p>
          </TypeSample>
          <TypeSample label={tt('body')}>
            <p className="max-w-[70ch] text-base leading-6">{ts('body')}</p>
          </TypeSample>
          <TypeSample label={tt('callout')}>
            <p className="text-[15px] leading-5">{ts('soundUiHelp')}</p>
          </TypeSample>
          <TypeSample label={tt('subtitle')}>
            <ul className="meta flex flex-wrap gap-x-3">
              {(ts.raw('featuredMeta') as string[]).map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </TypeSample>
          <TypeSample label={tt('note')}>
            <p className="text-[13px] leading-[18px]">{ts('posterTitle')}</p>
          </TypeSample>
          <TypeSample label={tt('caption')}>
            <p className="eyebrow">{ts('remaining')}</p>
          </TypeSample>
          <TypeSample label={tt('tab')}>
            <p className="text-[11px] font-semibold leading-[13px]">{ts('films')}</p>
          </TypeSample>
        </div>
      </Section>

      <Section id="shapes" title={t('sections.shapes')} note={t('notes.shapes')}>
        <div className="flex flex-wrap items-end gap-4">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-1">
              <div className="size-16 bg-surface-2" style={{ borderRadius: `var(${radius})` }} />
              <span className="text-xs text-muted">{radius}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <div className="h-10 w-28 rounded-full bg-surface-2" />
            <span className="text-xs text-muted">--radius-full</span>
          </div>
        </div>
        {first ? (
          <div className="relative max-w-md overflow-hidden rounded-lg">
            <MediaImage image={first.poster} ratio="16/9" sizes="(min-width: 672px) 448px, 100vw" />
            <div className="chrome absolute inset-x-3 bottom-3 flex h-16 items-center justify-around rounded-full">
              <Icon name="home" filled className="text-accent-text" />
              <Icon name="discover" className="text-muted" />
              <Icon name="whatsNew" className="text-muted" />
              <Icon name="user" className="text-muted" />
            </div>
          </div>
        ) : null}
      </Section>

      <Section id="icons" title={t('sections.icons')} note={t('notes.icons')}>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
          {(Object.keys(SOLAR_ICONS) as IconName[]).map((name) => (
            <li key={name} className="flex flex-col items-center gap-1 rounded-md bg-surface-1 p-2">
              <span className="flex gap-1.5">
                <Icon name={name} />
                {ACTIVE_STYLE[name] !== 'linear' ? (
                  <Icon name={name} filled className="text-accent-text" />
                ) : null}
              </span>
              <span className="text-[11px] text-muted">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="buttons" title={t('sections.buttons')} note={t('notes.buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" icon="play" iconFilled>
            {ts('watch')}
          </Button>
          <Button variant="primary" data-cta="specimen" icon="play" iconFilled>
            {ts('resume')}
          </Button>
          <Button variant="primary" size="sm" data-cta="specimen">
            {ts('watch')}
          </Button>
          <Button variant="primary" data-cta="specimen" disabled>
            {ts('disabled')}
          </Button>
          <Button variant="primary" data-cta="specimen" pending>
            {ts('pending')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon="bookmark">{ts('myList')}</Button>
          <Button variant="ghost">{ts('share')}</Button>
          <Button variant="danger">{ts('delete')}</Button>
          <LinkButton href={routes.home(locale)} variant="secondary" size="sm" icon="arrowRight">
            {ts('home')}
          </LinkButton>
        </div>
        {first ? (
          <div className="relative max-w-md overflow-hidden rounded-lg">
            <MediaImage image={first.poster} ratio="16/9" sizes="(min-width: 672px) 448px, 100vw" />
            <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
            <div className="absolute bottom-4 left-4">
              <Button variant="on-image" icon="play">
                {ts('onImage')}
              </Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section id="icon-buttons" title={t('sections.iconButtons')}>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton icon="heart" label={ts('like')} />
          <IconButton icon="heart" label={ts('like')} pressed activeClassName="text-signal" />
          <IconButton icon="bookmark" label={ts('myList')} tone="surface" />
          <IconButton icon="bookmark" label={ts('myList')} tone="surface" pressed />
          <IconButton icon="share" label={ts('share')} tone="surface" />
        </div>
        <div className="flex gap-2">
          <IconButton icon="bookmark" label={ts('myList')} showLabel tone="surface" />
          <IconButton icon="heart" label={ts('like')} showLabel tone="surface" />
          <IconButton icon="play" label={ts('trailer')} showLabel tone="surface" />
          <IconButton icon="share" label={ts('share')} showLabel tone="surface" />
        </div>
      </Section>

      <Section id="badges" title={t('sections.badges')}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ts('new')}</Badge>
          <Badge>{ts('top10')}</Badge>
          <Badge tone="neutral">{ts('short')}</Badge>
          <Badge tone="accent">{ts('soon')}</Badge>
          <Tag>{ts('drama')}</Tag>
          <Tag>{ts('age')}</Tag>
          <Tag>{ts('hd')}</Tag>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillLink href="#design-badges" selected>
            {ts('films')}
          </PillLink>
          <PillLink href="#design-badges">{ts('shorts')}</PillLink>
          <PillLink href="#design-badges" icon="chevronDown">
            {ts('categories')}
          </PillLink>
        </div>
        <SegmentedDemo />
        <SwitchDemo />
      </Section>

      <Section id="progress" title={t('sections.progress')}>
        <div className="flex max-w-md flex-col gap-3">
          <ProgressBar value={0.15} label={ts('progressLabel')} />
          <ProgressBar value={0.62} label={ts('progressLabel')} />
        </div>
      </Section>

      <Section id="tiles" title={t('sections.tiles')}>
        <div className="-mx-4 flex flex-col gap-8 md:-mx-8 lg:-mx-12">
          <Row
            id="design-resume"
            title={ts('rowResume')}
            seeAll={{ href: '#design-tiles', label: ts('seeAll', { title: ts('rowResume') }) }}
          >
            {list.slice(0, 4).map((film, index) => (
              <LandscapeTile
                key={film.id}
                href={filmHref(film.slug)}
                title={film.title}
                image={film.poster}
                meta={ts('remaining')}
                progress={[0.3, 0.55, 0.12, 0.8][index]}
                progressLabel={ts('progressLabel')}
              />
            ))}
          </Row>
          <Row id="design-top10" title={ts('rowTop10')}>
            {list.slice(0, 5).map((film, index) => (
              <Top10Tile
                key={film.id}
                rank={index + 1}
                href={filmHref(film.slug)}
                title={film.title}
                image={film.poster}
                ariaLabel={ts('top10Label', { rank: index + 1, title: film.title })}
              />
            ))}
          </Row>
          <Row
            id="design-new"
            title={ts('rowNew')}
            seeAll={{ href: '#design-tiles', label: ts('seeAll', { title: ts('rowNew') }) }}
          >
            {list.map((film, index) => (
              <PosterTile
                key={film.id}
                href={filmHref(film.slug)}
                title={film.title}
                image={film.poster}
                badge={
                  index === 0 ? (
                    <Badge>{ts('new')}</Badge>
                  ) : film.kind === 'SHORT' ? (
                    <Badge tone="neutral">{ts('short')}</Badge>
                  ) : null
                }
                progress={index === 2 ? 0.4 : undefined}
                progressLabel={ts('progressLabel')}
              />
            ))}
          </Row>
          {talents.length > 0 ? (
            <Row id="design-talents" title={ts('rowTalents')}>
              {talents.map((person) => (
                <Portrait
                  key={person.id}
                  href={routes.person(locale, person.slug)}
                  name={person.name}
                  image={person.photo}
                />
              ))}
            </Row>
          ) : null}
        </div>
      </Section>

      <Section id="featured" title={t('sections.featured')}>
        <div className="-mx-4 md:-mx-8 lg:-mx-12">
          <Featured
            labels={{
              region: tf('region'),
              carousel: tf('carousel'),
              slide: tf('slide'),
              show: tf.raw('show') as string,
            }}
            items={list.slice(0, 3).map((film) => ({
              key: film.id,
              title: film.title,
              image: film.poster,
              meta: ts.raw('featuredMeta') as string[],
              actions: (
                <>
                  <LinkButton
                    href={filmHref(film.slug)}
                    variant="primary"
                    size="lg"
                    icon="play"
                    data-cta="specimen"
                  >
                    {ts('watch')}
                  </LinkButton>
                  <Button variant="on-image" size="lg" icon="bookmark">
                    {ts('myList')}
                  </Button>
                </>
              ),
            }))}
          />
        </div>
      </Section>

      <Section id="fields" title={t('sections.fields')}>
        <div className="flex max-w-md flex-col gap-4">
          <SearchField
            label={ts('searchLabel')}
            placeholder={ts('searchPlaceholder')}
            clearLabel={ts('clear')}
            defaultValue="Kinshasa"
          />
          <TextField
            label={ts('emailLabel')}
            name="design-email"
            type="email"
            autoComplete="email"
          />
          <TextField
            label={ts('emailLabel')}
            name="design-email-error"
            type="email"
            defaultValue="grace.gmail.com"
            error={ts('emailError')}
          />
        </div>
      </Section>

      <Section id="sheet" title={t('sections.sheet')}>
        <SheetDemo />
      </Section>

      <Section id="toast" title={t('sections.toast')}>
        <ToastDemo />
      </Section>

      <Section id="menu" title={t('sections.menu')} note={ts('menuHint')}>
        {first ? (
          <MenuDemo
            preview={
              <MediaImage image={first.poster} ratio="2/3" sizes="240px" className="rounded-sm" />
            }
          >
            <div className="tile-size">
              <PosterTile href={filmHref(first.slug)} title={first.title} image={first.poster} />
            </div>
          </MenuDemo>
        ) : null}
      </Section>

      <Section id="empty" title={t('sections.empty')}>
        <div className="grid gap-4 md:grid-cols-3">
          <EmptyState
            title={ts('emptyListTitle')}
            action={<Button>{ts('emptyListAction')}</Button>}
          >
            {ts('emptyListBody')}
          </EmptyState>
          <EmptyState
            title={ts('notFoundTitle')}
            illustration="missing"
            action={<Button>{ts('home')}</Button>}
          >
            {ts('notFoundBody')}
          </EmptyState>
          <EmptyState
            title={ts('offlineTitle')}
            illustration="no-lens"
            action={<Button>{ts('retry')}</Button>}
          >
            {ts('offlineBody')}
          </EmptyState>
        </div>
        <div className="flex gap-4">
          <Illustration variant="empty" className="h-auto w-24" />
          <Illustration variant="missing" className="h-auto w-24" />
          <Illustration variant="no-lens" className="h-auto w-24" />
        </div>
      </Section>

      <Section id="skeletons" title={t('sections.skeletons')}>
        <div className="flex max-w-md flex-col gap-4">
          <SkeletonText lines={3} />
          <div className="tile-size flex flex-wrap gap-2">
            <SkeletonPoster />
            <SkeletonPoster />
            <SkeletonLandscape />
          </div>
        </div>
        <div className="-mx-4 flex flex-col gap-6 md:-mx-8 lg:-mx-12">
          <SkeletonHero />
          <SkeletonRow />
        </div>
      </Section>

      <Section id="loader" title={t('sections.loader')}>
        <div className="flex items-center gap-8">
          <Loader label={ts('loading')} />
          <Loader label={ts('loading')} size="sm" />
        </div>
      </Section>

      <Section id="motion" title={t('sections.motion')} note={t('notes.motion')}>
        <div className="press w-full max-w-xs cursor-pointer rounded-lg bg-surface-1 p-6 text-center">
          {ts('pressMe')}
        </div>
        <SpringDemo />
      </Section>
    </div>
  );
}
