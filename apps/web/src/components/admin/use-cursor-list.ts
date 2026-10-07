'use client';

import { useState } from 'react';
import type { Page } from '@ecine/contracts';
import type { ActionResult } from '@/server/actions/result';
import { useAdminAction } from './use-admin-action';

/**
 * Liste paginée par curseur (« Voir plus ») : la première page vient du Server Component, les suivantes
 * d'une Server Action (aucun fetch côté client). Quand le serveur renvoie une nouvelle première page
 * (filtre, revalidation après une écriture), la liste repart de celle-ci.
 */
export function useCursorList<T>(
  initial: Page<T>,
  load: (cursor: string) => Promise<ActionResult<Page<T>>>,
) {
  const [source, setSource] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  if (source !== initial) {
    setSource(initial);
    setItems(initial.items);
    setCursor(initial.nextCursor);
  }
  const { run, pending } = useAdminAction();

  const loadMore = () => {
    if (!cursor) return;
    run(() => load(cursor), {
      quiet: true,
      onSuccess: (page) => {
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      },
    });
  };

  return { items, setItems, hasMore: cursor !== null, loadMore, pending };
}
