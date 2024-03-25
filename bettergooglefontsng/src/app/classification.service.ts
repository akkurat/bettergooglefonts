import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';

const LOCALSTORAGE_PREFIX = 'fontquestionnaire_'



export type FontQuestion = {
  title: string;
  items: string[];
  samples: string;
};

@Injectable({
  providedIn: 'root'
})
export class ClassificationService {


  private _http = inject(HttpClient)

  private fontQuestions = this._http.get('assets/classification_questions.json')
    .pipe(
      map(q => Object.entries(q)
        .map(([title, value]) => ({
          title,
          items: value.a.map(i => typeof i === 'string' ? i : i.a),
          samples: value.s
        }))),
      tap(console.log),
      shareReplay(1)
    )



  importIntoLocalStorage() {
    return this._http.get('assets/classification.json')
      .pipe(
        // @ts-ignore
        map(e => { e.forEach(([f, qa]) => this.saveAllAnswers(f, qa)); return e.length }))
  }
  getQuestions(): Observable<FontQuestion[]> {
    return this.fontQuestions
  }

  private getLocalStorageItem(fontName: string) {
    return localStorage.getItem(this.storageKey(fontName));
  }

  private storageKey(fontName: string): string {
    return LOCALSTORAGE_PREFIX + fontName;
  }


  /**
   * 
   * Overwrites local storage entry
   * @param fontName 
   * @param question 
   * @param answer 
   */
  // todo: remove this, no need for explicit 3 param method
  saveAnswer(fontName: string, question: string, answer: string) {
    this.saveAllAnswers(fontName, { [question]: answer })
  }

  saveAllAnswers(fontName: string, qa: { [question: string]: string }) {
    const answers_str = this.getLocalStorageItem(fontName)
    let answers = {}
    if (answers_str) {
      answers = JSON.parse(answers_str)
    }
    answers = { ...answers, ...qa }
    localStorage.setItem(this.storageKey(fontName), JSON.stringify(answers))
  }

  answersFor(fontName: string) {
    const answers_str = this.getLocalStorageItem(fontName)
    if (answers_str) {
      const answers = JSON.parse(answers_str)
      return answers
    }
    return {}
  }

  getAllAnswers(): { [k: string]: { [v: string]: string } } {
    const lookup = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LOCALSTORAGE_PREFIX)) {
        const fontname = key.substring(LOCALSTORAGE_PREFIX.length)
        const value = localStorage.getItem(key);
        if (value) {
          lookup[fontname] = JSON.parse(value)
        }
      }
    }
    return lookup
  }

}
