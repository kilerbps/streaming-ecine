'use client';

import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import type { Category } from '@ecine/contracts';
import { TastesPicker } from '@/components/features/account/tastes-picker';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { closeTastesPromptAction } from '@/server/actions/personalization';

const noSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * « Qu'aimez-vous regarder ? » (R-ENG-11) : au retour sur l'accueil après un premier film. Trois
 * genres pré-choisis, « Valider » et « Plus tard » de même poids ; fermer la feuille vaut « Plus
 * tard ». L'accueil se recalcule ensuite (cookie modifié par l'action).
 */
export function TastesPrompt({
  categories,
  suggested,
}: {
  categories: Category[];
  suggested: string[];
}) {
  const t = useTranslations('home');
  // Ouverte juste après l'hydratation : montée déjà ouverte, la feuille inscrirait son entrée
  // d'historique pendant le double montage du mode strict, et le retour qui suit la refermerait.
  const hydrated = useSyncExternalStore(noSubscribe, clientSnapshot, serverSnapshot);
  const [closed, setClosed] = useState(false);
  const close = (choice: 'saved' | 'later') => {
    setClosed(true);
    void closeTastesPromptAction(choice);
  };
  return (
    <Sheet
      open={hydrated && !closed}
      onOpenChange={(next) => {
        if (!next) close('later');
      }}
      title={t('tastesTitle')}
      description={t('tastesBody')}
      narrow
    >
      <TastesPicker
        categories={categories}
        initial={suggested}
        submitLabel={t('tastesSubmit')}
        onSaved={() => close('saved')}
        secondary={
          <Button variant="secondary" onClick={() => close('later')}>
            {t('tastesLater')}
          </Button>
        }
      />
    </Sheet>
  );
}
