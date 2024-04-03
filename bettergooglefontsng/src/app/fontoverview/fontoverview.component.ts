import { AfterViewInit, Component, ElementRef, HostListener, QueryList, SecurityContext, ViewChildren, inject } from '@angular/core';
import { FontNameUrlMulti } from '../FontNameUrl';
import { MongofontService } from '../mongofont.service';
import { BehaviorSubject, Observable, Subject, auditTime, debounceTime, first, map, shareReplay, startWith, tap, throttleTime } from 'rxjs';
import { FontfiltersComponent } from '../fontfilters/fontfilters.component';
import { FontpreviewComponent } from '../fontpreview/fontpreview.component';
import { NgFor, AsyncPipe, NgClass } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Timer } from '../helpers';
import { DomSanitizer } from '@angular/platform-browser';

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

  specimen = inject(DomSanitizer).sanitize(SecurityContext.HTML, '&excl;&quot;&num;&dollar;&percnt;&amp;&bsol;&apos;&lpar;&rpar;&ast;&plus;&comma;&#x2D;&period;&sol;&#x30;&#x31;&#x32;&#x33;&#x34;&#x35;&#x36;&#x37;&#x38;&#x39;&colon;&semi;&lt;&equals;&gt;&quest;&commat;&#x41;&#x42;&#x43;&#x44;&#x45;&#x46;&#x47;&#x48;&#x49;&#x4A;&#x4B;&#x4C;&#x4D;&#x4E;&#x4F;&#x50;&#x51;&#x52;&#x53;&#x54;&#x55;&#x56;&#x57;&#x58;&#x59;&#x5A;&lsqb;&bsol;&bsol;&rsqb;&Hat;&lowbar;&grave;&#x61;&#x62;&#x63;&#x64;&#x65;&#x66;&#x67;&#x68;&#x69;&#x6A;&#x6B;&#x6C;&#x6D;&#x6E;&#x6F;&#x70;&#x71;&#x72;&#x73;&#x74;&#x75;&#x76;&#x77;&#x78;&#x79;&#x7A;&lcub;&vert;&rcub;&#x7E;');

  ngAfterViewInit() {

    this.gridElems.changes.subscribe(ev => {
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

  debouncedCustomText = ''
  showItalics = false;
  showWaterfall = true;
  specimenOnly = false;
  visiblePreviews: HTMLElement[] = [];
  constructor(private fontService: MongofontService, private el: ElementRef) {
    this.fonts = this.fontService.getFonts({})
    this.fc.valueChanges.pipe(
      auditTime(200),
      startWith(''),
      shareReplay(1),
      map(v => v ? v : this.specimen || ''))
      .subscribe(v => this.debouncedCustomText = v
      )


    this.onWScroll.pipe(auditTime(200)).subscribe(ev => {

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
