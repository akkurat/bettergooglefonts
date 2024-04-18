import { Component, ElementRef, QueryList, ViewChildren, inject } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { BehaviorSubject, Subject, combineLatest, firstValueFrom, flatMap, map, pipe, startWith, switchMap, take } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from './fontpreview/fontpreview.component';
import { NgFor, AsyncPipe, NgClass, JsonPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { PreviewInfoBarComponent } from './preview-info-bar/preview-info-bar.component';
import { FontfilterService } from './fontfilter.service';

export type inor = '$or' | '$and' | '$in'
export type MongoSelector = {
  [s: string]: MongoSelector | MongoSelector[] | string | number
}

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [NgClass, FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, JsonPipe,
    ScrollingModule, ReactiveFormsModule, MatIconModule, FormsModule, PreviewInfoBarComponent],
  providers: [FontfilterService]
})

export class FontoverviewComponent {

  @ViewChildren('gridElems')
  gridElems!: QueryList<ElementRef<HTMLElement>>

  defaultSpecimen = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

  $fonts: Subject<FontNameUrlMulti[]> = new BehaviorSubject([] as FontNameUrlMulti[])

  viewSettings = inject(FormBuilder).nonNullable
    .group({
      customText: '',
      showItalics: false,
      showWaterfall: true,
      specimenOnly: false,
    })

  transformedViewSettings?: typeof this.viewSettings.value


  filterService = inject(FontfilterService)
  fontService = inject(MongofontService)
  router = inject(Router)
  activatedRoute = inject(ActivatedRoute)

  constructor() {
    this.viewSettings.valueChanges
      .pipe(map(v => ({ ...v, customText: v.customText?.trimStart() || this.defaultSpecimen })))
      .subscribe(v => this.transformedViewSettings = v)

    firstValueFrom(this.activatedRoute.queryParams.pipe())
      .then(qp => {
        combineLatest([
          this.viewSettings.valueChanges,
          this.filterService.fg.valueChanges]
        ).subscribe(([view, filters]) => {
          const queryParams = {}
          if (view) { queryParams['view'] = JSON.stringify(view) }
          if (filters) { queryParams['filters'] = JSON.stringify(filters) }
          this.router.navigate(['browse'], { queryParams })
        })

        const initView = pJ(qp['view'])
        this.viewSettings.reset(initView)
        const initFilter = pJ(qp['filters'])
        this.filterService.setSelection(initFilter)
      })

    // this.fontService.getFonts({}).subscribe(this.$fonts)

    this.filterService.fg.valueChanges.pipe(
      switchMap(f => this.filterService.mapFormEvent(f)),
      switchMap(selector => this.fontService.getFonts(selector))
    ).subscribe(this.$fonts)


  }


}

function pJ(value: string) {
  if (value) {
    return JSON.parse(value)
  }
}
