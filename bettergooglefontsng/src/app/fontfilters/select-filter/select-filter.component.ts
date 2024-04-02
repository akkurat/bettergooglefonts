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


  constructor(private overlayService: Overlay) {


  }
  onChange = new EventEmitter()
  sr = this.overlayService.scrollStrategies.reposition()

  createPosStrat(origin) {
    console.debug(origin)
    return this.overlayService.position().flexibleConnectedTo(origin.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top'
        },
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top'
        },
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top'
        },
      ])

  }

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
