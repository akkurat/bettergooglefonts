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
  selectorFactory: (key: string, values: FilterSelection) => MongoSelector
};

export type FilterName = {
  name: string;
  caption: string;
};

type RangeSelection = Partial<{
  min: number;
  max: number;
  flag: boolean;
}>;

export type FilterSelection =
  string[] | RangeSelection | null | undefined

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

  // todo: properly register factories
  constructor() {
    this.allAvailableFilters.push({
      rendering: 'select',
      caption: 'Italic',
      title: 'italic',
      type: 'italic',
      items: ['italic'],
      selectorFactory: getItalicSelector
    })

    this.allAvailableFilters.push({
      title: 'wght',
      caption: 'Weight',
      type: "weight",
      rendering: 'rangeflag', // new type
      min_value: 1,
      max_value: 1000,
      selectorFactory: getSelectorForWeight
    })

    combineLatest([
      this.classifier.getQuestions(),
      this.http.get('assets/axesmeta.json')
    ])
      .subscribe(([qs, a]) => {

        this.allAvailableFilters.push(...qs.map<AFilter>(q => ({
          ...q,
          caption: q.title,
          rendering: 'select',
          type: "classification",
          selectorFactory: getClassificationSelector
        })))

        const axes: AFilter[] = (a as Axis[])
          .filter(a => a.tag.toLowerCase() === a.tag)
          .filter(a => ['slnt', 'wdth'].some(m => m === a.tag))
          .map(a => ({
            title: a.tag,
            caption: a.display_name,
            type: "axis",
            rendering: 'range',
            min_value: a.min_value,
            max_value: a.max_value,
            selectorFactory: getSelectorForAxes
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


  setSelection(filtersIn: FilterSelections = {}) {
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

      this.fg.controls = Object.entries(filterSelectionForSwap)
        .reduce((out, [k, v]) => { out[k] = this.formBuilder.control(v); return out }, {})
      // emit one event for all modifications
      this.fg.updateValueAndValidity()

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

  mapFormEvent(values: FilterSelections): Observable<MongoSelector> {
    return this.$ready.pipe(
      filter(v => v),
      map(() => this._mapFormEvent(values))
    )
  }

  _mapFormEvent(values: FilterSelections): MongoSelector {
    let selector = {}
    for (const [k, v] of Object.entries(values)) {
      const filter = this.allAvailableFilters.find(f => f.title === k)
      if (filter?.selectorFactory) {
        selector = { ...selector, ...filter.selectorFactory(k, v) }
      }
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

function getClassificationSelector(key, values) {
  return { ['classification.' + key]: { $in: values } }
}

function getSelectorForAxes(param: string, value: any | { min?: number, max?: number }): MongoSelector {
  const selector = {}
  // const variationInfos = []
  selector['meta.axes'] = { $elemMatch: { tag: param } }
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
  return selector
}

export function getSelectorForWeight(key: string, values: any): MongoSelector {

  if (!values) {
    return {}
  }
  if (key != 'wght') {
    throw new Error(`Weight selector was illegaly instantiated with wrong key: ${key}`)
  }
  const rangeSelector = getSelectorForAxes('wght', values)
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
