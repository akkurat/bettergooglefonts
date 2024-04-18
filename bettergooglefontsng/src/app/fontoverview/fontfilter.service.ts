import { Injectable, inject } from '@angular/core';
import { ClassificationService } from '../classification.service';
import { MongofontService } from '../mongofont.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MongoSelector } from '../fontoverview/fontoverview.component';
import { HttpClient } from '@angular/common/http';
import { Axis } from '../fontfilters/fontfilters.component';
import { BehaviorSubject, Observable, combineLatest, filter, first, last, lastValueFrom, map } from 'rxjs';
import { FormBuilder, FormControl } from '@angular/forms';

export type AFilter = {
  type: string
  rendering: 'select' | 'range' | 'rangeflag'
  title: string
  caption: string
  // TODO: multiple subclasses and factory
  items?: string[]
  min_value?: number
  max_value?: number
};

export type FilterName = {
  name: string;
  caption: string;
};

export type FilterSelection =
  string[] | {
    min?: number;
    max?: number;
    flag?: boolean;
  }

export type FilterSelections = {
  [k: string]: FilterSelection
}

@Injectable()
export class FontfilterService {

  $activeFilters = new BehaviorSubject<AFilter[]>([]);
  $unselectedFilterNames = new BehaviorSubject<FilterName[]>([]);


  // todo make private
  activeFilters: AFilter[] = []
  unselectedFilterNames: FilterName[] = [];

  classifier = inject(ClassificationService)
  fontService = inject(MongofontService)
  iconRegistry = inject(MatIconRegistry)
  sanitizer = inject(DomSanitizer)
  http = inject(HttpClient)

  $ready = new BehaviorSubject(false)

  private readonly formBuilder = inject(FormBuilder);
  private allAvailableFilters: AFilter[] = []

  fg = this.formBuilder.record<FilterSelection>({})

  constructor() {
    this.allAvailableFilters.push({
      rendering: 'select',
      caption: 'Italic',
      title: 'italic',
      type: 'italic',
      items: ['italic']
    })

    this.allAvailableFilters.push({
      title: 'wght',
      caption: 'Weight',
      type: "weight",
      rendering: 'rangeflag', // new type
      min_value: 1,
      max_value: 1000
    })

    combineLatest([
      this.classifier.getQuestions(),
      this.http.get('assets/axesmeta.json')
    ])
      .subscribe(([qs, a]) => {
        this.allAvailableFilters.push(...qs.map<AFilter>(q => ({ ...q, caption: q.title, rendering: 'select', type: "classification" })))

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
        this.allAvailableFilters.push(...axes)
        // copy?

        this.updateAvailableFilterNames();
        this.$ready.next(true)
        for (const filter of this.allAvailableFilters) {
          this.iconRegistry.addSvgIcon(filter.title, this.sanitizer.bypassSecurityTrustResourceUrl(`assets/prev/${filter.title}.svg`))
          filter.items?.forEach(item => {
            const qualifier = filter.title + '-' + item;
            this.iconRegistry.addSvgIcon(qualifier, this.sanitizer.bypassSecurityTrustResourceUrl(`assets/prev/${qualifier}.svg`))
          })
        }
      })
  }


  setSelection(filtersIn: FilterSelections) {
    this.$ready.pipe(first(v => v)).subscribe(() => {
      const filterSelectionForSwap: FilterSelections = {}
      const activeFiltersForSwap = new Array<AFilter>()
      for (const entry of Object.entries(filtersIn)) {
        const [name, values] = entry
        const filter = this.allAvailableFilters.find(v => v.title === name)
        if (filter && values) {
          if (filter.rendering === 'select') {
            const valid = (values as string[]).every(v => filter.items?.includes(v))
            if (!valid) {
              continue
            }
          }
          filterSelectionForSwap[name] = values
          activeFiltersForSwap.push(filter)
        }
      }

      this.activeFilters = activeFiltersForSwap
      for (const c of Object.keys(this.fg.controls)) {
        this.fg.removeControl(c, { emitEvent: false })
      }
      for (const [c, v] of Object.entries(filterSelectionForSwap)) {
        this.fg.addControl(c, this.formBuilder.control(v), { emitEvent: false })
      }

      this.updateAvailableFilterNames()
      // check filters in validity (vlaue of filter and selection)
      // todo set valid filters 
    })
  }

  activateFilter(name: string) {
    const filter = this.allAvailableFilters.find(v => v.title === name)
    if (filter) {
      this.activeFilters.push(filter)
      this.fg.addControl(name, new FormControl())
      this.updateAvailableFilterNames()
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

  mapFormEvent(values: Partial<{ [x: string]: FilterSelection; }>): Observable<MongoSelector> {
    return this.$ready.pipe(
      filter(v => v),
      map(() => this._mapFormEvent(values))
    )
  }

  _mapFormEvent(values: Partial<{ [x: string]: any; }>): MongoSelector {
    const out = { italic: {}, classification: {}, axis: {}, type: {}, weight: {} }
    for (const [k, v] of Object.entries(values)) {
      const filter = this.allAvailableFilters.find(f => f.title === k)
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

  /**
   * Publish
   */
  private updateAvailableFilterNames() {
    this.unselectedFilterNames = this.allAvailableFilters
      .filter(av => !this.activeFilters.some(ac => ac.title === av.title))
      .map(t => ({ name: t.title, caption: t.caption }));
    this.$unselectedFilterNames.next(this.unselectedFilterNames)
    this.$activeFilters.next(this.activeFilters)
  }

}

function getClassificationSelector(toggles) {
  const selector = {}
  for (const [name, values] of Object.entries(toggles)) {
    selector['classification.' + name] = { $in: values }
  }
  return selector
}

function getSelectorForAxes(ranges: { [k in string]: { min?: number, max?: number } }) {
  const selector = {}
  // const variationInfos = []
  for (const [param, value] of Object.entries(ranges)) {
    selector['meta.axes'] = { $elemMatch: { tag: param } } // cutting off 'a_'
    if (value) {
      const { min, max } = value
      if (min && isFinite(min)) {
        selector['meta.axes']['$elemMatch']['min_value'] = { $lte: min }
        // variationInfos.push({ name: min })
      }
      if (max && isFinite(max)) {
        selector['meta.axes']['$elemMatch']['max_value'] = { $gte: max }
        // variationInfos.push({ name: max })
      }
    }
  }
  return selector
}

function getSelectorForType(toggles) {
  const selector = {}
  for (const values of Object.values(toggles)) {
    selector['type'] = { $in: values }
  }
  return selector
}

export function getSelectorForWeight(values: { min?: number, max?: number, flag: boolean }) {
  if (!values) {
    return {}
  }
  const rangeSelector = getSelectorForAxes({ 'wght': values })
  const selectors = [rangeSelector]
  if (values.flag) {
    const discreteWeights: MongoSelector[] = []
    if (values.max && isFinite(values.max)) {
      discreteWeights.push({ 'meta.fonts': { $elemMatch: { 'weight': { $gte: values.max } } } })
    }
    if (values.min && isFinite(values.min)) {
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
