import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { appendStyleTag, FontNameUrl, generateFontCss } from '../FontNameUrl';
import { NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fontpreview',
  templateUrl: './fontpreview.component.html',
  standalone: true,
  imports: [NgFor, RouterModule]
})
export class FontpreviewComponent implements OnChanges {

  @Input()
  font: FontNameUrl = { name: '', url: '', axes: [] }

  @Input('customText')
  set customText(value: string) {
    if (value.length < 20) {
      const fs = 100 / value.length + 50
      this.customStyle = `font-size: ${fs}px; line-height: ${fs}px`
    }

    this._customText = value
  }
  get customText() {
    return this._customText
  }

  _customText = ''

  customStyle = ''



  // Why is this on Changes and not on viewInit? probably only tried with OnInit when template is not yet rendered
  // but @ipnuts should already be available? hm....
  ngOnChanges(changes: SimpleChanges): void {
    const css = generateFontCss(this.font)
    // Fontface rule is only possible in css and not in embedded styles. a style tag is appended to the header
    // angular is doing the some for the scoped css outputs
    // having 2000 different fonts in one app is a very special case so it's ok that angular has no way of doing it
    // in an angular way
    appendStyleTag(css);
  }

}

