import { JsonPipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay'
import { Dialog, DialogModule } from '@angular/cdk/dialog';

@Component({
  selector: 'app-searchable-filterlist',
  standalone: true,
  imports: [JsonPipe, FormsModule, MatIconModule, DialogModule],
  templateUrl: './searchable-filterlist.component.html',
  providers: [{ provide: OverlayContainer, useClass: FullscreenOverlayContainer }]

})
export class SearchableFilterlistComponent {

  @Input()
  availableFilters: { name: string, caption: string, icon?: string }[] | null = null 

  @Output()
  activate = new EventEmitter<string>()

  @ViewChild('trigger', { read: ElementRef })

  protected isOpen = false

  private readonly dialogService = inject(Dialog)

  openDialag(tref) {
    this.dialogService.open(tref, {
      maxHeight: '98vh',
      panelClass: 'overflow-y-scroll',
    })
  }

  select(value) {
    this.activate.next(value)
    this.dialogService.closeAll()
  }

}
