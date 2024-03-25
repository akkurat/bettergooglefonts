import { Component, OnInit } from '@angular/core';
import { FontNameUrl } from '../FontNameUrl';
import { FontFilter, MongofontService } from '../mongofont.service';
import { Observable } from 'rxjs';
import { FilterSelection, FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from '../fontpreview/fontpreview.component';
import { NgFor, AsyncPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, ScrollingModule, FormsModule, MatIconModule]
})

export class FontoverviewComponent {
  customTextChanged(ev: any) {
    console.log(ev)
  }

  fonts: Observable<FontNameUrl[]>
  customText = '';
  constructor(private fontService: MongofontService) {
    this.fonts = this.fontService.getFonts()
  }

  trackFilterChange(event: FilterSelection) {
    this.fonts = this.fontService.getFonts(event)
  }
}
