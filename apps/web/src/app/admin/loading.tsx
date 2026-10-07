import { Loader } from '@/components/ui/loader';

/** Chargement d'un écran d'administration (lectures API côté serveur). */
export default function AdminLoading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center">
      <Loader label="Chargement de l’écran…" />
    </div>
  );
}
