import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentProject, DrawingAnnotation, PageAnnotation, TextAnnotation, ToolType } from './types/annotations';
import { clearSavedNotebook, loadSavedPdfDataUrl, loadSavedProject, savePdfDataUrl, saveProject } from './features/storage/localProjectStorage';
import { downloadJson, fileToDataUrl } from './utils/download';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [project, setProject] = useState<DocumentProject>(() => loadSavedProject() ?? defaultProject());
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(() => loadSavedPdfDataUrl());
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 720, height: 940 });
  const [tool, setTool] = useState<ToolType>('select');
  const [color, setColor] = useState('#ffcc33');
  const [strokeWidth, setStrokeWidth] = useState(16);
  const [opacity, setOpacity] = useState(0.35);
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState('#111827');
  const [bold, setBold] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [activeDrawing, setActiveDrawing] = useState<DrawingAnnotation | null>(null);
  const [draggingText, setDraggingText] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const page = useMemo(() => ensurePage(project, pageNumber), [project, pageNumber]);

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
      if (!cancelled) {
        setPdfDoc(loaded);
        setPageNumber(1);
      }
    }
    loadPdf().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [pdfDataUrl]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      const pdfPage = await pdfDoc.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1.25 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageSize({ width: viewport.width, height: viewport.height });
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      if (cancelled) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    renderPage().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPdfDataUrl(dataUrl);
    setProject({ ...defaultProject(), name: file.name });
    setSelectedTextId(null);
  }

  function updateCurrentPage(nextPage: PageAnnotation) {
    setProject((current) => upsertPage(current, nextPage));
  }

  function handleLayerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointInElement(event, event.currentTarget);
    if (tool === 'text') {
      const annotation: TextAnnotation = { id: crypto.randomUUID(), pageNumber, x: point.x, y: point.y, width: 220, height: 88, text: '新文本', fontSize, color: textColor, bold };
      updateCurrentPage({ ...page, textAnnotations: [...page.textAnnotations, annotation] });
      setSelectedTextId(annotation.id);
      setTool('select');
      return;
    }
    if (tool === 'pen' || tool === 'highlight') {
      const drawing: DrawingAnnotation = { id: crypto.randomUUID(), pageNumber, tool, points: [point.x, point.y], color, strokeWidth: tool === 'highlight' ? strokeWidth : Math.max(2, Math.round(strokeWidth / 3)), opacity: tool === 'highlight' ? opacity : Math.max(opacity, 0.75) };
      setActiveDrawing(drawing);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === 'eraser') {
      eraseAt(point.x, point.y);
      return;
    }
    setSelectedTextId(null);
  }

  function handleLayerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointInElement(event, event.currentTarget);
    if (activeDrawing) setActiveDrawing({ ...activeDrawing, points: [...activeDrawing.points, point.x, point.y] });
    if (draggingText) {
      const updatedTexts = page.textAnnotations.map((item) => item.id === draggingText.id ? { ...item, x: point.x - draggingText.dx, y: point.y - draggingText.dy } : item);
      updateCurrentPage({ ...page, textAnnotations: updatedTexts });
    }
  }

  function handleLayerPointerUp() {
    if (activeDrawing && activeDrawing.points.length > 3) updateCurrentPage({ ...page, drawingAnnotations: [...page.drawingAnnotations, activeDrawing] });
    setActiveDrawing(null);
    setDraggingText(null);
  }

  function updateText(id: string, patch: Partial<TextAnnotation>) {
    updateCurrentPage({ ...page, textAnnotations: page.textAnnotations.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function deleteText(id: string) {
    updateCurrentPage({ ...page, textAnnotations: page.textAnnotations.filter((item) => item.id !== id) });
    setSelectedTextId(null);
  }

  function applyTextStyle() {
    if (selectedTextId) updateText(selectedTextId, { fontSize, color: textColor, bold });
  }

  function eraseAt(x: number, y: number) {
    const hitText = page.textAnnotations.find((item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height);
    if (hitText) {
      deleteText(hitText.id);
      return;
    }
    const drawings = page.drawingAnnotations.filter((drawing) => !drawing.points.some((point, index) => index % 2 === 0 && Math.hypot(point - x, drawing.points[index + 1] - y) < Math.max(12, drawing.strokeWidth)));
    updateCurrentPage({ ...page, drawingAnnotations: drawings });
  }

  const selectedText = page.textAnnotations.find((item) => item.id === selectedTextId);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><h1>Study Notebook</h1><p>{project.name}</p></div>
        <div className="file-actions">
          <label className="button primary">上传 PDF<input type="file" accept="application/pdf" onChange={handleFileUpload} /></label>
          <button onClick={() => downloadJson(`${project.name || 'annotations'}.json`, project)}>导出 JSON</button>
          <button onClick={() => { clearSavedNotebook(); location.reload(); }}>清空</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar"><strong>页面</strong><div className="page-list">{Array.from({ length: pdfDoc?.numPages ?? 0 }, (_, index) => index + 1).map((page) => <button key={page} className={page === pageNumber ? 'active' : ''} onClick={() => setPageNumber(page)}>第 {page} 页</button>)}</div></aside>
        <section className="editor-panel">
          <div className="toolbar">
            {(['select', 'text', 'highlight', 'pen', 'eraser'] as ToolType[]).map((item) => <button key={item} className={tool === item ? 'active' : ''} onClick={() => setTool(item)}>{item}</button>)}
            <label>笔色 <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
            <label>粗细 <input type="range" min="2" max="36" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></label>
            <label>透明 <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>
            <label>字色 <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label>
            <label>字号 <input type="number" min="10" max="72" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label>
            <button className={bold ? 'active' : ''} onClick={() => setBold((value) => !value)}>B</button>
            <button disabled={!selectedText} onClick={applyTextStyle}>应用文本样式</button>
          </div>
          <div className="pager"><button disabled={!pdfDoc || pageNumber <= 1} onClick={() => setPageNumber((page) => page - 1)}>上一页</button><span>{pdfDoc ? `${pageNumber} / ${pdfDoc.numPages}` : '请上传 PDF 开始批注'}</span><button disabled={!pdfDoc || pageNumber >= pdfDoc.numPages} onClick={() => setPageNumber((page) => page + 1)}>下一页</button></div>
          <div className="document-stage"><div ref={stageRef} className="page-layer" style={{ width: pageSize.width, height: pageSize.height }} onPointerDown={handleLayerPointerDown} onPointerMove={handleLayerPointerMove} onPointerUp={handleLayerPointerUp} onPointerCancel={handleLayerPointerUp}>
            <canvas ref={canvasRef} />
            <svg className="ink-layer" width={pageSize.width} height={pageSize.height}>{[...page.drawingAnnotations, ...(activeDrawing ? [activeDrawing] : [])].map((drawing) => <path key={drawing.id} d={pointsToPath(drawing.points)} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} opacity={drawing.opacity} strokeLinecap="round" strokeLinejoin="round" />)}</svg>
            {page.textAnnotations.map((text) => <div key={text.id} className={`text-note ${selectedTextId === text.id ? 'selected' : ''}`} style={{ left: text.x, top: text.y, width: text.width, minHeight: text.height, color: text.color, fontSize: text.fontSize, fontWeight: text.bold ? 700 : 400 }} onPointerDown={(event) => event.stopPropagation()}>
              <div className="drag-handle" onPointerDown={(event) => { event.stopPropagation(); setSelectedTextId(text.id); if (!stageRef.current) return; const point = pointInElement(event, stageRef.current); setDraggingText({ id: text.id, dx: point.x - text.x, dy: point.y - text.y }); }}>拖动</div>
              <textarea value={text.text} onFocus={() => setSelectedTextId(text.id)} onChange={(event) => updateText(text.id, { text: event.target.value })} />
              <button className="delete-note" onClick={() => deleteText(text.id)}>删除</button>
            </div>)}
            {!pdfDoc && <div className="empty-state">上传 PDF 后即可开始做学习批注</div>}
          </div></div>
        </section>
      </section>
    </main>
  );
}
