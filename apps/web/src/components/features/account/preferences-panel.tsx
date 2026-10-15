'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { usePreferences } from '@/components/providers/preferences';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-[17px] font-semibold leading-[22px]">{title}</h2>
      <div className="mt-3 flex flex-col divide-y divide-border rounded-xl bg-surface-1 px-4 py-1">
        {children}
      </div>
    </section>
  );
}

export function Choice({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3">
      <div>
        <p className="text-[15px] leading-5">{label}</p>
        <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{help}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Réglages toujours accessibles (même sans compte), mémorisés en cookies : Affichage (thème, mode
 * allégé), Sons et vibrations, Données (économie de données, aperçus automatiques).
 */
export function PreferencesPanel() {
  const t = useTranslations('prefs');
  const prefs = usePreferences();
  return (
    <div>
      <Group title={t('display')}>
        <Choice label={t('theme')} help={t('themeHelp')}>
          <SegmentedControl
            label={t('theme')}
            value={prefs.theme}
            onChange={prefs.setTheme}
            options={[
              { value: 'dark', label: t('themeDark') },
              { value: 'light', label: t('themeLight') },
              { value: 'auto', label: t('themeAuto') },
            ]}
          />
        </Choice>
        <Choice label={t('perf')} help={t('perfHelp')}>
          <SegmentedControl
            label={t('perf')}
            value={prefs.perf}
            onChange={prefs.setPerf}
            options={[
              { value: 'auto', label: t('perfAuto') },
              { value: 'on', label: t('perfOn') },
              { value: 'off', label: t('perfOff') },
            ]}
          />
        </Choice>
      </Group>

      <Group title={t('feedback')}>
        <div className="py-2">
          <Switch
            label={t('haptics')}
            description={t('hapticsHelp')}
            checked={prefs.haptics}
            onChange={prefs.setHaptics}
          />
        </div>
        <div className="py-2">
          <Switch label={t('soundClap')} checked={prefs.soundClap} onChange={prefs.setSoundClap} />
        </div>
        <div className="py-2">
          <Switch
            label={t('soundUi')}
            description={t('soundUiHelp')}
            checked={prefs.soundUi}
            onChange={prefs.setSoundUi}
          />
        </div>
      </Group>

      <Group title={t('data')}>
        <div className="py-2">
          <Switch
            label={t('saveData')}
            description={t('saveDataHelp')}
            checked={prefs.saveData}
            onChange={prefs.setSaveData}
          />
        </div>
        <div className="py-2">
          <Switch
            label={t('autoPreviews')}
            description={t('autoPreviewsHelp')}
            checked={prefs.autoPreviews}
            onChange={prefs.setAutoPreviews}
          />
        </div>
      </Group>
    </div>
  );
}
