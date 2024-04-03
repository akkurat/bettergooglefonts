import { AfterViewInit, Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { BehaviorSubject, Observable, Subject, debounceTime, first, map, shareReplay, startWith, tap, throttleTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from '../fontpreview/fontpreview.component';
import { NgFor, AsyncPipe, NgClass } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Timer } from '../helpers';

export type inor = '$or' | '$and' | '$in'
export type MongoSelector = {
  [s in string]: MongoSelector | [MongoSelector] | string | number
}

@Component({
  selector: 'app-fontoverview',
  templateUrl: './fontoverview.component.html',
  standalone: true,
  imports: [NgClass, FontfiltersComponent, NgFor, FontpreviewComponent, AsyncPipe, ScrollingModule, ReactiveFormsModule, MatIconModule, FormsModule]
})

export class FontoverviewComponent implements AfterViewInit {

  ngAfterViewInit() {

    this.gridElems.changes.subscribe(ev => {
      console.log(ev)
      this.onWScroll.next('')
    })
  }

  isInViewport(element: HTMLElement) {
    return this.visiblePreviews.includes(element)
  }

  @ViewChildren('gridElems')
  gridElems!: QueryList<ElementRef<HTMLElement>>

  fonts: Observable<FontNameUrlMulti[]>
  fc = new FormControl('')

  debouncedCustomText: Observable<string>;
  showItalics = false;
  showWaterfall = true;
  specimenOnly = false;
  visiblePreviews: HTMLElement[] = [];
  constructor(private fontService: MongofontService, private el: ElementRef) {
    this.fonts = this.fontService.getFonts({})
    this.debouncedCustomText = this.fc.valueChanges.pipe(
      throttleTime(200),
      startWith(''),
      shareReplay(1),
      map(v => v ? v : 'abcdg'))


    this.onWScroll.pipe(throttleTime(500)).subscribe(ev => {

      const inViewport = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        const html = document.documentElement;
        return (
          rect.top + 300 >= 0 &&
          rect.left + 300 >= 0 &&
          rect.bottom - 300 <= (window.innerHeight || html.clientHeight) &&
          rect.right - 300 <= (window.innerWidth || html.clientWidth)
        )
      }

      const vis: HTMLElement[] = []

      const timer = new Timer()
      for (const elem of this.gridElems) {
        if (inViewport(elem.nativeElement)) {
          vis.push(elem.nativeElement)
        }
      }
      // obviously enough performant for now
      // ways to improve: estimate position of current element linearly
      // start a few elements before... stop after first one is false (by the assumption of continuity)

      console.log(vis, `vieport iterationg takes ${timer.measure()}ms`)

      this.visiblePreviews = vis
    })



    // if(visible) {
    //   console.debug(this.font.name)

    // }

  }

  trackFilterChange(selector: MongoSelector) {
    this.fonts = this.fontService.getFonts(selector)
  }
  trackBy(i, f) {
    return f.idx
  }


  onWScroll = new Subject()

  @HostListener('window:scroll', ['$event'])
  _onWScroll($event) {
    // console.debug($event)
    // idea for a more effienct boundary on where the viewport ends

    this.onWScroll.next($event)

  }





}
