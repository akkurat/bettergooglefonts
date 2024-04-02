import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { appendStyleTag, FontNameUrlMulti, generateFontCss, generateFontCssWeight } from '../FontNameUrl';
import { NgClass, NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [NgFor, RouterModule, NgClass],
})
export class FontpreviewComponent implements OnChanges {

  @Input()
  font: FontNameUrlMulti = { name: '', url: '', weights: [], italics: [], fonts: [] }
  @Input()
  waterfall = false
  @Input()
  showItalics = false
  @Input()
  specimenOnly = false;

  _wasInViewport=false
  inViewPort() {
    if(!this._wasInViewport)
    {
      this._wasInViewport = true
      this.initAll()
    }
  }

  weights?: { min_value: number; max_value: number; all: number[]; };
  /**
   * List of weights supported by this font
   * variable -> steps of 100 between min / max
   * 
   */
  vweights: number[] = [];
  hasItalics = false

  @Input()
  set customText(value: string | null) {
    if (value && value.length < 20) {
      const fs = 100 / value.length + 50
      this.customStyle = `font-size: ${fs}px; line-height: ${fs}px`
    }
    this._customText = value
  }
  get customText() {
    return this._customText
  }

  _customText: string | null = null
  customStyle = ''

  // Why is this on Changes and not on viewInit? probably only tried with OnInit when template is not yet rendered
  // but @ipnuts should already be available? hm....
  ngOnChanges(changes: SimpleChanges): void {

    // todo: function
    if (changes['font']) {
      this.initAll();
    }
  }

  private initAll() {
    const weightAxis = this.font.axes?.find(a => a.tag === 'wght');
    // let css = generateFontCssWeight({ ...this.font, weight: 400, style: 'normal' })
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it in an angular way
    let css = '';

    for (const f of this.font.fonts) {
      const weights = weightAxis ? `${weightAxis.min_value} ${weightAxis.max_value}` : f.weight;
      css += generateFontCssWeight({ name: this.font.name, url: f.url, weight: weights, style: 'normal' });
      if (f.italicUrl) {
        css += generateFontCssWeight({ name: this.font.name, url: f.italicUrl, weight: weights, style: 'italic' });
      }
    }
    appendStyleTag(css);

    this.hasItalics = this.font.italics.includes('italic');
    if (!weightAxis) {
      this.weights = {
        min_value: Math.min(...this.font.weights),
        max_value: Math.max(...this.font.weights),
        all: [...new Set(this.font.weights)]
      };
      this.vweights = this.weights.all;
    } else {
      // or only change upon initial, but this would be an assumption again
      this.weights = undefined;
      // due to the exception step with one and range functions it is easier this way....
      this.vweights = [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
        .filter(w => w >= weightAxis.min_value && w <= weightAxis.max_value);
    }
  }
  // TODO: maybe global service

}

