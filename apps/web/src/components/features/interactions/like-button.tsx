'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { LikeTargetType } from '@ecine/contracts';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Icon } from '@/components/ui/icon';
import { track } from '@/lib/analytics';
import { setLikeAction } from '@/server/actions/interactions';

/**
 * J'aime : affichage immédiat (optimiste), confirmation par le serveur, retour en arrière explicite
 * en cas d'échec. Anonyme → feuille de connexion puis reprise automatique de l'action.
 * Compteur discret (preuve sociale mesurée, pas de classement).
 */
export function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  compact = false,
}: {
  targetType: LikeTargetType;
  targetId: string;
  initialLiked: boolean;
  initialCount: number;
  compact?: boolean;
}) {
  const t = useTranslations('actions');
  const { requireAuth, sessionExpired } = useAuth();
  const { feedback } = usePreferences();
  const toast = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  // Nouvelles valeurs du serveur (ex. après connexion) : on resynchronise pendant le rendu.
  const [server, setServer] = useState({ initialLiked, initialCount });
  if (server.initialLiked !== initialLiked || server.initialCount !== initialCount) {
    setServer({ initialLiked, initialCount });
    setLiked(initialLiked);
    setCount(initialCount);
  }

  const toggle = async (next: boolean) => {
    const previous = { liked, count };
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) feedback('like');
    const result = await setLikeAction(targetType, targetId, next);
    if (result.ok) {
      setCount(result.data.likeCount);
      if (next) track({ type: 'like', targetType, targetId });
      return;
    }
    setLiked(previous.liked);
    setCount(previous.count);
    if (result.code === 'auth') sessionExpired(() => toggle(next));
    else {
      feedback('error');
      toast(result.error, 'error');
    }
  };

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? t('unlike') : t('like')}
      onClick={() => requireAuth(() => toggle(!liked), 'like')}
      className={`inline-flex min-h-11 items-center gap-2 px-2 ${liked ? 'text-highlight' : 'text-text'} hover:bg-surface-2`}
    >
      <Icon name="heart" filled={liked} />
      {compact ? null : <span className="meta text-current">{count > 0 ? count : ''}</span>}
    </button>
  );
}
