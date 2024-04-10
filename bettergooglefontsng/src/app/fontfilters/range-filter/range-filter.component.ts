import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { SearchableFilterlistComponent } from '../searchable-filterlist/searchable-filterlist.component';
import { SelectFilterComponent } from '../select-filter/select-filter.component';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-maybe-slider',
  standalone: true,
  template: `
            @if(isSet()) {
              <span class="" >{{caption}}</span>
              <button class="btn" (click)="reset()"><mat-icon> settings_backup_restore </mat-icon></button>
              <input  class="w-30 col-span-2" type="range" [min]="min" [max]="max" [(ngModel)]="val" (ngModelChange)="emitChange()">
              <input class="w-12" type="number" [(ngModel)]="val" (ngModelChange)="emitChange()">
            } @else {
              <button class="btn col-span-5" (click)="val=initValue;emitChange()">Add {{caption}}</button>
            }
  `,
  imports: [FormsModule, MatIconModule]
})
export class MaybeSliderComponent {

  @Input()
  min

  @Input()
  max

  @Input()
  initValue

  @Input()
  caption

  @Output()
  valChange = new EventEmitter()

  @Input()
  val = NaN
  isSet() {
    return !isNaN(this.val)
  }

  emitChange() {
    this.valChange.next(this.val)
  }
  reset() {
    this.val = NaN
    this.valChange.next(this.val)
  }

}

@Component({
  selector: 'app-range-filter',
  standalone: true,
  imports: [MaybeSliderComponent, NgFor, MatFormFieldModule, MatIconModule, MatSliderModule, MatSelectModule, FormsModule, ReactiveFormsModule, MatOptionModule, SearchableFilterlistComponent, SelectFilterComponent, MatCardModule, OverlayModule],
  templateUrl: './range-filter.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: RangeFilterComponent
    }
  ]
})

export class RangeFilterComponent implements ControlValueAccessor {
  @Input({ required: true })
  filter

  @Input()
  flag: string | undefined = undefined

  @Input()
  percentileLookup?: (count: number) => {start: number, label:string}[]


  get flagValue() {
    return this._flagValue
  }

  set flagValue(value) {
    this._flagValue = value
    this.emitChange()
  }

  get max() {
    return this._max
  }

  set max(value: number) {
    this._max = value
    if (this._max < this._min) {
      this._min = this._max
    }
    this.emitChange()
  }

  get min() {
    return this._min
  }

  set min(value: number) {
    this._min = value
    if (this._min > this._max) {
      this._max = this._min
    }
    this.emitChange()
  }

  writeValue(obj: any): void {
  }

  registerOnChange(fn: any): void {
    this._onChange = fn
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState?(isDisabled: boolean): void {
  }

  isNumber(val) {
    return !isNaN(val)
  }

  isOpen = true
  private _onChange = ({ }) => { }
  _min = NaN
  _max = NaN
  _flagValue = undefined

  emitChange() {
    console.debug(this._min, this._max)
    this._onChange({ min: this._min, max: this._max, flag: this._flagValue })
  }

  toggle() {
    this.isOpen = !this.isOpen
  }



}
