import { JsonPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { OverlayModule } from '@angular/cdk/overlay'

@Component({
  selector: 'app-searchable-filterlist',
  standalone: true,
  imports: [JsonPipe, FormsModule,
    ReactiveFormsModule, MatIconModule, OverlayModule, PortalModule],
  templateUrl: './searchable-filterlist.component.html',
  styleUrl: './searchable-filterlist.component.scss'
})
export class SearchableFilterlistComponent implements OnInit {
  toggle() {
    this.isOpen = !this.isOpen
  }

  selectedFilter = new FormControl<string>('')

  @Input()
  availableFilters: { name: string, caption: string, icon?: string }[] = []

  @Output()
  activate = new EventEmitter<string>()

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
