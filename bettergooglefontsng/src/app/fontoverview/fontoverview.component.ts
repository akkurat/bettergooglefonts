import { Component } from '@angular/core';
import { FontNameUrl } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { Observable, debounceTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from '../fontpreview/fontpreview.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, ScrollingModule, ReactiveFormsModule, MatIconModule]
})

export class FontoverviewComponent {
  customTextChanged($event: any) {
    throw new Error('Method not implemented.');
  }
  fonts: Observable<FontNameUrl[]>

  fc = new FormControl('')

  debouncedCustomText: Observable<string | null>;
  constructor(private fontService: MongofontService) {
    this.fonts = this.fontService.getFonts({})
    this.debouncedCustomText = this.fc.valueChanges.pipe(debounceTime(300))
  }

  trackFilterChange(selector: any) {
    this.fonts = this.fontService.getFonts(selector)
  }
  trackBy(i, f) {
    return f.idx
  }

}
