'use client';

import { useState, type ReactNode } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { WHATS_NEW_SEGMENTS, type WhatsNewSegment } from './segments';

/**
 * Contrôle segmenté de Nouveautés : les trois listes sont rendues par le serveur, le contrôle ne fait
 * que montrer l'une d'elles et inscrit son nom dans l'adresse (`?vue=`), pour un lien partageable.
 */
export function WhatsNewTabs({
  initial,
  label,
  labels,
  panels,
}: {
  initial: WhatsNewSegment;
  label: string;
  labels: Record<WhatsNewSegment, string>;
  panels: Record<WhatsNewSegment, ReactNode>;
}) {
  const [value, setValue] = useState<WhatsNewSegment>(initial);
  return (
    <>
      <SegmentedControl
        label={label}
        options={WHATS_NEW_SEGMENTS.map((segment) => ({ value: segment, label: labels[segment] }))}
        value={value}
        onChange={(next) => {
          setValue(next);
          const url = new URL(window.location.href);
          url.searchParams.set('vue', next);
          window.history.replaceState(window.history.state, '', url);
        }}
        className="w-full md:w-auto md:max-w-md"
      />
      {WHATS_NEW_SEGMENTS.map((segment) => (
        <section
          key={segment}
          hidden={segment !== value}
          aria-label={labels[segment]}
          className="mt-6 md:mt-8"
        >
          {panels[segment]}
        </section>
      ))}
    </>
  );
}
