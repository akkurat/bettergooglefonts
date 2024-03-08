import { Component, HostListener, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioButton, MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClassificationService, FontQuestion } from '../classification.service';
import { appendStyleTag, generateFontCss } from '../FontNameUrl';
import { FontInfo, MongofontService, getTtfUrlForFirstFont } from '../mongofont.service';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { NgFor } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { combineLatestWith } from 'rxjs';



@Component({
  selector: 'app-classifier',
  templateUrl: './classifier.component.html',
  styleUrls: ['./classifier.component.scss'],
  standalone: true,
  imports: [MatSlideToggleModule, FormsModule, NgFor, MatRadioModule, MatFormFieldModule, MatButtonModule, MatToolbarModule, MatSnackBarModule, RouterModule, ReactiveFormsModule, MatTooltipModule]
})
export class ClassifierComponent implements OnInit {
  questions: FontQuestion[] = [];
  font: FontInfo | undefined;
  fontPrev: FontInfo | undefined;
  fontNext: FontInfo | undefined;
  fontNameByRouting = ''
  answers: any
  autoNext = true
  jumpAnswered = true
  fg: FormGroup<{}>;
  fcs: { [k: string]: FormControl };
  lastActiveQuestion: string = '';
  constructor(private route: ActivatedRoute, private fontService: MongofontService, private router: Router, private classifierService: ClassificationService,
  ) {
    this.questions = this.classifierService.getQuestions()
    this.fcs = this.questions.reduce(
      (a, c) => { a[c.title] = new FormControl(); return a },
      {}
    );
    this.fg = new FormGroup(this.fcs)
    this.fg.valueChanges.subscribe(a => this.saveAnswer(a))
  }
  ngOnInit(): void {
    console.log(this.route)
    this.route.params.subscribe(params => {
      // FIXME: angular has some kind of issue
      // this.questions = this.classifierService.getQuestions()
      this.fontNameByRouting = params['name']
      this.answers = this.classifierService.answersFor(params['name'])
      // so far probably a memoryleak -> reuse the same subject at service... but how?
      this.fontService.getFontByName(params['name']).subscribe(f => {
        this.font = f
        const url = getTtfUrlForFirstFont(f)
        const css = generateFontCss({ name: f.meta.name, url })
        appendStyleTag(css)
        this.fontService.getFontBySkip({ 'meta.category': 'SANS_SERIF', idx: { $lt: f.idx } }, { sort: { idx: -1 } })
          .pipe(combineLatestWith(this.fontService.getFontBySkip({ 'meta.category': 'SANS_SERIF', idx: { $gt: f.idx } })))
          .subscribe(([p, n]) => {
            this.fontNext = n
            this.fontPrev = p
            this.loadPrefilledAnswers()
            if (this.jumpAnswered) {
              if (this.lastActiveQuestion) {
                if (this.fg.get((this.lastActiveQuestion))?.value) {
                  setTimeout(() => {
                    console.log('jumping font:' + this.font?.meta.name)
                    this.navigateToNextFont()
                  })
                }
              }
            }
          })
      },
        err => console.log("sad error noises", err)
      )
    })
  }

  saveAnswer(selection) {
    const values = Object.entries(selection).reduce((out, [k, v]) => { if (v) { out[k] = v; }; return out; }, {});
    this.classifierService.saveAllAnswers(this.fontNameByRouting, values)
    if (this.autoNext) {
      // puh... not exactly sure how this helps...
      // but it seems that calling the navigate of the route inside the callback of the radio event
      // leads to an undetected change 
      setTimeout(() => this.navigateToNextFont(), 200)
      // timeout makes sense anyways to optically see selected answer
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {

    if (event.key === 'k') {
      this.navigateToPreviousFont();
    } else if (event.key === 'j') {
      this.navigateToNextFont();
    }
    else {
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(event.key)) {
        const questionName = document.activeElement?.closest('mat-radio-group')?.getAttribute('ng-reflect-name')
        if (questionName) {
          const idx = parseInt(event.key) - 1
          const question = this.questions.find(q => q.title === questionName)
          if (question) {
            const answer = question.items[idx]
            if (answer) {
              this.fcs[questionName].setValue(answer)
            }
          }
        }

      }
    }

  }

  private _snackBar = inject(MatSnackBar)
  public importToLocalStorage(ev: any) {
    this.classifierService.importIntoLocalStorage()
      .subscribe(a => this._snackBar.open(`imported ${a} fonts`))
  }

  private navigateToPreviousFont() {
    if (this.fontPrev) {
      this.lastActiveQuestion = ''
      this.router.navigateByUrl('/classify/' + encodeURIComponent(this.fontPrev?.meta.name));
    }
  }

  private navigateToNextFont() {
    if (this.fontNext) {
      // @ts-ignore
      this.lastActiveQuestion = document.activeElement?.closest('mat-radio-group')?.getAttribute('ng-reflect-name')
      this.router.navigateByUrl('/classify/' + encodeURIComponent(this.fontNext?.meta.name));
    }
  }

  encode(part: string | undefined) {
    return part
  }
  loadPrefilledAnswers() {
    const _values = {}
    for (const k of Object.keys(this.fcs)) {
      _values[k] = this.answers[k] || null
    }
    this.fg.setValue(_values, { emitEvent: false })
  }

  focus(questionName) {
    // some radiobutton with this name
    const rb = this.matQuestions.find(mrb => mrb.name === questionName)
    rb?.focus()
  }

  @ViewChildren(MatRadioButton)
  matQuestions!: QueryList<MatRadioButton>
}
