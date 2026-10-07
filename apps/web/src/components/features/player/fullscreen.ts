'use client';

/** Plein écran du conteneur du lecteur ; paysage sur mobile quand c'est possible, jamais imposé. */
export async function toggleFullscreen(element: HTMLElement | null): Promise<void> {
  if (!element) return;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await element.requestFullscreen().catch(() => undefined);
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  await orientation.lock?.('landscape').catch(() => undefined);
}
