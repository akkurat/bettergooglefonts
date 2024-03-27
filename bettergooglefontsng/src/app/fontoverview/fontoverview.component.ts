import { Component } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { Observable, debounceTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from '../fontpreview/fontpreview.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export type inor = '$or' | '$and' | '$in'
export type MongoSelector = {
  [s in string]: MongoSelector | [MongoSelector] | string | number
}

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, ScrollingModule, ReactiveFormsModule, MatIconModule, FormsModule]
})

export class FontoverviewComponent {
  fonts: Observable<FontNameUrlMulti[]>

  fc = new FormControl('')

  debouncedCustomText: Observable<string | null>;
  showItalics = false;
  showWaterfall = true;
  specimenOnly = false;
  constructor(private fontService: MongofontService) {
    this.fonts = this.fontService.getFonts({})
    this.debouncedCustomText = this.fc.valueChanges.pipe(debounceTime(300))
  }

  trackFilterChange(selector: MongoSelector) {
    this.fonts = this.fontService.getFonts(selector)
  }
  trackBy(i, f) {
    return f.idx
  }

}
