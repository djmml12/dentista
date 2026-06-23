import * as cornerstone from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import dicomParser from 'dicom-parser';

let initialized: Promise<void> | null = null;

// Dejamos al menos un núcleo libre para la UI y limitamos el máximo de workers.
function workerCount(): number {
  const cores = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(cores - 1, 4));
}

export function initCornerstone(): Promise<void> {
  if (initialized) return initialized;
  initialized = (async () => {
    dicomImageLoader.external.cornerstone = cornerstone;
    dicomImageLoader.external.dicomParser = dicomParser;

    await cornerstone.init();
    await cornerstoneTools.init();

    // Decodificamos en web workers para no congelar el hilo principal con DICOM grandes.
    // El loader no publica tipos ni una API estable entre versiones, así que detectamos
    // la forma disponible y toleramos fallos (en el peor caso decodifica en el hilo main).
    const maxWebWorkers = workerCount();
    try {
      if (typeof dicomImageLoader.init === 'function') {
        // API nueva (v1.x): inicializa workers internamente.
        dicomImageLoader.init({ maxWebWorkers });
      } else {
        if (typeof dicomImageLoader.configure === 'function') {
          dicomImageLoader.configure({
            decodeConfig: { convertFloatPixelDataToInt: false },
          });
        }
        dicomImageLoader.webWorkerManager?.initialize?.({
          maxWebWorkers,
          startWebWorkersOnDemand: true,
        });
      }
    } catch (err) {
      console.warn('No se pudieron inicializar los web workers de DICOM', err);
    }
  })();
  return initialized;
}
