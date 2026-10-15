'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { TASTES_MAX, type Category } from '@ecine/contracts';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { pillClasses } from '@/components/ui/pill';
import { setTastesAction } from '@/server/actions/personalization';

/**
 * Choix des goûts : catégories en pastilles à sélection multiple (8 au plus). Enregistrés dans le
 * compte, ou sur l'appareil pour un visiteur ayant accepté « Personnalisation ».
 */
export function TastesPicker({
  categories,
  initial,
  submitLabel,
  onSaved,
  secondary,
}: {
  categories: Category[];
  initial: string[];
  submitLabel: string;
  onSaved?: (slugs: string[]) => void;
  /** Bouton de même poids à côté du bouton d'enregistrement (« Plus tard »). */
  secondary?: React.ReactNode;
}) {
  const t = useTranslations('prefs');
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(initial);
  const [pending, startTransition] = useTransition();

  const toggle = (slug: string) =>
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : current.length < TASTES_MAX
          ? [...current, slug]
          : current,
    );

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label={t('tastes')}>
        {categories.map((category) => {
          const on = selected.includes(category.slug);
          return (
            <li key={category.slug}>
              <button
                type="button"
                aria-pressed={on}
                className={pillClasses(on)}
                onClick={() => toggle(category.slug)}
              >
                {on ? <Icon name="check" size={16} /> : null}
                {category.name}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setTastesAction({ categories: selected });
              if (result.ok) {
                toast(t('tastesSaved'), 'success');
                onSaved?.(result.data.categories);
              } else toast(result.error, 'error');
            })
          }
        >
          {submitLabel}
        </Button>
        {secondary}
      </div>
    </div>
  );
}
