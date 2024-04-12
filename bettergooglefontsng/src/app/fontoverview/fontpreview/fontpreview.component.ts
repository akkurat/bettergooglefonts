import { AfterRenderPhase, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, SimpleChange, SimpleChanges, ViewChild, afterNextRender, inject } from '@angular/core';
import { FontNameUrlMulti, generateFontCssWeight } from '../../FontNameUrl';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Subject, combineLatest, debounce, debounceTime, first, from, of, skipWhile, timer } from 'rxjs';
import { Platform, PlatformModule } from '@angular/cdk/platform';
import { FontResourceService } from 'src/app/font-resource.service';

@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterModule, NgClass, PlatformModule],
})
export class FontpreviewComponent implements OnChanges {

  @Input()
  font?: FontNameUrlMulti

  @Input()
  waterfall? = false

  @Input()
  showItalics? = false


  @ViewChild('contents')
  contentRef!: ElementRef<HTMLDivElement | HTMLSpanElement>

  protected style = "font-synthesis: none; font-weight: 400; font-family: 'Shantell Sans';"
  protected _specimenText = '___'

  private platform = inject(Platform)
  private _changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef)
  private $intersection = new BehaviorSubject(false)
  private $specimen = new Subject<SimpleChange>()

  private intersectionObserver: IntersectionObserver | null = null

  constructor() {
    afterNextRender(() => {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        console.debug(this.font?.name, entries[0].isIntersecting)
        this.$intersection.next(entries[0].isIntersecting)
      }, { threshold: 0, rootMargin: '10px 0px 100% 0px' });

      this.intersectionObserver.observe(this.contentRef.nativeElement);
    }, { phase: AfterRenderPhase.Write });


    combineLatest([
      this.$intersection,
      this.$specimen
    ]).subscribe(([i, s]) => {
      if (i || s.isFirstChange()) {
        this._specimenText = s.currentValue
        this._changeDetectorRef.detectChanges()
      }
    })


  }



  @Input()
  set specimenText(value: string | undefined) { }

  fontResourceService = inject(FontResourceService)

  ngOnChanges(changes: SimpleChanges): void {

    const { specimenText: specimenTextChange, font: fontChange } = changes

    if (specimenTextChange) {
      this.$specimen.next(specimenTextChange)
    }

    if (fontChange && fontChange.firstChange) {
      // TODO: if font already loaded, do not wait
      // mabye tooggle debounce at all
      const loaded = () => {
        const fontfaces = this.fontResourceService.getFontfaces(fontChange.currentValue);
        const allLoaded = fontfaces.every(ff => ff.status === 'loaded');
        return allLoaded ? of({}) : timer(1500);
      }



      this.$intersection.pipe(
        skipWhile(v => !v),
        debounce(v => loaded()),
        // debounceTime(1500),
        first(v => v)
      ).subscribe(v => this.initFont(fontChange.currentValue))
    }
  }


  private initFont(font) {
    const fontfaces = this.fontResourceService.getFontfaces(font)

    // document.fonts.addEventListener('loadingdone', ffs => {
    // })
    // @ts-expect-error Bug in TS (add does exist on FontFaceSet)
    fontfaces.forEach(ff => { document.fonts.add(ff); })

    // Waiting until font is loaded
    console.debug(font.name)
    if (fontfaces) {
      from(Promise.all(fontfaces.map(ff => ff.load())))
        .subscribe({
          next: all => {
            this.style = `font-weight: 400; font-synthesis: none; font-family: '${font.name}', Tofu;`
            console.debug("style set", font.name)
            this._changeDetectorRef.detectChanges()
          }, error: e => console.error(e, font, fontfaces)
        })
    }
    // appendStyleTag(css);
    // todo: italics
    // ) +(showItalics ? '; font-style: italic':'')">
  }

}

