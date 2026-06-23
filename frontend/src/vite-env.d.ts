/// <reference types="vite/client" />

// El loader DICOM de Cornerstone no publica tipos; lo declaramos como módulo
// sin tipar para poder importarlo sin romper `tsc --noEmit`.
declare module '@cornerstonejs/dicom-image-loader';
