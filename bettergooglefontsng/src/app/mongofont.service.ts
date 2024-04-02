import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith, filter, first, firstValueFrom, from, Observable, skipUntil, skipWhile } from 'rxjs';
import { FontByWeight, FontNameUrlMulti } from './FontNameUrl';
import { MemoryDb, MinimongoLocalDb } from 'minimongo';
import { Subject } from 'rxjs/internal/Subject';
import { getSelectorForWeight } from './fontfilters/fontfilters.component';

export type AxesInfo = Map<string, { count: number, min: number, max: number }>


export type FontFilter = {
  name: string
  min?: number
  max?: number
}

export type AxisInfo = {
  tag: string;
  min_value: number;
  max_value: number;
};

type FontInfo = {
  style: 'italic' | 'normal';
  weight: number;
  filename: string;
};

export type FontFamilyInfo = {
  idx: number
  dir: string
  meta: {
    category: string[];
    stroke?: string;
    name: string
    fonts: FontInfo[]
    axes: AxisInfo[]
  }
}

export type FontByWeightRange = {
  range: [number, number];
  count: number;
  discreteCnt: number,
  rangeCnt: number
};

@Injectable({
  providedIn: 'root'
})
export class MongofontService {
  /**
   * 
   * @param options 
   * percentiles: boundaries.
   * [2,5,9] maps to the two brackets [2<=x, x<5][5<=x,x<9]
   * 
   * [0,50][50,200][200,1000]
   */
  async percentilesByRange(): Promise<FontByWeightRange[]> {

    await firstValueFrom(this.dbready.pipe(skipWhile(e => !e)))

    const selector = getSelectorForWeight({ flag: false })
    const _d1: { meta: { axes: AxisInfo[] } }[] = await this.db.collections['fonts'].find(selector, { fields: { 'meta.axes': 1 } }).fetch()
    const d2: { meta: { fonts: FontInfo[] } }[] = await this.db.collections['fonts'].find({ $nor: [selector] }, { fields: { 'meta.fonts': 1 } }).fetch()

    const d1: AxisInfo[] = []
    for (const d of _d1) {
      // hm.... maybe we could make fontmeta.json a bit more friendly already
      d.meta.axes
        .filter(a => a.tag === 'wght')
        .forEach(a => d1.push(a))
    }



    const [start, ...rest] = [0,50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050]
    let lastVal = start

    const out: FontByWeightRange[] = []

    for (const max of rest) {
      const min = lastVal
      lastVal = max

      let discreteCnt = 0
      for (const d of d2) {
        discreteCnt += d.meta.fonts.filter(f => min < f.weight && f.weight <= max).length
      }
      let rangeCnt = 0
      for (const d of d1) {
        const avg = (max + min) / 2;
        if (d.min_value <= avg && avg <= d.max_value) {
          rangeCnt++
        }
      }
      out.push({ range: [min, max], count: discreteCnt + rangeCnt, discreteCnt, rangeCnt })

    }

    return out


  }

  db: MinimongoLocalDb
  filters: BehaviorSubject<FontFilter[]> = new BehaviorSubject([] as FontFilter[])
  // EventsEmitter?
  dbready: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(private http: HttpClient) {
    this.db = new MemoryDb();
    this.db.addCollection('fonts')

    this.http.get('assets/fontmeta.json').pipe(combineLatestWith(this.http.get('assets/classification.json')))
      .subscribe(([metas, classificationEntries]) => {
        const types = new Set()
        const classification = new Map((classificationEntries as []))
        for (const meta of (metas as FontFamilyInfo[])) {
          meta['classification'] = classification.get(meta.meta.name)
          meta['type'] = meta.meta.stroke || meta.meta.category[0]
          types.add(meta['type'])
        }
        this.db.collections['fonts'].upsert(metas,
          (docs) => { console.log(docs.length); this.dbready.next(true) },
          (err) => { console.log(err); }
        )
        console.log(types)
      })
  }

