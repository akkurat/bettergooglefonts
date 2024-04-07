import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { appendStyleTag, FontNameUrlMulti, generateFontCss, generateFontCssWeight } from '../FontNameUrl';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, delay, from } from 'rxjs';
import { Platform, PlatformModule } from '@angular/cdk/platform';


@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterModule, NgClass, PlatformModule],
})
export class FontpreviewComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    // console.log(this.font?.weightInfo?.virtualWeights)
  }

  @Input()
  font?: FontNameUrlMulti
  @Input()
  waterfall = false
  @Input()
  showItalics = false
  @Input()
  specimenOnly = false;

  _wasInViewport = false
  private _isInViewPort: any;

  @Input()
  set inViewPort(value) {
    if (value) {
      if (!this._wasInViewport) {
        this._wasInViewport = true
        if (this.font) {
          this.initAll(this.font)
        } else {
          throw new Error('font not initialized')
        }
      }

      if (this._customText.dirty) {
        this.specimentText = this._customText.value
        this._customText.dirty = false
      }
    }
    this._isInViewPort = value;
  }

  @Input()
  set customText(value: string) {
    if (this._isInViewPort) {
      this._customText.value = value
      this._customText.dirty = false
      this.specimentText = value
    } else {
      this._customText.value = value
      this._customText.dirty = true
    }
  }

  _customText = { value: '', dirty: false }

  specimentText = ''

  style = "font-synthesis: none; font-weight: 400; font-family: 'Shantell Sans';"

  platform = inject(Platform)


  private initAll(font) {
    const weightAxis = font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    // new FontAPI FTW
    let css = '';

    let fontfaces: FontFace[] = []

    if (font.name.startsWith('Baloo')) {
      console.log('jubajuba')
    }

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
    // @ts-expect-error
    fontfaces.forEach(ff => { document.fonts.add(ff); })

    // Waiting until font is loaded

    from(Promise.all(fontfaces.map(ff => ff.load())))
      // .pipe( delay(Math.random()*1000))
      .subscribe(all => {
        this.style = `font-weight: 400; font-synthesis: none; font-family: '${font.name}', Tofu;`
        this.font
      }, e => console.error(e, font, fontfaces))




    // appendStyleTag(css);

    // todo: italics
    // ) +(showItalics ? '; font-style: italic':'')">
  }
}


