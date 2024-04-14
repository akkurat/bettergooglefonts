import { AfterViewInit, Component, ElementRef, HostListener, Injector, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FontFamilyInfo, MongofontService, mapFont } from '../mongofont.service';
import { BehaviorSubject, combineLatest, forkJoin, map, switchMap } from 'rxjs';
import { FontNameUrlMulti } from '../FontNameUrl';
import { FontResourceService } from '../font-resource.service';
import { JsonPipe, KeyValuePipe } from '@angular/common';
import * as opentype from 'opentype.js'
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CALLBACK_TOKEN, GLYPH_TOKEN, ViewGlyphComponent } from './view-glyph/view-glyph.component';


type GlyphInfo = {
  unicode: number;
  name: string | null;
  string: string;
  index: number;
};

@Component({
  selector: 'app-view-font',
  standalone: true,
  imports: [JsonPipe, KeyValuePipe, RouterLink],
  templateUrl: './view-font.component.html',
})
export class ViewFontComponent {

  router = inject(Router)
  route = inject(ActivatedRoute)
  fontService = inject(MongofontService)
  fontResourceService = inject(FontResourceService)
  overlay = inject(Overlay)

  overlays = new Map<number, OverlayRef>()

  specimen = ''

  font?: FontNameUrlMulti;

  fontResourceReady = new BehaviorSubject(false)
  ot?: opentype.Font;
  glyphs: GlyphInfo[] = [];
  table = false
  fontNext?: FontFamilyInfo;
  fontPrev?: FontFamilyInfo;

  constructor() {
    this.route.queryParams
      .subscribe(params => {
        this.table = params['table'] === 'true'
      })
    // exercise: flatten with only pipes
    this.route.params.pipe(
      // TODO: error case
      switchMap(params => this.fontService.getFontByName(params['name'])),
      map(mapFont)
    ).subscribe(async font => {
      this.font = font
      const ffs = this.fontResourceService.getFontfaces(font, 'full')


      combineLatest([
        this.fontService.getFontBySkip({ idx: { $lt: font.idx } }, { sort: { idx: -1 } }),
        this.fontService.getFontBySkip({ idx: { $gt: font.idx } })
      ])
        .subscribe(([p, n]) => {
          this.fontNext = n
          this.fontPrev = p
        })


      //@ts-ignore not yet in dom.ts
      ffs.forEach(ff => document.fonts.add(ff))
      // TODO: error case ;-)
      forkJoin(ffs.map(ff => ff.load()))
        .subscribe(ffs => {
          this.fontResourceReady.next(true)
        })

      const fullUrl = font.fonts[0].urls.full;
      this.ot = await opentype.load(fullUrl)
      this.glyphs = new Array<GlyphInfo>()
      let _specimenBuffer = ''
      for (let i = 0; i < this.ot.glyphs.length; i++) {
        const glyph = this.ot.glyphs.get(i);
        const unicode = glyph.unicode;
        if (unicode) {
          const string = String.fromCodePoint(unicode);
          _specimenBuffer += string
          this.glyphs.push({
            unicode,
            name: glyph.name,
            string,
            index: glyph.index
          })
        }
      }
      this.specimen = _specimenBuffer

    })
  }

  toggleGlyphOverlay(glyphIndex: number, origin: HTMLElement) {
    // detach / attach
    if (this.overlays.has(glyphIndex)) {
      this.overlays.get(glyphIndex)?.dispose()
      this.overlays.delete(glyphIndex)
    } else {

      const fac = () => this.ot?.glyphs.get(glyphIndex)
      const injector = Injector.create({
        providers: [
          { provide: GLYPH_TOKEN, useValue: { font: this.ot, glyphIndex } },
          { provide: CALLBACK_TOKEN, useValue: () => this.toggleGlyphOverlay(glyphIndex, origin) }
        ]
      })

      const positionStrategy = this.overlay.position()
        .flexibleConnectedTo(origin)
        .withPositions([{
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
        }, {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
        }]);

      const scrollStrategy = this.overlay.scrollStrategies.reposition({ scrollThrottle: 100 })


      const overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy,
      });

      this.overlays.set(glyphIndex, overlayRef)
      const userProfilePortal = new ComponentPortal(ViewGlyphComponent, null, injector);
      overlayRef.attach(userProfilePortal);
    }
  }


  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (event.key === 'k') {
      this.router.navigate(['view', this.fontPrev?.meta.name], { queryParamsHandling: 'preserve' })
    } else if (event.key === 'j') {
      this.router.navigate(['view', this.fontNext?.meta.name], { queryParamsHandling: 'preserve' })
    }
  }
}
