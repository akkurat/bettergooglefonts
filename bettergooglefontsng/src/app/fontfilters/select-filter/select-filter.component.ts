import { AfterViewInit, Component, EventEmitter, Input, inject } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { NgComponentOutlet, NgClass } from '@angular/common';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { SelectionModel } from '@angular/cdk/collections';
import { AFilter } from 'src/app/fontoverview/fontfilter.service';

@Component({
  selector: 'app-select-filter',
  standalone: true,
  imports: [NgClass, FormsModule, ReactiveFormsModule, NgComponentOutlet, MatIconModule, OverlayModule],
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

  constructor(private overlayService: Overlay) { }
  onChange = new EventEmitter()
  sr = this.overlayService.scrollStrategies.reposition()

  callback = (value: any) => { }

  createPosStrat(origin) {
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

  writeValue(selection: string[] | null): void {
    if (selection) {
      this.model.setSelection(...selection)
    this.isOpen =false
    }
    else{
      this.model.clear()
    }
  }

  registerOnChange(fn: any): void {
    this.callback = fn
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
    this.model.changed.subscribe(v => { console.debug(v, this.model); this.callback(v.source.selected) })
    if (this.filter.items?.length == 1) {
      this.isOpen = false
      this.model.select(this.filter.items[0])
    }
  }

}
