import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { appendStyleTag, FontNameUrl, generateFontCss } from '../FontNameUrl';
import { NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [NgFor, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FontpreviewComponent implements OnChanges {

  @Input()
  font: FontNameUrl = { name: '', url: '', weights: [], italics: [] }
  italics = false
  weights?: { min_value: number; max_value: number; all: number[]; };

  @Input('customText')
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
      if(this.font.name === 'Economica') {
        console.log('eco', changes)
      }

    // this.weights = font.weights
    if (changes['font']) {
      const css = generateFontCss(this.font)
      // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
      // angular is doing the some for the scoped css outputs
      // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it
      // in an angular way
      appendStyleTag(css);
      this.italics = this.font.italics.includes('italic')
      const hasWeightAxis = this.font.axes?.some(a => a.tag === 'wght')
      if (!hasWeightAxis) {
        this.weights = {
          min_value: Math.min(...this.font.weights),
          max_value: Math.max(...this.font.weights),
          all: [...new Set(this.font.weights)]
        }
      } else {
        // or only change upon initial, but this would be an assumption again
        this.weights = undefined
      }
    }
  }

}

