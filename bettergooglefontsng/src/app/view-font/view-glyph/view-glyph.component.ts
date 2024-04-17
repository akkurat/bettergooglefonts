import { AfterContentInit, AfterViewChecked, AfterViewInit, Component, ElementRef, Inject, InjectionToken, ViewChild } from '@angular/core';
import { Font, Glyph } from 'opentype.js';

export const GLYPH_TOKEN = new InjectionToken<Glyph>('glyph-data');
export const CALLBACK_TOKEN = new InjectionToken<VoidFunction>('callback-data');
@Component({
  selector: 'app-view-glyph',
  standalone: true,
  imports: [],
  templateUrl: './view-glyph.component.html'
})

// https://github.com/opentypejs/opentype.js/blob/master/docs/glyph-inspector.html

export class ViewGlyphComponent implements AfterViewInit, AfterContentInit {
  @ViewChild('canvasFront')
  canvasFront!: ElementRef<HTMLCanvasElement>
  @ViewChild('canvasBack')
  canvasBack!: ElementRef<HTMLCanvasElement>
  glyph?: Glyph;
  cHeight = 0
  cWidth = 0
  margin = 0

  constructor(
    protected elementRef: ElementRef,
    @Inject(GLYPH_TOKEN) protected fontIdx: { font: Font, glyphIndex: number },
    @Inject(CALLBACK_TOKEN) protected closeCallback: VoidFunction
  ) {

    elementRef.nativeElement.className = "contents"
    console.log(this)
  }
  ngAfterContentInit(): void {
    this.glyph = this.fontIdx.font.glyphs.get(this.fontIdx.glyphIndex)
    const font = this.fontIdx.font

    const metrics = this.glyph.getMetrics()

    const delta = font.tables['head']['yMax'] - font.tables['head']['yMin'];
    this.cHeight = 1.3 * delta
    this.cWidth = 0.3 * delta + metrics.xMax - metrics.xMin

    this.margin = 0.15 * delta
  }

  ngAfterViewInit(): void {
    const ctx = this.canvasFront.nativeElement.getContext("2d");
    const canvas = this.canvasFront.nativeElement
    const glyphMargin = this.margin
    const font = this.fontIdx.font
    const glyph = this.glyph

    if (!ctx) {
      return
    }

    const head = font.tables['head']
    const glyphBaseline = glyphMargin + head['yMax'];

    const hline = (text: string, yunits: number) => {
      const ypx = glyphBaseline - yunits;
      ctx.font = '40px Shantell Sans'
      ctx.fillText(text, 2, ypx + 3);
      ctx.fillRect(0, ypx, this.cWidth, 5)
    }

    ctx.fillStyle = '#a0a0a0';
    hline('Baseline', 0);
    hline('yMax', font.tables['head']['yMax']);
    hline('yMin', font.tables['head']['yMin']);
    hline('Ascender', font.tables['hhea']['ascender']);
    hline('Descender', font.tables['hhea']['descender']);
    hline('Typo Ascender', font.tables['os2']['sTypoAscender']);
    hline('Typo Descender', font.tables['os2']['sTypoDescender']);

    console.log("checked", this.canvasFront)
    if (glyph && ctx) {
      // this.glyph?.draw( ctxt )

      const glyphWidth = glyph.advanceWidth,
        // @ts-ignore
        xmin = (this.cWidth - glyphWidth) / 2, xmax = (this.cWidth + glyphWidth) / 2,
        x0 = xmin,
        markSize = 10;

      ctx.fillStyle = '#606060';
      ctx.fillRect(xmin - markSize + 1, glyphBaseline, markSize, 1);
      ctx.fillRect(xmin, glyphBaseline, 1, markSize);
      ctx.fillRect(xmax, glyphBaseline, markSize, 1);
      ctx.fillRect(xmax, glyphBaseline, 1, markSize);
      ctx.textAlign = 'center';
      ctx.fillText('0', xmin, glyphBaseline + markSize + 10);
      //@ts-ignore
      ctx.fillText(glyph.advanceWidth, xmax, glyphBaseline + markSize + 10);

      const options = Object.assign({}, font.defaultRenderOptions);

      ctx.fillStyle = '#000000';
      const path = glyph.getPath(x0, glyphBaseline, font.unitsPerEm, options, font);
      path.fill = '#808080';
      path.stroke = '#000000';
      path.strokeWidth = 1.5;
      drawPathWithArrows(ctx, path);
      glyph.drawPoints(ctx, x0, glyphBaseline, font.unitsPerEm, options);
    }
  }
}

function drawPathWithArrows(ctx: CanvasRenderingContext2D, path) {
  const layers = path._layers;
  if (layers && layers.length) {
    for (let l = 0; l < layers.length; l++) {
      drawPathWithArrows(ctx, layers[l]);
    }
    return;
  }
  const image = path._image;
  if (image) {
    ctx.drawImage(image.image, image.x, image.y, image.width, image.height);
    return;
  }
  let i, cmd, x1 = 0, y1 = 0, x2 = 0, y2 = 0
  const arrows = new Array<[CanvasRenderingContext2D, number, number, number, number]>()
  ctx.beginPath();
  for (i = 0; i < path.commands.length; i += 1) {
    cmd = path.commands[i];
    if (cmd.type === 'M') {
      if (x1 !== undefined) {
        arrows.push([ctx, x1, y1, x2, y2]);
      }
      ctx.moveTo(cmd.x, cmd.y);
    } else if (cmd.type === 'L') {
      ctx.lineTo(cmd.x, cmd.y);
      x1 = x2;
      y1 = y2;
    } else if (cmd.type === 'C') {
      ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      x1 = cmd.x2;
      y1 = cmd.y2;
    } else if (cmd.type === 'Q') {
      ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      x1 = cmd.x1;
      y1 = cmd.y1;
    } else if (cmd.type === 'Z') {
      arrows.push([ctx, x1, y1, x2, y2]);
      if (path.stroke) {
        ctx.closePath();
      }
    }
    x2 = cmd.x;
    y2 = cmd.y;
  }
  if (path.fill) {
    ctx.fillStyle = path.fill;
    ctx.fill();
  }
  if (path.stroke) {
    ctx.strokeStyle = path.stroke;
    ctx.lineWidth = path.strokeWidth;
    ctx.stroke();
  }
  ctx.fillStyle = '#000000';
  arrows.forEach(function (arrow) {
    drawArrow(...arrow);
  });
}

const arrowLength = 10,
  arrowAperture = 4,
  options = {};
function drawArrow(ctx, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1,
    dy = y2 - y1,
    segmentLength = Math.sqrt(dx * dx + dy * dy),
    unitx = dx / segmentLength,
    unity = dy / segmentLength,
    basex = x2 - arrowLength * unitx,
    basey = y2 - arrowLength * unity,
    normalx = arrowAperture * unity,
    normaly = -arrowAperture * unitx;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(basex + normalx, basey + normaly);
  ctx.lineTo(basex - normalx, basey - normaly);
  ctx.lineTo(x2, y2);
  ctx.fill();
}
