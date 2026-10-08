'use client';

import { useTranslations } from 'next-intl';
import { usePreferences } from '@/components/providers/preferences';

function Switch({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-6 border-b border-border py-3">
      <span>
        <span className="block font-medium">{label}</span>
        {help ? <span className="block text-sm text-muted">{help}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

/** Réglages toujours accessibles (même sans compte) et mémorisés : thème, sons, économie de données. */
export function PreferencesPanel() {
  const t = useTranslations('prefs');
  const { theme, sound, saveData, setTheme, setSound, setSaveData } = usePreferences();
  return (
    <div>
      <fieldset className="border-b border-border pb-3">
        <legend className="font-medium">{t('theme')}</legend>
        <div className="mt-3 flex gap-2">
          {(['dark', 'light'] as const).map((value) => (
            <label
              key={value}
              className={`eyebrow inline-flex min-h-11 cursor-pointer items-center gap-2 border px-4 ${theme === value ? 'border-accent text-accent-text' : 'border-border-strong'}`}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="sr-only"
              />
              {value === 'dark' ? t('themeDark') : t('themeLight')}
            </label>
          ))}
        </div>
      </fieldset>
      <Switch label={t('sound')} checked={sound} onChange={setSound} />
      <Switch
        label={t('saveData')}
        help={t('saveDataHelp')}
        checked={saveData}
        onChange={setSaveData}
      />
    </div>
  );
}
