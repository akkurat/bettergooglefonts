import { Component, EventEmitter, Inject, Output, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormRecord, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { SearchableFilterlistComponent } from "./searchable-filterlist/searchable-filterlist.component";
import { SelectFilterComponent } from "./select-filter/select-filter.component";
import { MatIconModule } from '@angular/material/icon';
import { RangeFilterComponent } from "./range-filter/range-filter.component";
import { BoxplotComponent } from '../boxplot/boxplot.component';
import { AFilter, FilterName, FilterSelection, FilterSelections, FontfilterService } from '../fontoverview/fontfilter.service'
import { Observable } from 'rxjs';

export type Axis = {
  tag: string
  display_name: string;
  min_value: number
  max_value: number
}

export type FilterTypes = {
  classification
  axis
  type
}

@Component({
  selector: 'app-fontfilters',
  templateUrl: './fontfilters.component.html',
  standalone: true,
  imports: [BoxplotComponent, JsonPipe, AsyncPipe, NgFor,
    MatIconModule, FormsModule, ReactiveFormsModule,
    SearchableFilterlistComponent, SelectFilterComponent, RangeFilterComponent]
})

export class FontfiltersComponent {

  // maybe rather a function and just a string for the selection
  // fg!: FormGroup<{ [x: string]: FormControl<any> | FormGroup<any>; }>;

  $activeFilters: Observable<AFilter[]>;
  $unselectedFilterNames: Observable<FilterName[]>;
  fg: FormRecord<FormControl<FilterSelection | null>>;


  constructor(private filterService: FontfilterService) {

    this.fg = filterService.fg

    this.$unselectedFilterNames = this.filterService.$unselectedFilterNames
    this.$activeFilters = this.filterService.$activeFilters
  }

  activateFilter(name: string) {
    this.filterService.activateFilter(name)
    // TODO: use subscription on service for feature "reading filters from URL"
  }

  removeFilter(name: string) {
    // TODO: use subscription on service for feature "reading filters from URL"
    this.filterService.removeFilter(name)

  }

}

