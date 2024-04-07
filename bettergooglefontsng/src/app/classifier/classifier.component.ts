import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClassificationService, FontQuestion } from '../classification.service';
import { appendStyleTag, generateFontCss } from '../FontNameUrl';
import { FontFamilyInfo, MongofontService, getTtfUrlForFirstFont } from '../mongofont.service';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { JsonPipe, NgFor } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { combineLatestWith } from 'rxjs';
import { MatIconRegistry } from '@angular/material/icon';
import { SettingsStore } from '../helpers';



@Component({
  selector: 'app-classifier',
  templateUrl: './classifier.component.html',
  standalone: true,
  imports: [FormsModule, NgFor, MatSnackBarModule, RouterModule, ReactiveFormsModule, JsonPipe],
  providers: [{ provide: SettingsStore, useClass: SettingsStore }]
})
export class ClassifierComponent implements OnInit {
  private _settingsStore = inject(SettingsStore)
  questions: FontQuestion[] = [];
  font: FontFamilyInfo | undefined;
  fontPrev: FontFamilyInfo | undefined;
  fontNext: FontFamilyInfo | undefined;
  fontNameByRouting = ''
  get autoNext() { return this._settingsStore.getBoolSetting('classifier/autoNext', true) }
  set autoNext(value) { this._settingsStore.storeBoolSetting('classifier/autoNext', value) }
  get jumpAnswered() { return this._settingsStore.getBoolSetting('classifier/jumpAnswered', false) }
  set jumpAnswered(value) { this._settingsStore.storeBoolSetting('classifier/jumpAnswered', value) }
  answers?: Record<string, string>;
  fg: FormGroup = new FormGroup({})
  fcs: { [k: string]: FormControl; } = {}
  lastActiveQuestion: string = '';
  fstyle = '';
  constructor(
    private route: ActivatedRoute,
    private fontService: MongofontService,
    private router: Router,
    private classifierService: ClassificationService,
    private iconRegistry: MatIconRegistry
  ) {
    this.classifierService.getQuestions().subscribe(q => {
      this.questions = q
      for (const c of this.questions) {
        const fc = new FormControl()
        this.fcs[c.title] = fc
        this.fg.addControl(c.title, fc)
      }

      this.fg.valueChanges.subscribe(a => this.saveAnswer(a))
    })
    // todo: read from json 
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
        this.fstyle = `font-family: "${f.meta.name}", Tofu`
        this.fontService.getFontBySkip({ idx: { $lt: f.idx } }, { sort: { idx: -1 } })
          .pipe(combineLatestWith(this.fontService.getFontBySkip({ idx: { $gt: f.idx } })))
          .subscribe(([p, n]) => {
            this.fontNext = n
            this.fontPrev = p
            this.loadPrefilledAnswers()
            if (this.jumpAnswered) {
              if (this.lastActiveQuestion) {
                if (this?.fg?.get((this.lastActiveQuestion))?.value) {
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
    const values = Object.entries(selection).reduce((out, [k, v]) => { if (v) { out[k] = v; } return out; }, {});
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
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => 'Digit' + k).includes(event.code)) {
        const questionName = this.getQuestionInFocus()
        if (questionName) {
          const idx = parseInt(event.code.substring('Digit'.length)) - 1 + (event.shiftKey ? 10 : 0)
          const question = this.questions.find(q => q.title === questionName)
          const answer = question?.items[idx]
          if (answer) {
            this.fcs?.[questionName].setValue(answer)
          }
        }
      }

    }
  }

  private _snackBar = inject(MatSnackBar)

  private getQuestionInFocus() {
    const activeElement = document.activeElement;
    return this.questionByRadio(activeElement) || '';
  }

  private questionByRadio(activeElement: Element | null) {
    return activeElement?.getAttribute('ng-reflect-form-control-name');
  }

  public importToLocalStorage() {
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
      this.lastActiveQuestion = this.getQuestionInFocus()
      this.router.navigateByUrl('/classify/' + encodeURIComponent(this.fontNext?.meta.name));
    }
  }

  encode(part: string | undefined) {
    return part
  }
  loadPrefilledAnswers() {
    const _values = {}
    if (this.fcs) {
      for (const k of Object.keys(this.fcs)) {
        _values[k] = this.answers?.[k] || null
      }
      this.fg?.setValue(_values, { emitEvent: false })
    }
  }

  focus(questionName) {
    // some radiobutton with this name
    const rb = this.matQuestions
      .map(ref => ref.nativeElement)
      .find(inp => this.questionByRadio(inp) === questionName)
    rb?.focus()
  }

  @ViewChildren('qradio')
  matQuestions!: QueryList<ElementRef<HTMLInputElement>>
}
