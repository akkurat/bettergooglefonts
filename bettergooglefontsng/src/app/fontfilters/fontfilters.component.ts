import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ClassificationService } from '../classification.service';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgFor } from '@angular/common';
import { SearchableFilterlistComponent } from "./searchable-filterlist/searchable-filterlist.component";
import { SelectFilterComponent } from "./select-filter/select-filter.component";
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card'
import { DomSanitizer } from '@angular/platform-browser';
import { RangeFilterComponent } from "./range-filter/range-filter.component";

type Axis = {
  tag: string
  display_name: string;
  min_value: number
  max_value: number
}

export type FilterSelection = {
  classification
  axis
  type
}

export type AFilter = {
  type: string
  rendering: 'select' | 'range'
  title: string
  caption: string
  // TODO: two subclasses and factory
  items?: string[]
  min_value?: number
  max_value?: number
};


@Component({
  selector: 'app-fontfilters',
  templateUrl: './fontfilters.component.html',
  styleUrls: ['./fontfilters.component.scss'],
  standalone: true,
  imports: [NgFor, MatFormFieldModule, MatIconModule, MatSliderModule, MatSelectModule, FormsModule, ReactiveFormsModule, MatOptionModule, SearchableFilterlistComponent, SelectFilterComponent, MatCardModule, RangeFilterComponent]
})


export class FontfiltersComponent implements OnInit {

  @Output()
  selectionChange = new EventEmitter<FilterSelection>
  availableFilters: AFilter[] = []
  availableFilterNames: { name: string, caption: string }[] = [];
  // maybe rather a function and just a string for the selection
  activeFilters: AFilter[] = []
  // fg!: FormGroup<{ [x: string]: FormControl<any> | FormGroup<any>; }>;
  fg: FormGroup = new FormGroup({})

  constructor(
    private http: HttpClient,
    private classifier: ClassificationService,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.availableFilters.push({
      type: "type",
      title: 'type',
      caption: "Type",
      rendering: 'select',
      items: ["SANS_SERIF", "SERIF", "DISPLAY", "MONOSPACE", "HANDWRITING", "SLAB_SERIF"]
    })
  }
  ngOnInit(): void {

    this.classifier.getQuestions().subscribe( qs => {
      this.availableFilters.push( ...qs.map<AFilter>(q => ({ ...q, caption: q.title, rendering: 'select', type: "classification" })) )
      this.updateAvailableFilterNames()
    })
    this.http.get('assets/axesmeta.json').subscribe(
      a => {
        const axes: AFilter[] = (a as Axis[])
          .filter(a => a.tag.toLowerCase() === a.tag)
          .map(a => ({

            title: a.tag,
            caption: a.display_name,
            type: "axis",
            rendering: 'range',
            min_value: a.min_value,
            max_value: a.max_value
          }))



        this.availableFilters.push(...axes)

        this.updateAvailableFilterNames();
        for (const filter of this.availableFilters) {
          this.iconRegistry.addSvgIcon(filter.title, this.sanitizer.bypassSecurityTrustResourceUrl(`assets/prev/${filter.title}.svg`))
          filter.items?.forEach(item => {
            const qualifier = filter.title + '-' + item;
            this.iconRegistry.addSvgIcon(qualifier, this.sanitizer.bypassSecurityTrustResourceUrl(`assets/prev/${qualifier}.svg`))
          })
        }
        // better on demand
        this.fg.valueChanges.subscribe(v => this.selectionChange.emit(this.mapFormEvent(v)))
      }
    )
  }

  private updateAvailableFilterNames() {
    this.availableFilterNames = this.availableFilters
      .filter(av => !this.activeFilters.some(ac => ac.title === av.title))
      .map(t => ({ name: t.title, caption: t.caption }));
  }

  activateFilter(name: string) {
    const filter = this.availableFilters.find(v => v.title === name)
    if (filter) {
      const control = new FormControl()
      if (control) {
        this.fg.addControl(filter.title, control, { emitEvent: true })
        this.activeFilters.push(filter)
        this.updateAvailableFilterNames()
      }
    }
  }

  removeFilter(name: string) {
    const idx = this.activeFilters.findIndex(v => v.title === name)
    if (idx > -1) {
      this.activeFilters.splice(idx, 1)
      this.fg.removeControl(name)
      this.updateAvailableFilterNames()
    }
  }

  mapFormEvent(values: Partial<{ [x: string]: any; }>): FilterSelection {
    const out = { classification: {}, axis: {}, type: {} }
    for (const [k, v] of Object.entries(values)) {
      const filter = this.availableFilters.find(f => f.title === k)
      if(filter?.type){
        out[filter.type][k] = v
      }
    }
    return out
  }

}
