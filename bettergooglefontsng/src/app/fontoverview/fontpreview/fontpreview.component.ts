import { AfterRenderPhase, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnChanges, SimpleChange, SimpleChanges, ViewChild, ViewRef, afterNextRender, inject } from '@angular/core';
import { appendStyleTag, FontNameUrlMulti, generateFontCss, generateFontCssWeight } from '../../FontNameUrl';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Subject, bufferTime, combineLatest, debounceTime, delay, first, firstValueFrom, from, skipUntil, skipWhile } from 'rxjs';
import { Platform, PlatformModule } from '@angular/cdk/platform';

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

  ngOnChanges(changes: SimpleChanges): void {

    const { specimenText: specimenTextChange, font: fontChange } = changes

    if (specimenTextChange) {
      this.$specimen.next(specimenTextChange)
    }

    if (fontChange && fontChange.firstChange) {
      // TODO: if font already loaded, do not wait
      this.$intersection.pipe(
        skipWhile(v => !v),
        debounceTime(1500),
        first(v => v)
      ).subscribe(v => this.initFont(fontChange.currentValue))
    }
  }


  private initFont(font) {
    const weightAxis = font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    // new FontAPI FTW
    let css = '';

    let fontfaces: FontFace[] = []


    // Webkit seems to add quotes around
    // firefox does not
    const qt = this.platform.FIREFOX ? "'" : ""

    for (const f of font.fonts) {
      const weights = weightAxis ? `${weightAxis.min_value} ${weightAxis.max_value}` : f.weight;

      const fontFace = new FontFace(`${qt}${font.name}${qt}`, `url('${f.url}')`, { weight: weights, style: 'normal' });
      fontfaces.push(fontFace)
      css += generateFontCssWeight({ name: font.name, url: f.url, weight: weights, style: 'normal' });
      if (f.italicUrl) {
        fontfaces.push(new FontFace(`${qt}${font.name}${qt}`, `url('${f.italicUrl}')`, { weight: weights, style: 'italic' }))
        css += generateFontCssWeight({ name: font.name, url: f.italicUrl, weight: weights, style: 'italic' });
      }
    }

    // document.fonts.addEventListener('loadingdone', ffs => {
    // })
    // @ts-expect-error Bug in TS (add does exist on FontFaceSet)
    fontfaces.forEach(ff => { document.fonts.add(ff); })

    // Waiting until font is loaded
    from(Promise.all(fontfaces.map(ff => ff.load())))
      .subscribe({
        next: all => {
          this.style = `font-weight: 400; font-synthesis: none; font-family: '${font.name}', Tofu;`
          console.debug("style set")
          this._changeDetectorRef.detectChanges()
        }, error: e => console.error(e, font, fontfaces)
      })
    // appendStyleTag(css);
    // todo: italics
    // ) +(showItalics ? '; font-style: italic':'')">
  }
}


