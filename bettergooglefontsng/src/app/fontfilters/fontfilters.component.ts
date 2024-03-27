import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MongoSelector } from '../fontoverview/fontoverview.component';

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
  rendering: 'select' | 'range' | 'rangeflag'
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
  standalone: true,
  imports: [NgFor, MatFormFieldModule, MatIconModule, MatSliderModule, MatSelectModule, FormsModule, ReactiveFormsModule, MatOptionModule, SearchableFilterlistComponent, SelectFilterComponent, MatCardModule, RangeFilterComponent]
})


export class FontfiltersComponent implements OnInit {

  @Output()
  selectionChange = new EventEmitter<MongoSelector>
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
  }
  ngOnInit(): void {

    this.availableFilters.push({
      rendering: 'select',
      caption: 'Italic',
      title: 'italic',
      type: 'italic',
      items: ['italic']
    })

    this.classifier.getQuestions().subscribe(qs => {
      this.availableFilters.push(...qs.map<AFilter>(q => ({ ...q, caption: q.title, rendering: 'select', type: "classification" })))
      this.updateAvailableFilterNames()
    })
    this.availableFilters.push({
      title: 'wght',
      caption: 'Weight',
      type: "weight",
      rendering: 'rangeflag', // new type
      min_value: 1,
      max_value: 1000
    })
    this.http.get('assets/axesmeta.json').subscribe(
      a => {
        const axes: AFilter[] = (a as Axis[])
          .filter(a => a.tag.toLowerCase() === a.tag)
          .filter(a => ['slnt', 'wdth'].some(m => m === a.tag))
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

  mapFormEvent(values: Partial<{ [x: string]: any; }>): any {
    const out = { italic: {}, classification: {}, axis: {}, type: {}, weight: {} }
    for (const [k, v] of Object.entries(values)) {
      const filter = this.availableFilters.find(f => f.title === k)
      if (filter?.type) {
        out[filter.type][k] = v
      }
    }

    let selector = {}
    if (Object.keys(out.italic).length) {
      selector = { ...selector, ...getItalicSelector() }
    }
    if (Object.keys(out.classification).length) {
      selector = { ...selector, ...getClassificationSelector(out.classification) }
    }
    if (Object.keys(out.axis).length) {
      selector = { ...selector, ...getSelectorForAxes(out.axis) }
    }
    if (Object.keys(out.type).length) {
      selector = { ...selector, ...getSelectorForType(out.type) }
    }
    // known bug: axes filter will now overwrite themself..
    if (Object.keys(out.weight).length) {
      selector = { ...selector, ...getSelectorForWeight(out.weight['wght']) }
    }

    return selector

  }

}

function getClassificationSelector(toggles) {
  const selector = {}
  for (const [name, values] of Object.entries(toggles)) {
    selector['classification.' + name] = { $in: values }
  }
  return selector
}

function getSelectorForAxes(ranges: { [k in string]: { min: number, max: number } }) {
  const selector = {}
  // const variationInfos = []
  for (const [param, value] of Object.entries(ranges)) {
    selector['meta.axes'] = { $elemMatch: { tag: param } } // cutting off 'a_'
    if (value) {
      const { min, max } = value
      if (isFinite(min)) {
        selector['meta.axes']['$elemMatch']['min_value'] = { $lte: min }
        // variationInfos.push({ name: min })
      }
      if (isFinite(max)) {
        selector['meta.axes']['$elemMatch']['max_value'] = { $gte: max }
        // variationInfos.push({ name: max })
      }
    }
  }
  return selector
}

function getSelectorForType(toggles ) {
  const selector = {}
  for (const values of Object.values(toggles)) {
    selector['type'] = { $in: values }
  }
  return selector
}

function getSelectorForWeight(values: {min:number, max:number, flag:boolean}) {
  if (!values) {
    return {}
  }
  const rangeSelector = getSelectorForAxes({ 'wght': values })
  const selectors = [rangeSelector]
  if (values.flag) {
    const discreteWeights: MongoSelector[] = []
    if (isFinite(values.max)) {
      discreteWeights.push({ 'meta.fonts': { $elemMatch: { 'weight': { $gte: values.max } } } })
    }
    if (isFinite(values.min)) {
      discreteWeights.push({ 'meta.fonts': { $elemMatch: { 'weight': { $lte: values.min } } } })
    }
    if (discreteWeights.length > 0) {
      selectors.push({ $and: discreteWeights })
    }
  }
  return { $or: selectors }
}

function getItalicSelector() {
  return { 'meta.fonts': { $elemMatch: { style: 'italic' } } } // cutting off 'a_'
}
