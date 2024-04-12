import { Platform } from '@angular/cdk/platform';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FontResourceService {

  platform = inject(Platform)
  map = new Map<any,FontFace[]>()

  getFontfaces(font: any): FontFace[] {

    if(!this.map.has(font.name)) {
      const _fontfaces = this._getFontfaces(font)
      this.map.set(font.name, _fontfaces)
    }
    // @ts-ignore map is always set
    return this.map.get(font.name)

  }

  _getFontfaces(font: any) {
    const weightAxis = font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    // new FontAPI FTW
    let fontfaces: FontFace[] = [];


    // Webkit seems to add quotes around
    // firefox does not
    const qt = this.platform.FIREFOX ? "'" : "";

    for (const f of font.fonts) {
      const weights = weightAxis ? `${weightAxis.min_value} ${weightAxis.max_value}` : f.weight;

      const fontFace = new FontFace(`${qt}${font.name}${qt}`, `url('${f.url}')`, { weight: weights, style: 'normal' });
      fontfaces.push(fontFace);
      if (f.italicUrl) {
        fontfaces.push(new FontFace(`${qt}${font.name}${qt}`, `url('${f.italicUrl}')`, { weight: weights, style: 'italic' }));
      }
    }
    return fontfaces;
  }
}
