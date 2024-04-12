import { AfterViewInit, Component, ElementRef, HostListener, QueryList, SecurityContext, ViewChildren, inject } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { BehaviorSubject, Observable, ReplaySubject, Subject, auditTime, combineLatest, combineLatestAll, connect, connectable, debounceTime, first, map, merge, multicast, publishBehavior, publishReplay, share, shareReplay, startWith, tap, throttleTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from './fontpreview/fontpreview.component';
import { NgFor, AsyncPipe, NgClass, JsonPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { PreviewInfoBarComponent } from './preview-info-bar/preview-info-bar.component';
import { FontfilterService } from '../fontfilter.service';

export type inor = '$or' | '$and' | '$in'
export type MongoSelector = {
  [s in string]: MongoSelector | [MongoSelector] | string | number
}

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [NgClass, FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, JsonPipe,
    ScrollingModule, ReactiveFormsModule, MatIconModule, FormsModule, PreviewInfoBarComponent]
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

  selectedFilters = new BehaviorSubject('')
  filterService = inject(FontfilterService)

  constructor(private fontService: MongofontService, private router: Router, private activatedRoute: ActivatedRoute) {

    this.viewSettings.valueChanges
      .pipe(map(v => ({ ...v, customText: v.customText?.trimStart() || this.defaultSpecimen })))
      .subscribe(v => this.transformedViewSettings = v)


    combineLatest([
      this.viewSettings.valueChanges,
      this.selectedFilters]
    ).subscribe(([values, filters]) => {
      this.router.navigate(['browse'],
        { queryParams: { view: JSON.stringify(values), filters: JSON.stringify(filters) } })
    })
    this.viewSettings.reset()

    activatedRoute.data.subscribe(console.debug)
    activatedRoute.queryParams.subscribe(
      qp => {
        console.debug(qp, router.navigated)
        if (!router.navigated) {
          const { view, filters } = qp
          this.viewSettings.setValue(JSON.parse(view))
        }
      })

    this.fontService.getFonts({}).subscribe(this.$fonts)

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackFilterChange(filters: any) {
    this.selectedFilters.next(JSON.stringify(filters))
    const selector = this.filterService.mapFormEvent(filters)
    this.fontService.getFonts(selector).subscribe(this.$fonts)
  }

  trackBy(i, f) {
    console.log(i,f)
    return f.idx
  }

}
