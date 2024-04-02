import { Component, Input } from '@angular/core';
import { FontByWeightRange } from '../mongofont.service';

@Component({
  selector: 'app-boxplot',
  standalone: true,
  imports: [],
  templateUrl: './boxplot.component.svg'
})
export class BoxplotComponent {

  @Input()
  values: FontByWeightRange[] = []

  normAndTransform() {
    let maxY = Number.MIN_VALUE, minY = Number.MAX_VALUE,
      maxX = Number.MIN_VALUE, minX = Number.MAX_VALUE

    for (const val of this.values) {

      maxY = Math.max(maxY, val.count, val.discreteCnt, val.rangeCnt)
      minY = Math.min(minY, val.count, val.discreteCnt, val.rangeCnt)

      if (val.range[0] < minX) {
        minX = val.range[0]
      }

      if (val.range[1] > maxX) {
        maxX = val.range[1]
      }

    }

    const deltaY = maxY - minY
    const scaleY = val => (val - minY) / deltaY
    const deltaX = maxX - minX
    const scaleX = val => (val - minX) / deltaX

    const out = this.values.map(({ range: [low, high], discreteCnt, count, rangeCnt }) => (
      { low: scaleX(low), high: scaleX(high), discreteCnt: scaleY(discreteCnt), count: scaleY(count), rangeCnt: scaleY(rangeCnt) }
    ))
    return out






  }
}
