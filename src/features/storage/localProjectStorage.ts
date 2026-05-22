import type { DocumentProject } from '../../types/annotations';

const PROJECT_KEY = 'study-notebook.project';
const PDF_KEY = 'study-notebook.pdfDataUrl';

export function loadSavedProject(): DocumentProject | null {
  const raw = localStorage.getItem(PROJECT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocumentProject;
  } catch {
    return null;
  }
}

export function saveProject(project: DocumentProject) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
}

export function loadSavedPdfDataUrl() {
  return localStorage.getItem(PDF_KEY);
}

export function savePdfDataUrl(dataUrl: string) {
  localStorage.setItem(PDF_KEY, dataUrl);
}

export function clearSavedNotebook() {
  localStorage.removeItem(PROJECT_KEY);
  localStorage.removeItem(PDF_KEY);
}
