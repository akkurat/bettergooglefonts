import { Platform } from '@angular/cdk/platform';
import { Injectable, inject } from '@angular/core';
import { FontByWeight, FontNameUrlMulti } from './FontNameUrl';

type FontFileType = 'ascii' | 'full';

@Injectable({
  providedIn: 'root'
})
export class FontResourceService {

  platform = inject(Platform)
  map = new Map<string, FontFace[]>()

  getFontfaces(font: FontNameUrlMulti, type: FontFileType = 'ascii'): FontFace[] {

    const key = type+font.name ;
    if (!this.map.has(key)) {
      const _fontfaces = this._getFontfaces(font, type)
      this.map.set(key, _fontfaces)
    }
    // @ts-ignore map is always set
    return this.map.get(key)

  }

  _getFontfaces(font: FontNameUrlMulti, type: FontFileType) {
    const weightAxis = font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    // new FontAPI FTW
    const fontfaces: FontFace[] = [];


    // Webkit seems to add quotes around
    // firefox does not
    const qt = this.platform.FIREFOX ? "'" : "";

    for (const f of font.fonts) {
      const supportedWeights = weightAxis ? `${weightAxis.min_value} ${weightAxis.max_value}` : `${f.weight}`;

      const fontFace = new FontFace(`${qt}${font.name}${qt}`, `url('${f.urls[type]}')`, { weight: supportedWeights, style: 'normal' });
      fontfaces.push(fontFace);
      if (f.italicUrls) {
        fontfaces.push(new FontFace(`${qt}${font.name}${qt}`, `url('${f.italicUrls[type]}')`, { weight: supportedWeights, style: 'italic' }));
      }
    }
    return fontfaces;

  }
}
