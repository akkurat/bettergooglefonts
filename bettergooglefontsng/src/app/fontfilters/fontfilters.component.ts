import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe, JsonPipe, NgFor } from '@angular/common';
import { SearchableFilterlistComponent } from "./searchable-filterlist/searchable-filterlist.component";
import { SelectFilterComponent } from "./select-filter/select-filter.component";
import { MatIconModule } from '@angular/material/icon';
import { RangeFilterComponent } from "./range-filter/range-filter.component";
import { MongoSelector } from '../fontoverview/fontoverview.component';
import { BoxplotComponent } from '../boxplot/boxplot.component';
import { AFilter, FilterName, FontfilterService } from '../fontfilter.service';
import { Observable, Subject } from 'rxjs';

export type Axis = {
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

@Component({
  selector: 'app-fontfilters',
  templateUrl: './fontfilters.component.html',
  standalone: true,
  imports: [BoxplotComponent, JsonPipe, AsyncPipe, NgFor,
    MatIconModule, FormsModule, ReactiveFormsModule,
    SearchableFilterlistComponent, SelectFilterComponent, RangeFilterComponent]
})

export class FontfiltersComponent {

  @Output()
  selectionChange = new EventEmitter<MongoSelector>
  // maybe rather a function and just a string for the selection
  // fg!: FormGroup<{ [x: string]: FormControl<any> | FormGroup<any>; }>;
  fg: FormGroup = new FormGroup({})

  $activeFilters: Observable<AFilter[]>;
  $unselectedFilterNames: Observable<FilterName[]>;

  constructor(private filterService: FontfilterService) {
    this.fg.valueChanges.subscribe(v => this.selectionChange.emit(v))
    this.$unselectedFilterNames = this.filterService.$unselectedFilterNames
    this.$activeFilters = this.filterService.$activeFilters
    this.$activeFilters.subscribe(console.log)
  }

  activateFilter(name: string) {
    this.filterService.activateFilter(name)
    const control = new FormControl()
    // TODO: use subscription on service for feature "reading filters from URL"
    this.fg.addControl(name, control, { emitEvent: true })
  }

  removeFilter(name: string) {
    // TODO: use subscription on service for feature "reading filters from URL"
    this.filterService.removeFilter(name)

    this.fg.removeControl(name)
  }

}

