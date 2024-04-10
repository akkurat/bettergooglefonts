import { AfterViewInit, Component, ElementRef, HostListener, QueryList, SecurityContext, ViewChildren, inject } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { BehaviorSubject, Observable, ReplaySubject, Subject, auditTime, combineLatest, combineLatestAll, connect, connectable, debounceTime, first, map, merge, multicast, publishBehavior, publishReplay, share, shareReplay, startWith, tap, throttleTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from './fontpreview/fontpreview.component';
import { NgFor, AsyncPipe, NgClass, JsonPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { PreviewInfoBarComponent } from './preview-info-bar/preview-info-bar.component';

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

export class FontoverviewComponent implements AfterViewInit {

  @ViewChildren('gridElems')
  gridElems!: QueryList<ElementRef<HTMLElement>>

  defaultSpecimen = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

  $fonts: Subject<FontNameUrlMulti[]> = new BehaviorSubject([] as FontNameUrlMulti[])

  viewSettings = inject(FormBuilder).nonNullable.group({
    customText: '____',
    showItalics: false,
    showWaterfall: true,
    specimenOnly: false,
  })

  debouncedViewSettings = this.viewSettings.value

  visiblePreviews: HTMLElement[] = [];
  onWScroll = new Subject()

  selectedFilters = new BehaviorSubject('')

  constructor(private fontService: MongofontService, private router: Router, private activatedRoute: ActivatedRoute) {

    this.viewSettings.valueChanges
      .pipe(map(v => ({ ...v, customText: v.customText?.trimStart() || this.defaultSpecimen })))
      .subscribe(v => this.debouncedViewSettings = v)

    activatedRoute.data.subscribe(console.log)
    activatedRoute.queryParams.subscribe(
      qp => {
        console.log(qp, router.navigated)
        if (!router.navigated) {
          const { view, filters } = qp
          this.viewSettings.setValue(JSON.parse(view))
        }
      })

    this.fontService.getFonts({}).subscribe(this.$fonts)

    combineLatest([
      this.viewSettings.valueChanges,
      this.selectedFilters]
    ).subscribe(([values, filters]) => {
      this.router.navigate(['browse'],
        { queryParams: { view: JSON.stringify(values), filters: JSON.stringify(filters) } })
    })

  }

  trackFilterChange(selector: MongoSelector) {
    this.selectedFilters.next(JSON.stringify(selector))
    this.fontService.getFonts(selector).subscribe(this.$fonts)
  }

  trackBy(i, f) {
    return f.idx
  }

  ngAfterViewInit() {
    this.gridElems.changes.subscribe(ev => {
      this.onWScroll.next('')
    })
  }

  isInViewport(element: HTMLElement) {
    return this.visiblePreviews.includes(element)
  }

}
