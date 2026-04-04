export const languages = { en: 'English', es: 'Español' };
export const defaultLang = 'en';

export const ui = {
  en: {
    'nav.work': 'Work',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'hero.available': 'Available for projects',
    'hero.role': 'Art Director & Visual Designer',
    'hero.bio': 'Building worlds through image, motion, and concept.',
    'work.title': 'Selected Work',
    'work.synced': 'Synced from Behance',
    'work.view': 'View Project',
    'work.empty': 'Projects loading — check back soon.',
    'work.behance': 'View on Behance',
    'contact.title': 'Get in touch',
    'contact.cv': 'Download CV',
    'footer.built': 'Built with Astro · Hosted on GitHub Pages',
  },
  es: {
    'nav.work': 'Trabajo',
    'nav.about': 'Sobre mí',
    'nav.contact': 'Contacto',
    'hero.available': 'Disponible para proyectos',
    'hero.role': 'Director de Arte & Diseñador Visual',
    'hero.bio': 'Construyendo mundos a través de la imagen, el movimiento y el concepto.',
    'work.title': 'Trabajo Seleccionado',
    'work.synced': 'Sincronizado desde Behance',
    'work.view': 'Ver Proyecto',
    'work.empty': 'Proyectos cargando — vuelve pronto.',
    'work.behance': 'Ver en Behance',
    'contact.title': 'Hablemos',
    'contact.cv': 'Descargar CV',
    'footer.built': 'Hecho con Astro · Alojado en GitHub Pages',
  },
} as const;

export type Lang = keyof typeof ui;
export type TranslationKey = keyof typeof ui[typeof defaultLang];

export function useTranslations(lang: Lang) {
  return (key: TranslationKey) => ui[lang][key] ?? ui[defaultLang][key];
}
