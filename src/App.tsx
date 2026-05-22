import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentProject, DrawingAnnotation, PageAnnotation, TextAnnotation, ToolType } from './types/annotations';
import { clearSavedNotebook, loadSavedPdfDataUrl, loadSavedProject, savePdfDataUrl, saveProject } from './features/storage/localProjectStorage';
import { downloadJson, fileToDataUrl } from './utils/download';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type PageSize = { width: number; height: number };
type DragState = { id: string; pageNumber: number; dx: number; dy: number } | null;

const defaultPageSize: PageSize = { width: 720, height: 940 };

const defaultProject = (): DocumentProject => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name: 'Untitled PDF notebook', createdAt: now, updatedAt: now, pages: [] };
};

const ensurePage = (project: DocumentProject, pageNumber: number): PageAnnotation => {
  return project.pages.find((page) => page.pageNumber === pageNumber) ?? { pageNumber, textAnnotations: [], drawingAnnotations: [] };
};

const upsertPage = (project: DocumentProject, page: PageAnnotation): DocumentProject => ({
  ...project,
  updatedAt: new Date().toISOString(),
  pages: [...project.pages.filter((item) => item.pageNumber !== page.pageNumber), page].sort((a, b) => a.pageNumber - b.pageNumber),
});

const pointInElement = (event: ReactPointerEvent, element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

const pointsToPath = (points: number[]) => {
  if (points.length < 4) return '';
  const [x, y, ...rest] = points;
  let path = `M ${x} ${y}`;
  for (let i = 0; i < rest.length; i += 2) path += ` L ${rest[i]} ${rest[i + 1]}`;
  return path;
};

function pageSummary(page: PageAnnotation) {
  const textCount = page.textAnnotations.length;
  const inkCount = page.drawingAnnotations.length;
  if (!textCount && !inkCount) return '暂无笔记';
  return `${textCount} 条文字 / ${inkCount} 条笔迹`;
}

export default function App() {
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [project, setProject] = useState<DocumentProject>(() => loadSavedProject() ?? defaultProject());
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(() => loadSavedPdfDataUrl());
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [tool, setTool] = useState<ToolType>('select');
  const [color, setColor] = useState('#ffcc33');
  const [strokeWidth, setStrokeWidth] = useState(16);
  const [opacity, setOpacity] = useState(0.35);
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState('#111827');
  const [bold, setBold] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeDrawing, setActiveDrawing] = useState<DrawingAnnotation | null>(null);
  const [draggingText, setDraggingText] = useState<DragState>(null);

  const notes = useMemo(() => {
    return project.pages.flatMap((page) => page.textAnnotations.map((note) => ({ ...note, pageNumber: page.pageNumber })));
  }, [project.pages]);

  useEffect(() => saveProject(project), [project]);
  useEffect(() => {
    if (pdfDataUrl) savePdfDataUrl(pdfDataUrl);
  }, [pdfDataUrl]);

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      if (!pdfDataUrl) {
        setPdfDoc(null);
        return;
      }
      const loaded = await pdfjsLib.getDocument(pdfDataUrl).promise;
      if (!cancelled) setPdfDoc(loaded);
    }
    loadPdf().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [pdfDataUrl]);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPdfDataUrl(dataUrl);
    setProject({ ...defaultProject(), name: file.name });
    setPageSizes({});
    setSelectedTextId(null);
  }

  function updatePage(nextPage: PageAnnotation) {
    setProject((current) => upsertPage(current, nextPage));
  }

  function updateText(pageNumber: number, id: string, patch: Partial<TextAnnotation>) {
    const page = ensurePage(project, pageNumber);
    updatePage({ ...page, textAnnotations: page.textAnnotations.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function deleteText(pageNumber: number, id: string) {
    const page = ensurePage(project, pageNumber);
    updatePage({ ...page, textAnnotations: page.textAnnotations.filter((item) => item.id !== id) });
    if (selectedTextId === id) setSelectedTextId(null);
  }

  function applyTextStyle() {
    const selected = notes.find((note) => note.id === selectedTextId);
    if (selected) updateText(selected.pageNumber, selected.id, { fontSize, color: textColor, bold });
  }

  function scrollToPage(pageNumber: number) {
    pageRefs.current[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToNote(note: TextAnnotation) {
    scrollToPage(note.pageNumber);
    setSelectedTextId(note.id);
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><h1>Study Notebook</h1><p>{project.name}</p></div>
        <div className="file-actions">
          <label className="button primary">上传 PDF<input type="file" accept="application/pdf" onChange={handleFileUpload} /></label>
          <button onClick={exportPdf}>导出 PDF</button>
          <button onClick={() => downloadJson(`${project.name || 'annotations'}.json`, project)}>导出 JSON</button>
          <button onClick={() => { clearSavedNotebook(); location.reload(); }}>清空</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <strong>笔记</strong>
          <div className="note-list">
            {notes.length ? notes.map((note) => (
              <button key={note.id} className={selectedTextId === note.id ? 'active' : ''} onClick={() => scrollToNote(note)}>
                <span>第 {note.pageNumber} 页</span>
                <em>{note.text.trim() || '空白文字笔记'}</em>
              </button>
            )) : <p>还没有文字笔记</p>}
          </div>
          <strong className="sidebar-heading">页面</strong>
          <div className="page-list">
            {Array.from({ length: pdfDoc?.numPages ?? 0 }, (_, index) => index + 1).map((pageNumber) => {
              const page = ensurePage(project, pageNumber);
              return <button key={pageNumber} onClick={() => scrollToPage(pageNumber)}>第 {pageNumber} 页<span>{pageSummary(page)}</span></button>;
            })}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="toolbar">
            {(['select', 'text', 'highlight', 'pen', 'eraser'] as ToolType[]).map((item) => <button key={item} className={tool === item ? 'active' : ''} onClick={() => setTool(item)}>{item}</button>)}
            <label>笔色 <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
            <label>粗细 <input type="range" min="2" max="36" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></label>
            <label>透明 <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>
            <label>字色 <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label>
            <label>字号 <input type="number" min="10" max="72" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>
            <button className={bold ? 'active' : ''} onClick={() => setBold((value) => !value)}>B</button>
            <button disabled={!selectedTextId} onClick={applyTextStyle}>应用文本样式</button>
          </div>

          <div className="document-stage">
            {!pdfDoc && <div className="empty-state">上传 PDF 后即可开始做学习批注</div>}
            {pdfDoc && Array.from({ length: pdfDoc.numPages }, (_, index) => index + 1).map((pageNumber) => (
              <PdfPageSurface
                key={pageNumber}
                pdfDoc={pdfDoc}
                pageNumber={pageNumber}
                page={ensurePage(project, pageNumber)}
                pageSize={pageSizes[pageNumber] ?? defaultPageSize}
                setPageSize={(size) => setPageSizes((current) => ({ ...current, [pageNumber]: size }))}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                opacity={opacity}
                fontSize={fontSize}
                textColor={textColor}
                bold={bold}
                selectedTextId={selectedTextId}
                activeDrawing={activeDrawing?.pageNumber === pageNumber ? activeDrawing : null}
                draggingText={draggingText}
                pageRef={(element) => { pageRefs.current[pageNumber] = element; }}
                setTool={setTool}
                setSelectedTextId={setSelectedTextId}
                setActiveDrawing={setActiveDrawing}
                setDraggingText={setDraggingText}
                updatePage={updatePage}
                updateText={updateText}
                deleteText={deleteText}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

interface PdfPageSurfaceProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  page: PageAnnotation;
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  textColor: string;
  bold: boolean;
  selectedTextId: string | null;
  activeDrawing: DrawingAnnotation | null;
  draggingText: DragState;
  pageRef: (element: HTMLDivElement | null) => void;
  setTool: (tool: ToolType) => void;
  setSelectedTextId: (id: string | null) => void;
  setActiveDrawing: (drawing: DrawingAnnotation | null) => void;
  setDraggingText: (dragging: DragState) => void;
  updatePage: (page: PageAnnotation) => void;
  updateText: (pageNumber: number, id: string, patch: Partial<TextAnnotation>) => void;
  deleteText: (pageNumber: number, id: string) => void;
}

function PdfPageSurface(props: PdfPageSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pdfPage = await props.pdfDoc.getPage(props.pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1.25 });
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      props.setPageSize({ width: viewport.width, height: viewport.height });
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      if (cancelled) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    renderPage().catch(console.error);
    return () => { cancelled = true; };
  }, [props.pdfDoc, props.pageNumber]);

  function eraseAt(x: number, y: number) {
    const hitText = props.page.textAnnotations.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
    if (hitText) {
      props.deleteText(props.pageNumber, hitText.id);
      return;
    }
    const drawings = props.page.drawingAnnotations.filter((drawing) => !drawing.points.some((point, index) => index % 2 === 0 && Math.hypot(point - x, drawing.points[index + 1] - y) < Math.max(12, drawing.strokeWidth)));
    props.updatePage({ ...props.page, drawingAnnotations: drawings });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointInElement(event, event.currentTarget);
    if (props.tool === 'text') {
      const annotation: TextAnnotation = { id: crypto.randomUUID(), pageNumber: props.pageNumber, x: point.x, y: point.y, width: 260, height: 72, text: '', fontSize: props.fontSize, color: props.textColor, bold: props.bold };
      props.updatePage({ ...props.page, textAnnotations: [...props.page.textAnnotations, annotation] });
      props.setSelectedTextId(annotation.id);
      props.setTool('select');
      return;
    }
    if (props.tool === 'pen' || props.tool === 'highlight') {
      const drawing: DrawingAnnotation = { id: crypto.randomUUID(), pageNumber: props.pageNumber, tool: props.tool, points: [point.x, point.y], color: props.color, strokeWidth: props.tool === 'highlight' ? props.strokeWidth : Math.max(2, Math.round(props.strokeWidth / 3)), opacity: props.tool === 'highlight' ? props.opacity : Math.max(props.opacity, 0.75) };
      props.setActiveDrawing(drawing);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (props.tool === 'eraser') {
      eraseAt(point.x, point.y);
      return;
    }
    props.setSelectedTextId(null);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointInElement(event, event.currentTarget);
    if (props.activeDrawing) props.setActiveDrawing({ ...props.activeDrawing, points: [...props.activeDrawing.points, point.x, point.y] });
    if (props.draggingText?.pageNumber === props.pageNumber) {
      props.updatePage({ ...props.page, textAnnotations: props.page.textAnnotations.map((item) => item.id === props.draggingText?.id ? { ...item, x: point.x - props.draggingText.dx, y: point.y - props.draggingText.dy } : item) });
    }
  }

  function handlePointerUp() {
    if (props.activeDrawing && props.activeDrawing.points.length > 3) props.updatePage({ ...props.page, drawingAnnotations: [...props.page.drawingAnnotations, props.activeDrawing] });
    props.setActiveDrawing(null);
    props.setDraggingText(null);
  }

  return (
    <section className="pdf-page-block" ref={props.pageRef}>
      <div className="page-label">第 {props.pageNumber} 页</div>
      <div ref={stageRef} className="page-layer" style={{ width: props.pageSize.width, height: props.pageSize.height }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        <canvas ref={canvasRef} />
        <svg className="ink-layer" width={props.pageSize.width} height={props.pageSize.height}>{[...props.page.drawingAnnotations, ...(props.activeDrawing ? [props.activeDrawing] : [])].map((drawing) => <path key={drawing.id} d={pointsToPath(drawing.points)} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} opacity={drawing.opacity} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
        {props.page.textAnnotations.map((text) => <div key={text.id} data-note-id={text.id} className={`text-note ${props.selectedTextId === text.id ? 'selected' : ''}`} style={{ left: text.x, top: text.y, width: text.width, minHeight: text.height, color: text.color, fontSize: text.fontSize, fontWeight: text.bold ? 700 : 400 }} onPointerDown={(event) => event.stopPropagation()}>
          <div className="drag-handle" onPointerDown={(event) => { event.stopPropagation(); props.setSelectedTextId(text.id); if (!stageRef.current) return; const point = pointInElement(event, stageRef.current); props.setDraggingText({ id: text.id, pageNumber: props.pageNumber, dx: point.x - text.x, dy: point.y - text.y }); }}>拖动</div>
          <textarea autoFocus={props.selectedTextId === text.id && !text.text} placeholder="直接输入笔记" value={text.text} onFocus={() => props.setSelectedTextId(text.id)} onChange={(event) => props.updateText(props.pageNumber, text.id, { text: event.target.value })} />
          <button className="delete-note" onClick={() => props.deleteText(props.pageNumber, text.id)}>删除</button>
        </div>)}
      </div>
    </section>
  );
}
