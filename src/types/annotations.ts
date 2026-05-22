export type ToolType = 'select' | 'text' | 'highlight' | 'pen' | 'eraser';

export interface DocumentProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: PageAnnotation[];
}

export interface PageAnnotation {
  pageNumber: number;
  textAnnotations: TextAnnotation[];
  drawingAnnotations: DrawingAnnotation[];
}

export interface TextAnnotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
}

export interface DrawingAnnotation {
  id: string;
  pageNumber: number;
  tool: 'highlight' | 'pen';
  points: number[];
  color: string;
  strokeWidth: number;
  opacity: number;
}
