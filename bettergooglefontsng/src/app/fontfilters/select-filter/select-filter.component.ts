import { AfterViewInit, Component, EventEmitter, Input, inject } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { MatSelectModule } from '@angular/material/select';
import { AFilter } from '../fontfilters.component';
import { NgComponentOutlet, NgClass } from '@angular/common';
import { Overlay, OverlayModule, ScrollStrategy } from '@angular/cdk/overlay';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-select-filter',
  standalone: true,
  imports: [NgClass, MatSelectModule, FormsModule, ReactiveFormsModule, NgComponentOutlet, MatIconModule, OverlayModule],
  templateUrl: './select-filter.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: SelectFilterComponent
    }
  ]
})
export class SelectFilterComponent implements AfterViewInit, ControlValueAccessor {


  onChange = new EventEmitter()
  sr = inject(Overlay).scrollStrategies.reposition()

  writeValue(selection: string[]): void {

  }

  registerOnChange(fn: any): void {
    this.onChange.subscribe(fn)
  }

  registerOnTouched(fn: any): void {
  }
  setDisabledState?(isDisabled: boolean): void {
  }

  @Input()
  filter!: AFilter;


  isOpen = true
  model = new SelectionModel(true, ([] as string[]))

  toggle() {
    this.isOpen = !this.isOpen
  }




  ngAfterViewInit() {
    this.model.changed.subscribe(v => { console.log(v, this.model); this.onChange.next(v.source.selected) })
    if (this.filter.items?.length == 1) {
      this.isOpen = false
      this.model.select(this.filter.items[0])
    }
  }

}
