import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MongofontService, mapFont } from '../mongofont.service';
import { BehaviorSubject, forkJoin, map, switchMap } from 'rxjs';
import { FontNameUrlMulti } from '../FontNameUrl';
import { FontResourceService } from '../font-resource.service';
import { JsonPipe, KeyValuePipe } from '@angular/common';
import * as opentype from 'opentype.js'

type GlyphInfo = {
  unicode: number;
  name: string | null;
  string: string;
};

@Component({
  selector: 'app-view-font',
  standalone: true,
  imports: [JsonPipe, KeyValuePipe],
  templateUrl: './view-font.component.html',
})
export class ViewFontComponent implements AfterViewInit {

  @ViewChild('wrongFont', { static: true })
  private wrongFontDiv!: ElementRef<HTMLDivElement>
  @ViewChild('correctFont', { static: true })
  private correctFontDiv!: ElementRef<HTMLDivElement>

  route = inject(ActivatedRoute)
  fontService = inject(MongofontService)
  fontResourceService = inject(FontResourceService)

  specimen = String.fromCharCode(...Array(330).keys())

  font?: FontNameUrlMulti;

  fontResourceReady = new BehaviorSubject(false)
  ot?: opentype.Font;
  glyphs: GlyphInfo[] = [];


  constructor() {
    // exercise: flatten with only pipes
    this.route.params.pipe(
      // TODO: error case
      switchMap(params => this.fontService.getFontByName(params['name'])),
      map(mapFont)
    ).subscribe(async font => {
      this.font = font
      const ffs = this.fontResourceService.getFontfaces(font, 'full')
      //@ts-ignore not yet in dom.ts
      ffs.forEach(ff => document.fonts.add(ff))


      // TODO: error case ;-)
      forkJoin(ffs.map(ff => ff.load()))
        .subscribe(ffs => {
          this.fontResourceReady.next(true)
        })

      this.ot = await opentype.load(font.fonts[0].urls.full)
      this.glyphs = new Array<GlyphInfo>()
      for (let i = 0; i < this.ot.glyphs.length; i++) {
        const glyph = this.ot.glyphs.get(i);
        const unicode = glyph.unicode;
        if (unicode) {
          this.glyphs.push({
            unicode,
            name: glyph.name,
            string: String.fromCodePoint()
          })
        }
      }

    })
  }
  ngAfterViewInit(): void {
    this.fontResourceReady.subscribe(v => {
      if (v) {
        this.correctFontDiv.nativeElement.classList.remove('opacity-0')
        this.correctFontDiv.nativeElement.classList.add('opacity-100')
        this.wrongFontDiv.nativeElement.classList.remove('opacity-20')
        this.wrongFontDiv.nativeElement.classList.add('opacity-0')
      }
    })
  }

}
