'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useToast } from '@/components/providers/toast';
import type { ThemeSetting } from '@/lib/preferences';
import { Button } from '@/components/ui/button';
import { ContextMenu, MoreMenu, type MenuItem } from '@/components/ui/context-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

type Flag = 'theme' | 'perf' | 'savedata' | 'motion';

/**
 * Réglages de l'aperçu : changent les attributs de `<html>` pour cette visite seulement (aucun
 * cookie), afin de voir chaque composant en Nuit et en Jour, en mode allégé, en économie de données
 * et en mouvement réduit.
 */
export function DesignToolbar({ initialTheme }: { initialTheme: ThemeSetting }) {
  const t = useTranslations('design');
  const [theme, setTheme] = useState(initialTheme);
  const [flags, setFlags] = useState({ perf: false, savedata: false, motion: false });

  const toggle = (flag: Exclude<Flag, 'theme'>, on: boolean) => {
    const html = document.documentElement;
    const values = { perf: 'lite', savedata: 'on', motion: 'reduce' } as const;
    if (on) html.dataset[flag] = values[flag];
    else delete html.dataset[flag];
    setFlags((current) => ({ ...current, [flag]: on }));
  };

  return (
    <div
      role="group"
      aria-label={t('toolbar')}
      className="chrome z-30 flex flex-col gap-3 rounded-lg p-4 md:sticky md:top-2 md:flex-row md:items-center md:gap-6"
    >
      <SegmentedControl
        label={t('theme')}
        value={theme}
        onChange={(next) => {
          document.documentElement.dataset.theme = next;
          setTheme(next);
        }}
        options={[
          { value: 'dark', label: t('night') },
          { value: 'light', label: t('day') },
          { value: 'auto', label: t('auto') },
        ]}
        className="md:w-56"
      />
      <div className="grid flex-1 gap-1 md:grid-cols-3 md:gap-4">
        <Switch label={t('lite')} checked={flags.perf} onChange={(on) => toggle('perf', on)} />
        <Switch
          label={t('saveData')}
          checked={flags.savedata}
          onChange={(on) => toggle('savedata', on)}
        />
        <Switch
          label={t('reducedMotion')}
          checked={flags.motion}
          onChange={(on) => toggle('motion', on)}
        />
      </div>
    </div>
  );
}

export function SegmentedDemo() {
  const t = useTranslations('design.samples');
  const [value, setValue] = useState<'soon' | 'events' | 'news'>('soon');
  return (
    <SegmentedControl
      label={t('segments')}
      value={value}
      onChange={setValue}
      options={[
        { value: 'soon', label: t('segmentSoon') },
        { value: 'events', label: t('segmentEvents') },
        { value: 'news', label: t('segmentNews') },
      ]}
      className="max-w-sm"
    />
  );
}

export function SwitchDemo() {
  const t = useTranslations('design.samples');
  const [haptics, setHaptics] = useState(true);
  const [clap, setClap] = useState(true);
  const [ui, setUi] = useState(false);
  return (
    <div className="max-w-md divide-y divide-[var(--border)] rounded-lg bg-surface-1 px-4">
      <Switch label={t('haptics')} checked={haptics} onChange={setHaptics} />
      <Switch label={t('soundClap')} checked={clap} onChange={setClap} />
      <Switch label={t('soundUi')} description={t('soundUiHelp')} checked={ui} onChange={setUi} />
    </div>
  );
}

export function SheetDemo() {
  const t = useTranslations('design.samples');
  const [open, setOpen] = useState<'simple' | 'expandable' | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setOpen('simple')}>{t('openSheet')}</Button>
      <Button onClick={() => setOpen('expandable')}>{t('openExpandable')}</Button>
      <Sheet
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
        title={t('sheetTitle')}
        expandable={open === 'expandable'}
      >
        <p className="text-[15px] leading-5 text-muted">{t('sheetBody')}</p>
      </Sheet>
    </div>
  );
}

export function ToastDemo() {
  const t = useTranslations('design.samples');
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast(t('toastAdded'), 'success', {
            label: t('toastUndo'),
            onAction: () => toast(t('toastUndone'), 'info'),
          })
        }
      >
        {t('showSuccess')}
      </Button>
      <Button onClick={() => toast(t('toastError'), 'error')}>{t('showError')}</Button>
      <Button onClick={() => toast(t('toastInfo'), 'info')}>{t('showInfo')}</Button>
    </div>
  );
}

export function MenuDemo({ children, preview }: { children: ReactNode; preview: ReactNode }) {
  const t = useTranslations('design.samples');
  const toast = useToast();
  const items: MenuItem[] = [
    {
      key: 'list',
      label: t('menuList'),
      icon: 'bookmark',
      onSelect: () => toast(t('toastAdded'), 'success'),
    },
    { key: 'share', label: t('menuShare'), icon: 'share', onSelect: () => undefined },
    { key: 'not', label: t('menuNotForMe'), icon: 'eyeOff', onSelect: () => undefined },
    { key: 'details', label: t('menuDetails'), icon: 'arrowRight', onSelect: () => undefined },
  ];
  return (
    <div className="flex items-start gap-3">
      <ContextMenu items={items} preview={preview}>
        <div>{children}</div>
      </ContextMenu>
      <MoreMenu items={items} label={t('menuMore')} />
    </div>
  );
}

/** Ressorts : un bloc qui se déplace en ressort « doux » ou « vif » (transform uniquement). */
export function SpringDemo() {
  const t = useTranslations('design.samples');
  const [on, setOn] = useState(false);
  const block = (spring: 'smooth' | 'snappy', label: string) => (
    <div>
      <p className="text-[13px] leading-[18px] text-muted">{label}</p>
      <div className="mt-2 h-12 w-full max-w-sm rounded-md bg-surface-1 p-1">
        <div
          className={`size-10 rounded-sm bg-accent transition-transform ${
            spring === 'smooth'
              ? 'duration-[var(--spring-smooth-dur)] ease-[var(--spring-smooth)]'
              : 'duration-[var(--spring-snappy-dur)] ease-[var(--spring-snappy)]'
          } ${on ? 'translate-x-[min(calc(100vw-120px),calc(24rem-48px))]' : 'translate-x-0'}`}
        />
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      {block('smooth', t('springSmooth'))}
      {block('snappy', t('springSnappy'))}
      <Button onClick={() => setOn((value) => !value)} className="self-start">
        {t('animate')}
      </Button>
    </div>
  );
}
