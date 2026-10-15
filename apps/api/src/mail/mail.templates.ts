import type { MailMessage } from './mail.service.js';

/** Textes des e-mails transactionnels (français, ton sobre). À faire relire par l'équipe éditoriale. */
export const mailTemplates = {
  /** Rappel « Me le rappeler » : le film annoncé est sorti. */
  filmReleased(to: string, name: string, title: string, link: string): MailMessage {
    return {
      to,
      subject: `« ${title} » est disponible sur E-Ciné`,
      text: [
        `Bonjour ${name},`,
        '',
        `Vous avez demandé un rappel pour la sortie de « ${title} ». Le film est disponible :`,
        link,
        '',
        'Vous recevez ce message parce que vous avez activé un rappel pour ce film.',
        '',
        "L'équipe E-Ciné",
      ].join('\n'),
    };
  },

  verifyEmail(to: string, name: string, link: string): MailMessage {
    return {
      to,
      subject: 'Confirmez votre adresse e-mail — E-Ciné',
      text: [
        `Bonjour ${name},`,
        '',
        'Pour confirmer votre adresse e-mail, ouvrez ce lien (valable 24 heures) :',
        link,
        '',
        "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.",
        '',
        "L'équipe E-Ciné",
      ].join('\n'),
    };
  },

  resetPassword(to: string, link: string): MailMessage {
    return {
      to,
      subject: 'Réinitialisation de votre mot de passe — E-Ciné',
      text: [
        'Bonjour,',
        '',
        'Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :',
        link,
        '',
        "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.",
        '',
        "L'équipe E-Ciné",
      ].join('\n'),
    };
  },

  contactAck(to: string, name: string, subject: string): MailMessage {
    return {
      to,
      subject: 'Nous avons bien reçu votre message — E-Ciné',
      text: [
        `Bonjour ${name},`,
        '',
        `Votre message « ${subject} » est bien arrivé. L'équipe vous répondra dès que possible.`,
        '',
        "L'équipe E-Ciné",
      ].join('\n'),
    };
  },
};
