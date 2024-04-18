import { AfterViewInit, Component, ElementRef, HostListener, Injector, Sanitizer, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FontFamilyInfo, MongofontService, mapFont } from '../mongofont.service';
import { BehaviorSubject, Observable, combineLatest, combineLatestAll, forkJoin, map, of, switchMap, take, tap } from 'rxjs';
import { FontNameUrlMulti } from '../FontNameUrl';
import { FontResourceService } from '../font-resource.service';
import { AsyncPipe, JsonPipe, KeyValuePipe } from '@angular/common';
import * as opentype from 'opentype.js'
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { CALLBACK_TOKEN, GLYPH_TOKEN, ViewGlyphComponent } from './view-glyph/view-glyph.component';
import { FilterSelection, FilterSelections, FontfilterService } from '../fontoverview/fontfilter.service';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';


type GlyphInfo = {
  unicode: number;
  name: string | null;
  string: string;
  index: number;
};

@Component({
  selector: 'app-view-font',
  standalone: true,
  imports: [JsonPipe, KeyValuePipe, AsyncPipe, RouterLink, FontfiltersComponent, MatIconModule, ReactiveFormsModule],
  providers: [FontfilterService],
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
  fcTable = new FormControl(false)
  fontNext?: FontFamilyInfo;
  fontPrev?: FontFamilyInfo;
  filterService = inject(FontfilterService)
  attributes$?: Observable<FilterSelections>
  private readonly domSanitizer = inject(DomSanitizer);

  fontname = this.domSanitizer.bypassSecurityTrustHtml('<br>')

  constructor() {
    this.route.queryParams.pipe(take(1))
      .subscribe(
        ({ filters }) => {
          if (filters) {
            this.filterService.setSelection(JSON.parse(filters))
          }
        })

    this.filterService.fg.valueChanges.subscribe(selection => {
      this.router.navigate(['.'], { relativeTo: this.route, queryParamsHandling: 'merge', queryParams: { filters: JSON.stringify(selection) } })
    })

    this.fcTable.valueChanges.subscribe(c => {
      this.router.navigate(['.'], { relativeTo: this.route, queryParamsHandling: 'merge', queryParams: { table: c } })
    })

    this.route.queryParams
      .subscribe(params => {
        this.fcTable.setValue(params['table'] === 'true')
      })
    // exercise: flatten with only pipes
    combineLatest([
      this.route.params.pipe(
        // TODO: error case
        switchMap(params => this.fontService.getFontByName(params['name'])),
        map(mapFont)
      ),
      this.route.queryParams.pipe(
        switchMap(({ filters }) => {
          if (filters) {
            return this.filterService.mapFormEvent(JSON.parse(filters))
          }
          return [null]
        })
      )]
    ).pipe(
      switchMap(([font, _selector]) => {

        this.font = font
        this.fontname = this.domSanitizer.bypassSecurityTrustHtml(font.name.replaceAll(' ', '<br>'))
        this.attributes$ = this.filterService.getSelectedAttribute(font)

        const ffs = this.fontResourceService.getFontfaces(font, 'full')
        const selector = _selector || {}
        //@ts-ignore not yet in dom.ts

        ffs.forEach(ff => document.fonts.add(ff))
        // TODO: error case ;-)
        forkJoin(ffs.map(ff => ff.load()))
          .subscribe(ffs => {
            this.fontResourceReady.next(true)
          })

        const fullUrl = font.fonts[0].urls.full;
        opentype.load(fullUrl).then(ot => {
          this.ot = ot
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
        return combineLatest([
          this.fontService.getFontBySkip({ ...selector, idx: { $lt: font.idx } }, { sort: { idx: -1 } }),
          this.fontService.getFontBySkip({ ...selector, idx: { $gt: font.idx } })
        ])
      }))
      .subscribe(([p, n]) => {
        this.fontNext = n
        this.fontPrev = p
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
  _jsonParam({ key, value }) {
    if (typeof value === 'object') {
      return { filters: JSON.stringify({ [key]: value }) }
    }
    return { filters: JSON.stringify({ [key]: [value] }) }
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
