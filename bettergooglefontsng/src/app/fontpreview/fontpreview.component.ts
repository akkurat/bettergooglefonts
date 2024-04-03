import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { appendStyleTag, FontNameUrlMulti, generateFontCss, generateFontCssWeight } from '../FontNameUrl';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, delay } from 'rxjs';

@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterModule, NgClass],
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
    }
    this._isInViewPort = value;
  }

  @Input()
  customText = ''

  style = "font-synthesis: none; font-family: 'Shantell Sans';"



  private initAll(font) {
    const weightAxis = font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    // new FontAPI FTW
    let css = '';

    let fontfaces: FontFace[] = []

    for (const f of font.fonts) {
      const weights = weightAxis ? `${weightAxis.min_value} ${weightAxis.max_value}` : f.weight;

      fontfaces.push(new FontFace(font.name, `url(${f.url})`, { weight: weights, style: 'normal' }))
      css += generateFontCssWeight({ name: font.name, url: f.url, weight: weights, style: 'normal' });
      if (f.italicUrl) {
        fontfaces.push(new FontFace(font.name, `url(${f.italicUrl})`, { weight: weights, style: 'italic' }))
        css += generateFontCssWeight({ name: font.name, url: f.italicUrl, weight: weights, style: 'italic' });
      }
    }

    // document.fonts.addEventListener('loadingdone', ffs => {
    // })
    // @ts-expect-error
    fontfaces.forEach(ff => { document.fonts.add(ff); })

    // Waiting until font is loaded
    Promise.all(fontfaces.map(ff => ff.load()))
      .then(all => {
        console.log(all)
        this.style = `font-synthesis: none; font-family: '${font.name}', Tofu;`
      })
      .catch(e => console.error(e, font, fontfaces))




    // appendStyleTag(css);

    // todo: italics
    // ) +(showItalics ? '; font-style: italic':'')">
  }
}


