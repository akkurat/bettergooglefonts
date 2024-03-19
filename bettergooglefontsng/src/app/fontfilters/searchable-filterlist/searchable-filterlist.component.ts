import { JsonPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { OverlayModule } from '@angular/cdk/overlay'
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-searchable-filterlist',
  standalone: true,
  imports: [JsonPipe, MatAutocompleteModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, MatInputModule, MatIconModule, MatMenuModule, OverlayModule, MatCardModule, MatButtonModule],
  templateUrl: './searchable-filterlist.component.html',
  styleUrl: './searchable-filterlist.component.scss'
})
export class SearchableFilterlistComponent implements OnInit {

  selectedFilter = new FormControl<string>('')

  @Input()
  availableFilters: { name: string, caption: string, icon?: string }[] = []

  @Output()
  activate = new EventEmitter<string>()

  @ViewChild('ovRef')
  ovRef

  isOpen = false

  ngOnInit(): void {
    this.selectedFilter.valueChanges

      .subscribe(value => {
        if (value) {
          this.activate.next(value)
          this.selectedFilter.setValue(null)
        }
      })
  }

  select(value) {
    this.activate.next(value)
    this.isOpen = false
  }

}
