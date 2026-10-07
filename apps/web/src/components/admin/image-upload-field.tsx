'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { IMAGE_UPLOAD_MIME_TYPES, type ImageUploadResult } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { Button } from '@/components/ui/button';
import { updateImageAltAction, uploadImageAction } from '@/server/actions/admin/media';
import { ADMIN_IMAGE_MAX_BYTES } from './config';
import { CONTROL } from './fields';
import { formatBytes } from './format';
import { useAdminAction } from './use-admin-action';

export type AdminImage = ImageUploadResult;
type Ratio = '2/3' | '4/5' | '16/9' | '1/1' | '3/2';

const ACCEPT = IMAGE_UPLOAD_MIME_TYPES.join(',');

/** Vérification immédiate dans le navigateur (le serveur revérifie le format réel). */
function fileProblem(file: File): string | null {
  if (!(IMAGE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type))
    return 'Format refusé : JPEG, PNG, WebP ou AVIF uniquement (pas de GIF ni de SVG).';
  if (file.size > ADMIN_IMAGE_MAX_BYTES)
    return `Image trop lourde (${formatBytes(file.size)}) : 4 Mo au plus. Réduisez-la avant l’envoi.`;
  return null;
}

/**
 * Envoi d'image réutilisable (affiches, photos, couvertures, publications, équipe) : aperçu local,
 * texte alternatif OBLIGATOIRE (ou « image décorative » si permis), envoi par Server Action, puis
 * modification du texte alternatif à tout moment.
 */
export function ImageUploadField({
  label,
  help,
  value,
  onChange,
  error,
  allowDecorative = true,
  ratio = '2/3',
  removable = true,
}: {
  label: string;
  help?: ReactNode;
  value: AdminImage | null;
  onChange: (image: AdminImage | null) => void;
  error?: string;
  allowDecorative?: boolean;
  ratio?: Ratio;
  removable?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { run, pending } = useAdminAction();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Texte alternatif de l'image déjà enregistrée (modifiable).
  const [current, setCurrent] = useState(value);
  const [editAlt, setEditAlt] = useState(value?.alt ?? '');
  const [editDecorative, setEditDecorative] = useState(Boolean(value && !value.alt));
  if (current !== value) {
    setCurrent(value);
    setEditAlt(value?.alt ?? '');
    setEditDecorative(Boolean(value && !value.alt));
  }

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const reset = () => {
    setFile(null);
    setPreview(null);
    setAlt('');
    setDecorative(false);
    setProblem(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const choose = (selected: File | undefined) => {
    if (!selected) return;
    const issue = fileProblem(selected);
    if (issue) {
      reset();
      setProblem(issue);
      return;
    }
    setProblem(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const upload = () => {
    if (!file) return;
    if (!decorative && !alt.trim()) {
      setProblem(
        'Décrivez l’image pour les personnes qui ne la voient pas (ou cochez « image décorative »).',
      );
      return;
    }
    const form = new FormData();
    form.set('file', file);
    form.set('alt', decorative ? '' : alt.trim());
    form.set('decorative', decorative ? 'true' : 'false');
    run(() => uploadImageAction(form), {
      success: 'Image envoyée.',
      onSuccess: (image) => {
        reset();
        onChange(image);
      },
    });
  };

  const saveAlt = () => {
    if (!value) return;
    run(
      () =>
        updateImageAltAction(value.id, {
          alt: editDecorative ? '' : editAlt.trim(),
          decorative: editDecorative,
        }),
      {
        success: 'Texte alternatif enregistré.',
        onSuccess: (image) => onChange(image),
      },
    );
  };

  const altChanged = value ? editAlt.trim() !== value.alt || editDecorative !== !value.alt : false;
  const describedBy =
    [help ? `${id}-help` : null, error || problem ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="w-40 max-w-full">
          {preview ? (
            <div
              className="relative w-full overflow-hidden bg-surface-2"
              style={{ aspectRatio: ratio }}
            >
              <Image src={preview} alt="" fill unoptimized className="object-cover" />
            </div>
          ) : (
            <Poster image={value} ratio={ratio} sizes="160px" />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {file ? (
            <>
              <p className="meta normal-case">
                {file.name} · {formatBytes(file.size)}
              </p>
              {!decorative ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-alt`} className="text-sm font-medium">
                    Texte alternatif (obligatoire)
                  </label>
                  <textarea
                    id={`${id}-alt`}
                    value={alt}
                    maxLength={300}
                    rows={2}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="Ex. : Affiche du film : une femme en pirogue au coucher du soleil sur le fleuve Congo."
                    className={`${CONTROL} min-h-16`}
                  />
                </div>
              ) : null}
              {allowDecorative ? (
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={decorative}
                    onChange={(e) => setDecorative(e.target.checked)}
                    className="mt-0.5 size-5 accent-[var(--accent)]"
                  />
                  Image décorative (n’apporte aucune information)
                </label>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" icon="upload" onClick={upload} pending={pending}>
                  Envoyer l’image
                </Button>
                <Button variant="ghost" onClick={reset} disabled={pending}>
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <>
              {value ? (
                <div className="flex flex-col gap-2">
                  {!editDecorative ? (
                    <>
                      <label htmlFor={`${id}-edit-alt`} className="text-sm font-medium">
                        Texte alternatif
                      </label>
                      <textarea
                        id={`${id}-edit-alt`}
                        value={editAlt}
                        maxLength={300}
                        rows={2}
                        onChange={(e) => setEditAlt(e.target.value)}
                        className={`${CONTROL} min-h-16`}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted">Image marquée comme décorative.</p>
                  )}
                  {allowDecorative ? (
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={editDecorative}
                        onChange={(e) => setEditDecorative(e.target.checked)}
                        className="mt-0.5 size-5 accent-[var(--accent)]"
                      />
                      Image décorative
                    </label>
                  ) : null}
                  {altChanged ? (
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={saveAlt}
                        pending={pending}
                        disabled={!editDecorative && !editAlt.trim()}
                      >
                        Enregistrer le texte alternatif
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor={id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 text-sm hover:bg-surface-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
                >
                  {value ? 'Remplacer l’image' : 'Choisir une image'}
                  <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    onChange={(e) => choose(e.target.files?.[0])}
                  />
                </label>
                {value && removable ? (
                  <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                    Retirer
                  </Button>
                ) : null}
              </div>
            </>
          )}
          {help ? (
            <p id={`${id}-help`} className="text-sm text-muted">
              {help}
            </p>
          ) : null}
          {error || problem ? (
            <p
              id={`${id}-error`}
              className="flex items-start gap-1.5 text-sm text-danger"
              role="alert"
            >
              <span aria-hidden="true">!</span>
              {problem ?? error}
            </p>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}
