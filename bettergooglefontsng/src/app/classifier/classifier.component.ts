import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { ClassificationService, FontQuestion, fontParamsSans } from '../classification.service';
import { appendStyleTag, generateFontCss } from '../FontNameUrl';
import { FontInfo, MongofontService, getTtfUrlForFirstFont, getUrlForFirstFont } from '../mongofont.service';
import { NgModel, FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
  selector: 'app-classifier',
  templateUrl: './classifier.component.html',
  styleUrls: ['./classifier.component.scss'],
  standalone: true,
  imports: [MatSlideToggleModule, FormsModule, NgFor, MatRadioModule, MatButtonModule, MatToolbarModule, MatSnackBarModule]
})
export class ClassifierComponent implements OnInit {
  questions: FontQuestion[] = [];
  font: FontInfo | undefined;
  fontPrev: FontInfo | undefined;
  fontNext: FontInfo | undefined;
  fontNameByRouting = ''
  answers: any
  autoNext = true
  constructor(private route: ActivatedRoute, private fontService: MongofontService, private router: Router, private classifierService: ClassificationService,
  ) {
  }
  ngOnInit(): void {
    console.log(this.route)
    this.route.params.subscribe(p => {
      this.questions = this.classifierService.getQuestions()
      this.fontNameByRouting = p['name']
      // so far probably a memoryleak -> reuse the same subject at service... but how?
      this.fontService.getFontByName(p['name']).subscribe(f => {
        this.font = f
        const url = getTtfUrlForFirstFont(f)
        const css = generateFontCss({ name: f.meta.name, url })
        appendStyleTag(css)
        this.fontService.getFontBySkip(
          { 'meta.category': 'SANS_SERIF', idx: { $lt: f.idx } }, { sort: { idx: -1 } }).subscribe(f => this.fontPrev = f)
        this.fontService.getFontBySkip(
          { 'meta.category': 'SANS_SERIF', idx: { $gt: f.idx } }).subscribe(f => this.fontNext = f)
      },
        err => console.log("sad error noises", err)
      )
      this.answers = this.classifierService.answersFor(p['name'])
    })
  }

  isSelected(title: string, option: string): boolean {
    return this.answers[title] === option
  }

  saveAnswer(ev: MatRadioChange, option: string) {
    this.classifierService.saveAnswer(this.fontNameByRouting, option, ev.value)
    if (this.autoNext) {
      this.navigateToNextFont()
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // TODO: this should be no absolute path
    if (event.key === 'k') {
      this.navigateToPreviousFont();
    } else if (event.key === 'j') {
      this.navigateToNextFont();
    }
  }

  private navigateToPreviousFont() {
    if (this.fontPrev)
      this.router.navigateByUrl('/classify/' + encodeURIComponent(this.fontPrev?.meta.name));
  }

  private _snackBar = inject(MatSnackBar)
  public importToLocalStorage(ev: any) {
    this.classifierService.importIntoLocalStorage()
      .subscribe(a => this._snackBar.open(`imported ${a} fonts`))
  }

  private navigateToNextFont() {
    if (this.fontNext) {
      this.router.navigateByUrl('/classify/' + encodeURIComponent(this.fontNext?.meta.name));
    }
  }
  encode(part: string | undefined) {
    return part && encodeURIComponent(part)
  }
}
