'use client';

import Image from 'next/image';
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  IMAGE_RATIOS,
  type CropRect,
  type FocalPoint,
  type ImageCrops,
  type ImageRatio,
  type ImageUploadResult,
} from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { MediaImage } from '@/components/ui/media-image';
import { pillClasses } from '@/components/ui/pill';
import { cropAround, cropCenter, cropZoom, moveCrop } from '@/lib/image-framing';
import { saveImageFramingAction } from '@/server/actions/admin/media';
import { useAdminAction } from './use-admin-action';

type Mode = 'focal' | ImageRatio;

const LABELS: Record<Mode, string> = {
  focal: 'Point focal',
  '2:3': '2:3 · affiche',
  '4:5': '4:5 · fiche mobile',
  '16:9': '16:9 · couverture, PC',
  '1:1': '1:1 · crédits',
  '9:16': '9:16 · Découvrir',
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** Pas des flèches : 1 % (10 % avec Maj). */
const step = (event: KeyboardEvent) => (event.shiftKey ? 0.1 : 0.01);
const arrows: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Cadrage d'une image (docs/design/05-admin.md, Images) : un toucher sur le sujet pose le point
 * focal ; chaque format (2:3, 4:5, 16:9, 1:1, 9:16) en déduit un recadrage, ajustable par glisser,
 * flèches et zoom. Aperçus réels (tuile, fiche mobile, affiche à la une avec le voile). Seuls des
 * rectangles sont enregistrés : l'image d'origine n'est jamais réécrite.
 */
export function ImageFramingEditor({
  image,
  title,
  onSaved,
}: {
  image: ImageUploadResult;
  /** Titre affiché dans l'aperçu de l'affiche à la une (lisibilité sur le voile). */
  title?: string;
  onSaved: (image: ImageUploadResult) => void;
}) {
  const { run, pending } = useAdminAction();
  const size = { width: image.width, height: image.height };
  const [focal, setFocal] = useState<FocalPoint | null>(image.focal ?? null);
  const [crops, setCrops] = useState<ImageCrops>(image.crops ?? {});
  const [mode, setMode] = useState<Mode>('focal');
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; rect: CropRect } | null>(null);

  const rectFor = (ratio: ImageRatio) =>
    crops[ratio] ?? cropAround(size, ratio, focal ?? undefined);
  const setRect = (ratio: ImageRatio, rect: CropRect) =>
    setCrops((current) => ({ ...current, [ratio]: rect }));
  const current = mode === 'focal' ? null : rectFor(mode);
  const draft = { ...image, focal, crops: Object.keys(crops).length > 0 ? crops : null };

  const pointToFraction = (clientX: number, clientY: number): FocalPoint | null => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      x: Math.round(clamp01((clientX - box.left) / box.width) * 1000) / 1000,
      y: Math.round(clamp01((clientY - box.top) / box.height) * 1000) / 1000,
    };
  };

  const onFramePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== 'focal') return;
    const point = pointToFraction(event.clientX, event.clientY);
    if (point) setFocal(point);
  };

  const onFrameKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = arrows[event.key];
    if (!move || mode !== 'focal') return;
    event.preventDefault();
    const base = focal ?? { x: 0.5, y: 0.5 };
    setFocal({
      x: clamp01(base.x + move[0] * step(event)),
      y: clamp01(base.y + move[1] * step(event)),
    });
  };

  const onCropDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!current) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rect: current };
  };

  const onCropMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    const box = frame.current?.getBoundingClientRect();
    if (!start || !box || mode === 'focal') return;
    setRect(
      mode,
      moveCrop(
        start.rect,
        (event.clientX - start.x) / box.width,
        (event.clientY - start.y) / box.height,
      ),
    );
  };

  const onCropKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = arrows[event.key];
    if (!move || !current || mode === 'focal') return;
    event.preventDefault();
    setRect(mode, moveCrop(current, move[0] * step(event), move[1] * step(event)));
  };

  const save = () =>
    run(() => saveImageFramingAction(image.id, { focal, crops }), {
      success: 'Cadrage enregistré.',
      onSuccess: onSaved,
    });

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Format"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
      >
        {(['focal', ...IMAGE_RATIOS] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={pillClasses(mode === value)}
            onClick={() => setMode(value)}
          >
            {LABELS[value]}
            {value !== 'focal' && crops[value] ? ' · ajusté' : ''}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {mode === 'focal'
          ? 'Touchez le visage ou le sujet principal (flèches pour affiner). Les formats sans réglage se centrent dessus.'
          : 'Glissez le cadre (ou flèches, Maj pour aller plus vite) et réglez le zoom. La partie sombre ne sera pas affichée.'}
      </p>

      <div
        ref={frame}
        tabIndex={mode === 'focal' ? 0 : -1}
        aria-label="Image à cadrer"
        onPointerDown={onFramePointer}
        onKeyDown={onFrameKey}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-md bg-surface-2"
        style={{
          aspectRatio: `${size.width} / ${size.height}`,
          width: `min(100%, calc(52dvh * ${size.width / size.height}))`,
          cursor: mode === 'focal' ? 'crosshair' : 'default',
        }}
      >
        <Image
          src={image.src}
          alt=""
          fill
          sizes="(min-width: 672px) 560px, 100vw"
          draggable={false}
          className="object-cover"
        />
        {focal ? (
          <span
            aria-hidden="true"
            className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-[var(--on-image-text)]"
            style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
          />
        ) : null}
        {current ? (
          <div
            role="group"
            tabIndex={0}
            aria-label={`Recadrage ${mode} : glisser ou flèches pour déplacer`}
            onPointerDown={onCropDown}
            onPointerMove={onCropMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={onCropKey}
            className="absolute cursor-move border-2 border-[var(--on-image-text)] shadow-[var(--shadow-crop-mask)]"
            style={{
              left: `${current.x * 100}%`,
              top: `${current.y * 100}%`,
              width: `${current.w * 100}%`,
              height: `${current.h * 100}%`,
            }}
          />
        ) : null}
      </div>

      {current && mode !== 'focal' ? (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-1 items-center gap-3 text-sm">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={cropZoom(size, mode, current)}
              onChange={(event) =>
                setRect(
                  mode,
                  cropAround(size, mode, cropCenter(current), Number(event.target.value)),
                )
              }
              className="flex-1 accent-[var(--accent)]"
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled={!crops[mode]}
            onClick={() =>
              setCrops((all) => {
                const next = { ...all };
                delete next[mode];
                return next;
              })
            }
          >
            Revenir au point focal
          </Button>
        </div>
      ) : null}

      <section aria-label="Aperçus" className="flex flex-wrap items-end gap-4">
        <figure className="w-20">
          <MediaImage image={draft} ratio="2/3" sizes="80px" className="rounded-sm" />
          <figcaption className="mt-1 text-xs text-muted">Tuile</figcaption>
        </figure>
        <figure className="w-28">
          <MediaImage image={draft} ratio="4/5" sizes="112px" className="rounded-md" />
          <figcaption className="mt-1 text-xs text-muted">Fiche mobile</figcaption>
        </figure>
        <figure className="w-60 max-w-full">
          <div data-theme="dark" className="relative overflow-hidden rounded-md">
            <MediaImage image={draft} ratio="16/9" sizes="240px" />
            <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
            {title ? (
              <p className="absolute inset-x-3 bottom-2 font-display text-lg font-extrabold leading-6 text-text">
                {title}
              </p>
            ) : null}
          </div>
          <figcaption className="mt-1 text-xs text-muted">À la une (PC)</figcaption>
        </figure>
      </section>

      <div>
        <Button variant="primary" onClick={save} pending={pending}>
          Enregistrer le cadrage
        </Button>
      </div>
    </div>
  );
}
