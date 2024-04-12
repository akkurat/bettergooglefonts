import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontNameUrlMulti } from 'src/app/FontNameUrl';

@Component({
  selector: 'app-preview-info-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './preview-info-bar.component.html',
})
export class PreviewInfoBarComponent {

  @Input()
  font?: FontNameUrlMulti

}
