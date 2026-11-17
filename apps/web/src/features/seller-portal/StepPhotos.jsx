import { useRef, useState } from 'react';
import Icon from '../../shared/ui/Icon.jsx';
import { PrimaryButton, StepActions } from './PublishFields.jsx';
import { formatBytes, MAX_PHOTOS, photoProblem } from './publish.js';

let counter = 0;

/** Crea la entrada de una foto nueva (con su vista previa, cuando el navegador la permite). */
export function newPhoto(file) {
  counter += 1;
  const previewUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
  return { id: `foto-${counter}`, file, previewUrl, key: null, status: 'ready', error: null };
}

/** Paso 3: hasta 5 fotos reales del producto, JPG o PNG de hasta 5 MB. La primera es la portada. */
export default function StepPhotos({ photos, onChange, onNext, onBack }) {
  const input = useRef(null);
  const [problems, setProblems] = useState([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files) => {
    const accepted = [];
    const rejected = [];
    for (const file of files) {
      const problem = photoProblem(file);
      if (problem) rejected.push(`${file.name}: ${problem}`);
      else if (photos.length + accepted.length >= MAX_PHOTOS) {
        rejected.push(`${file.name}: ya tienes ${MAX_PHOTOS} fotos`);
      } else accepted.push(newPhoto(file));
    }
    setProblems(rejected);
    if (accepted.length > 0) onChange([...photos, ...accepted]);
  };

  const remove = (photo) => {
    if (photo.previewUrl && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(photo.previewUrl);
    }
    onChange(photos.filter((item) => item.id !== photo.id));
  };

  const makeCover = (photo) => onChange([photo, ...photos.filter((item) => item.id !== photo.id)]);

  return (
    <section aria-labelledby="paso-fotos" className="space-y-space-lg">
      <header className="space-y-1">
        <p className="text-label-sm uppercase tracking-wider text-primary">Paso 03 de 04</p>
        <h2 id="paso-fotos" className="text-headline-md text-on-surface">
          Fotografías reales del producto
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Sube hasta {MAX_PHOTOS} fotos reales de la caja, los sellos y el número de serie. Son
          opcionales, pero las ofertas con fotos generan más confianza.
        </p>
      </header>

      <p role="status" className="text-label-md text-on-surface">
        {photos.length} de {MAX_PHOTOS} fotos cargadas
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles([...event.dataTransfer.files]);
        }}
        className={`flex flex-col items-center gap-space-sm rounded-2xl border-2 border-dashed p-space-xl text-center transition-colors ${
          dragging
            ? 'border-primary bg-surface-container-high'
            : 'border-outline-variant bg-surface'
        }`}
      >
        <Icon name="cloud_upload" className="text-[36px] text-primary" />
        <p className="text-label-md text-on-surface">
          Arrastra las fotos aquí o selecciónalas desde tu equipo
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Archivos JPG o PNG de hasta 5 MB cada uno.
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          aria-label="Seleccionar fotos"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            addFiles([...event.target.files]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={photos.length >= MAX_PHOTOS}
          onClick={() => input.current?.click()}
          className="h-11 rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
        >
          Seleccionar archivos locales
        </button>
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl bg-surface-container p-space-md">
          {problems.map((text) => (
            <li key={text} className="flex items-start gap-1 text-body-sm text-incompatible">
              <Icon name="error" className="mt-0.5 text-[16px]" />
              {text}
            </li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <ul aria-label="Fotos listas para publicar" className="grid gap-space-sm sm:grid-cols-2">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="flex items-center gap-space-sm rounded-2xl bg-surface-container p-space-sm"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
                {photo.previewUrl ? (
                  <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="image" className="text-[28px] text-outline" />
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-label-md text-on-surface">{photo.file.name}</p>
                <p className="text-body-sm text-outline">
                  {formatBytes(photo.file.size)}
                  {index === 0 && <span className="ml-2 text-primary">Foto principal</span>}
                </p>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(photo)}
                    aria-label={`Hacer principal ${photo.file.name}`}
                    className="text-label-sm text-primary underline"
                  >
                    Hacer principal
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(photo)}
                aria-label={`Quitar ${photo.file.name}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-incompatible"
              >
                <Icon name="delete" className="text-[20px]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-1 text-body-sm text-outline">
        <Icon name="policy" className="mt-0.5 text-[16px]" />
        Las fotos deben ser del producto real en tu local. Los renders genéricos de terceros pueden
        suspender tu insignia de verificado.
      </p>

      <StepActions onBack={onBack} backLabel="Volver a condiciones">
        <PrimaryButton onClick={onNext}>Revisar resumen y publicar</PrimaryButton>
      </StepActions>
    </section>
  );
}
