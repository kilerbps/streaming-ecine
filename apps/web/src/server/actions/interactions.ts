'use server';

import { cookies } from 'next/headers';
import {
  bookmarkStateSchema,
  reminderStateSchema,
  likeParamsSchema,
  likeStateSchema,
  playbackRefreshSchema,
  playbackSessionSchema,
  progressInputSchema,
  reportInputSchema,
  type BookmarkState,
  type ReminderState,
  type FeedPage,
  type LikeState,
  type LikeTargetType,
  type PlaybackRefresh,
  type PlaybackSession,
  type SearchResults,
} from '@ecine/contracts';
import { z } from 'zod';
import { privateRequest } from '../api-client';
import { PREF_COOKIES } from '../cookie-names';
import { getFeed, getLikedIds, search } from '../data';
import { fromError, invalid, ok, type ActionResult } from './result';

const idParam = z.string().min(1).max(64);

/** J'aime idempotent (PUT/DELETE). Un visiteur anonyme reçoit `code: 'auth'` → feuille de connexion. */
export async function setLikeAction(
  targetType: LikeTargetType,
  targetId: string,
  liked: boolean,
): Promise<ActionResult<LikeState>> {
  const parsed = likeParamsSchema.safeParse({ targetType, targetId });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const path = `/likes/${parsed.data.targetType}/${encodeURIComponent(parsed.data.targetId)}`;
    return ok(await privateRequest(likeStateSchema, path, { method: liked ? 'PUT' : 'DELETE' }));
  } catch (error) {
    return fromError(error);
  }
}

export async function setBookmarkAction(
  filmId: string,
  bookmarked: boolean,
): Promise<ActionResult<BookmarkState>> {
  const parsed = idParam.safeParse(filmId);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return ok(
      await privateRequest(bookmarkStateSchema, `/bookmarks/${encodeURIComponent(parsed.data)}`, {
        method: bookmarked ? 'PUT' : 'DELETE',
      }),
    );
  } catch (error) {
    return fromError(error);
  }
}

/** « Me le rappeler » d'un film annoncé (membre). */
export async function setReminderAction(
  filmId: string,
  reminded: boolean,
): Promise<ActionResult<ReminderState>> {
  const parsed = idParam.safeParse(filmId);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return ok(
      await privateRequest(
        reminderStateSchema,
        `/me/reminders/${encodeURIComponent(parsed.data)}`,
        { method: reminded ? 'PUT' : 'DELETE' },
      ),
    );
  } catch (error) {
    return fromError(error);
  }
}

export async function saveProgressAction(
  filmId: string,
  positionSec: number,
): Promise<ActionResult> {
  const id = idParam.safeParse(filmId);
  const body = progressInputSchema.safeParse({ positionSec: Math.floor(positionSec) });
  if (!id.success) return invalid(id.error);
  if (!body.success) return invalid(body.error);
  try {
    await privateRequest(null, `/me/progress/${encodeURIComponent(id.data)}`, {
      method: 'PUT',
      body: body.data,
    });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

export async function reportAction(input: unknown): Promise<ActionResult> {
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await privateRequest(null, '/reports', { method: 'POST', body: parsed.data });
    return ok(null);
  } catch (error) {
    return fromError(error);
  }
}

/** Page suivante du feed (pagination par curseur, sans fetch côté client — règle R3). */
export async function loadFeedPageAction(
  cursor: string,
): Promise<ActionResult<{ page: FeedPage; likedPosts: string[] }>> {
  const parsed = z.string().min(1).max(512).safeParse(cursor);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const seed = (await cookies()).get(PREF_COOKIES.seed)?.value;
    const page = await getFeed(parsed.data, seed);
    const postIds = page.items.flatMap((i) => (i.type === 'post' ? [i.post.id] : []));
    return ok({ page, likedPosts: await getLikedIds('POST', postIds) });
  } catch (error) {
    return fromError(error);
  }
}

export async function suggestAction(q: string): Promise<ActionResult<SearchResults>> {
  const parsed = z.string().trim().min(2).max(80).safeParse(q);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return ok(await search(parsed.data, 5));
  } catch (error) {
    return fromError(error);
  }
}

/** Ouverture d'une session de lecture : jeton ≤ 5 min, lié à la vidéo (jamais placé dans l'URL de page). */
export async function startPlaybackAction(
  videoId: string,
  preview = false,
): Promise<ActionResult<PlaybackSession>> {
  const parsed = idParam.safeParse(videoId);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return ok(
      await privateRequest(
        playbackSessionSchema,
        `/playback/${encodeURIComponent(parsed.data)}/session`,
        // Aperçu automatique : 240p au plus côté API, jamais compté dans le Top 10.
        { method: 'POST', query: preview ? { apercu: '1' } : undefined },
      ),
    );
  } catch (error) {
    return fromError(error);
  }
}

export async function refreshPlaybackAction(
  videoId: string,
  token: string,
): Promise<ActionResult<PlaybackRefresh>> {
  const id = idParam.safeParse(videoId);
  const t = z.string().min(10).max(1024).safeParse(token);
  if (!id.success) return invalid(id.error);
  if (!t.success) return invalid(t.error);
  try {
    return ok(
      await privateRequest(
        playbackRefreshSchema,
        `/playback/${encodeURIComponent(id.data)}/refresh`,
        {
          method: 'POST',
          body: { token: t.data },
        },
      ),
    );
  } catch (error) {
    return fromError(error);
  }
}