  getFonts(selector): Observable<FontNameUrlMulti[]> {

    const sub = new Subject<FontNameUrlMulti[]>()


    this.dbready.pipe(filter<boolean>(v => v))
      .subscribe((/*dbready*/) => {
        // ... maybe create a anbstract class for filter implementation
        // and move it away from the service
        this.db.collections['fonts'].find(selector).fetch(docs => {
          // const fmeta = docs.map()
          // TODO: map filename already in meta?
          const metafonts: FontNameUrlMulti[] = docs.map((d: FontFamilyInfo) => ({
            name: d.meta.name,
            url: getUrlForFirstFont(d),
            axes: d.meta.axes,
            weights: d.meta.fonts.map(f => f.weight),
            italics: d.meta.fonts.map(f => f.style),
            fonts: groupFonts(d.meta.fonts)
          }))
          sub.next(metafonts)
        }, err => console.log(err))
      })
    return sub.asObservable()
  }


  getFontByFolderName(name: string): Observable<FontFamilyInfo> {
    const sub = new Subject<FontFamilyInfo>()
    this.dbready.subscribe(ready => {
      if (ready) {
        this.db.collections['fonts'].findOne({ dir: name }).then(f => {
          sub.next(f)
        })
      }
    })

    return sub.asObservable();
  }

  getFontByName(name: string): Observable<FontFamilyInfo> {
    const sub = new Subject<FontFamilyInfo>()
    this.dbready.subscribe(ready => {
      if (ready) {
        this.db.collections['fonts'].findOne({ 'meta.name': name }).then(f => {
          sub.next(f)
          sub.complete()
        })
      }
    })

    return sub.asObservable();
  }

  getFontBySkip(selector?, options?): Observable<FontFamilyInfo> {
    const sub = new Subject<FontFamilyInfo>()
    this.dbready.subscribe(ready => {
      if (ready) {
        this.db.collections['fonts'].findOne(selector, options).then(f => {
          sub.next(f)
          sub.complete()
        })
      }
    })
    return sub.asObservable();
  }




  /**
   * 
   * @returns Axes based on fonts
   */
  // todo add selector as parameter
  getAxes(): Observable<AxesInfo> {
    const sub = new Subject<AxesInfo>()
    this.dbready.subscribe(names => {
      if (names) {
        this.db.collections['fonts'].find({ 'meta.axes': { $exists: true } }, { fields: 'meta.axes' })
          .fetch().then(docs => {
            const axes = new Map()
            for (const doc of docs) {
              for (const axe of doc.meta.axes) {
                if (!axes.has(axe.tag)) {
                  axes.set(axe.tag, { count: 0, min: 1000, max: -1000 })
                }
                const axstat = axes.get(axe.tag)
                axstat.count++

                if (axe.min_value < axstat.min) {
                  axstat.min = axe.min_value
                }
                if (axe.max_value > axstat.max) {
                  axstat.max = axe.max_value
                }

              }
            }
            sub.next(axes)
          })
      }
    })
    return sub
  }
}

export function getUrlForFirstFont(d: FontFamilyInfo) {
  const filename = d.meta.fonts[0].filename;
  return getUrlForFont(filename);
  return `assets/${d.dir}/${d.meta.fonts[0].filename}`;
}

function getUrlForFont(filename: string) {
  return `assets/gf-subsets/ascii_us/${filename.replace(/\.ttf$/, "-subset.woff2")}`;
}

export function getTtfUrlForFirstFont(d: FontFamilyInfo) {
  return `https://raw.githubusercontent.com/google/fonts/main/${d.dir.substring(6)}/${d.meta.fonts[0].filename}`;
  return `assets/${d.dir}/${d.meta.fonts[0].filename}`;
}

function groupFonts(fonts: { style: 'italic' | 'normal'; weight: number; filename: string; }[]): FontByWeight[] {
  const normalMap = new Map()
  const italicMap = new Map()
  for (const font of fonts) {
    if (font.style === 'italic') {
      italicMap.set(font.weight, getUrlForFont(font.filename))
    }
    else if (font.style === 'normal') {
      normalMap.set(font.weight, getUrlForFont(font.filename))
    }
  }

  const out: FontByWeight[] = []

  for (const [weight, url] of normalMap.entries()) {
    out.push({ weight, url, italicUrl: italicMap.get(weight) })
  }
  return out
}

