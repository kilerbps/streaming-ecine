import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@ecine/contracts';

function isLocale(value: string | undefined): value is Locale {
  return Boolean(value) && (LOCALES as readonly string[]).includes(value!);
}

/** Langue issue du segment [locale] (en-tête posé par proxy.ts), repli sur le français. */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requested = locale ?? (await requestLocale);
  const resolved = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const messages = (await import(`../messages/${resolved}.json`)) as {
    default: Record<string, unknown>;
  };
  return { locale: resolved, messages: messages.default, timeZone: 'Africa/Kinshasa' };
});
