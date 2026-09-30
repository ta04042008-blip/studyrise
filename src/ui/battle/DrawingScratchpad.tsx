import { useEffect, useRef, useState } from 'react';

type DrawingTool = 'pen' | 'eraser';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  tool: DrawingTool;
  points: Point[];
}

interface DrawingScratchpadProps {
  open: boolean;
  onClose: () => void;
}

const FALLBACK_WIDTH = 900;
const FALLBACK_HEIGHT = 460;

export function DrawingScratchpad({ open, onClose }: DrawingScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');

  function canvasMetrics(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      rect,
      width: Math.max(1, rect.width || canvas.clientWidth || FALLBACK_WIDTH),
      height: Math.max(1, rect.height || canvas.clientHeight || FALLBACK_HEIGHT),
    };
  }

  function configureContext(ctx: CanvasRenderingContext2D, strokeTool: DrawingTool, pressure = 0.5) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (strokeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 28;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2.6 * (0.8 + Math.max(0, pressure) * 0.7);
      ctx.strokeStyle = '#18222c';
      ctx.fillStyle = '#18222c';
    }
  }

  function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;
    const first = stroke.points[0];
    configureContext(ctx, stroke.tool, first.pressure);

    if (stroke.points.length === 1) {
      const radius = stroke.tool === 'eraser' ? 14 : Math.max(1.5, ctx.lineWidth / 2);
      ctx.beginPath();
      ctx.arc(first.x, first.y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const current = stroke.points[index];
      configureContext(ctx, stroke.tool, current.pressure);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    }
  }

  function redrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasMetrics(canvas);
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const stroke of strokesRef.current) renderStroke(ctx, stroke);
  }

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(redrawCanvas);
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const { rect, width, height } = canvasMetrics(canvas);
    const rectWidth = rect.width || width;
    const rectHeight = rect.height || height;
    const pressure = event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : 0.5;
    return {
      x: ((event.clientX - rect.left) / rectWidth) * width,
      y: ((event.clientY - rect.top) / rectHeight) * height,
      pressure,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const stroke: Stroke = { tool, points: [pointFromEvent(event)] };
    strokesRef.current.push(stroke);
    activeStrokeRef.current = stroke;
    redrawCanvas();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    event.preventDefault();
    stroke.points.push(pointFromEvent(event));
    redrawCanvas();
  }

  function endStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStrokeRef.current) return;
    event.preventDefault();
    activeStrokeRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function clearAll() {
    activeStrokeRef.current = null;
    strokesRef.current = [];
    redrawCanvas();
  }

  return (
    <div className="drawing-scratchpad" hidden={!open} aria-hidden={!open}>
      <section className="drawing-scratchpad__panel" role="dialog" aria-modal="true" aria-label="計算メモ">
        <header className="drawing-scratchpad__header">
          <div>
            <strong>計算メモ</strong>
            <span>Apple Pencil・指・マウスで書けます</span>
          </div>
          <button type="button" className="drawing-scratchpad__close" onClick={onClose}>
            閉じる
          </button>
        </header>

        <div className="drawing-scratchpad__tools" aria-label="描画ツール">
          <button
            type="button"
            aria-pressed={tool === 'pen'}
            className={tool === 'pen' ? 'drawing-scratchpad__tool--active' : ''}
            onClick={() => setTool('pen')}
          >
            ペン
          </button>
          <button
            type="button"
            aria-pressed={tool === 'eraser'}
            className={tool === 'eraser' ? 'drawing-scratchpad__tool--active' : ''}
            onClick={() => setTool('eraser')}
          >
            消しゴム
          </button>
          <button type="button" onClick={clearAll}>全消去</button>
        </div>

        <canvas
          ref={canvasRef}
          className="drawing-scratchpad__canvas"
          aria-label="手書き計算メモ"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') endStroke(event);
          }}
        />
        <p className="drawing-scratchpad__note">このメモは次の問題に進むとリセットされます。</p>
      </section>
    </div>
  );
}
