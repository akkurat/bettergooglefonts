import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith, filter, firstValueFrom, map, Observable, skipWhile, switchMap } from 'rxjs';
import { FontByWeight, FontNameUrlMulti, FontUrls } from './FontNameUrl';
import { MemoryDb, MinimongoLocalDb } from 'minimongo';
import { Subject } from 'rxjs/internal/Subject';
import { AssetServiceService } from './asset-service.service';
import { environment } from 'src/environments/environment';
import { getSelectorForWeight } from './fontoverview/fontfilter.service';

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

// Format in mongodb
export type FontFamilyInfo = {
  idx: number
  dir: string
  classification: Record<string, Record<string, string>>;
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

  db: MinimongoLocalDb
  filters: BehaviorSubject<FontFilter[]> = new BehaviorSubject([] as FontFilter[])
  dbready: BehaviorSubject<boolean> = new BehaviorSubject(false)

  constructor(private http: HttpClient) {
    this.db = new MemoryDb();
    this.db.addCollection('fonts')

    const aS = inject(AssetServiceService);

    // todo make outer combinewith
    this.http.get((aS.bustUrl('assets/fontmeta.json')).toString())
      .pipe(combineLatestWith(this.http.get(aS.bustUrl('assets/classification.json').toString())))
      .subscribe(([fonts, classificationEntries]) => {
        const types = new Set()
        const classification = new Map((classificationEntries as []))
        for (const font of (fonts as FontFamilyInfo[])) {
          //@ts-ignore
          font['classification'] = classification.get(font.meta.name)
          font['type'] = font.meta.stroke || font.meta.category[0]
          types.add(font['type'])
        }
        this.db.collections['fonts'].upsert(fonts,
          (docs) => { console.debug(docs.length); this.dbready.next(true) },
          (err) => { console.debug(err); }
        )
        console.debug(types)
      })
  }
  /**
   * 
   * @param options 
   * percentiles: boundaries.
   * [2,5,9] maps to the two brackets [2<=x, x<5][5<=x,x<9]
   * 
   * [0,50][50,200][200,1000]
   */


  getFonts(selector): Observable<FontNameUrlMulti[]> {
    return this.dbready.pipe(
      filter<boolean>(v => v),
      switchMap(() => this.db.collections['fonts'].find(selector).fetch()),
      map(docs => docs.map(mapFont))
    );
  }



  /**
   * 
   * @see mapFont for converting to more comfortable object
   * @param name 
   * @returns 
   */
  getFontByFolderName(name: string): Observable<FontFamilyInfo> {
    const sub = new Subject<FontFamilyInfo>()
    this.dbready.subscribe(ready => {
      if (ready) { //todo: skipUntil(true)
        this.db.collections['fonts'].findOne({ dir: name }).then(f => {
          sub.next(f)
        })
      }
    })

    return sub.asObservable();
  }

  /**
   * 
   * @see {@link mapFont} for converting to more comfortable object
   * @param name 
   * @returns 
   */
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



    const [start, ...rest] = [0, 50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050]
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
}

/**
 * @deprecated use getUrlForFont instead
 * @param d 
 * @returns woff subset filename relative to serving dir
 */

export function getUrlForFirstFont(d: FontFamilyInfo) {
  const filename = d.meta.fonts[0].filename;
  return getUrlForFont(filename);
}

/**
 * 
 * @param d 
 * @returns woff subset filename relative to serving dir
 */
function getUrlForFont(filename: string) {
  return `assets/gf-subsets/ascii_us/${filename.replace(/\.ttf$/, "-subset.woff2")}`;
}

/**
 * @deprecated use getTtf
 * @param d 
 * @returns 
 */
export function getTtfUrlForFirstFont(d: FontFamilyInfo) {

  const dir = d.dir;
  const filename = d.meta.fonts[0].filename;
  return getTtfUrl(dir, filename)
}

export function getTtfUrl(dir: string, filename: string) {

  if (environment.production) {
    // substring(6) = remove '/fonts'
    return `https://raw.githubusercontent.com/google/fonts/main/${dir.substring(6)}/${filename}`;
  }
  return `assets/${dir}/${filename}`;
}

function groupFonts(dir: string, fonts: { style: 'italic' | 'normal'; weight: number; filename: string; }[]): FontByWeight[] {
  const normalMap = new Map<number, FontUrls>()
  const italicMap = new Map<number, FontUrls>()
  for (const font of fonts) {
    if (font.style === 'italic') {
      italicMap.set(font.weight, { ascii: getUrlForFont(font.filename), full: getTtfUrl(dir, font.filename) })
    }
    else if (font.style === 'normal') {
      normalMap.set(font.weight, { ascii: getUrlForFont(font.filename), full: getTtfUrl(dir, font.filename) })
    }
  }

  const out: FontByWeight[] = []

  for (const [weight, urls] of normalMap.entries()) {
    out.push({ weight, urls, italicUrls: italicMap.get(weight) })
  }
  return out
}

export function mapFont(d: FontFamilyInfo): FontNameUrlMulti {
  const italics = d.meta.fonts.map(f => f.style);

  const weights = d.meta.fonts.map(f => f.weight);
  const weightAxis = d.meta.axes?.find(a => a.tag === 'wght');
  let weightInfo;
  if (weightAxis) {
    const virtualWeights = [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
      .filter(w => w >= weightAxis.min_value && w <= weightAxis.max_value);
    weightInfo = {
      min_value: weightAxis.min_value,
      max_value: weightAxis.max_value,
      all: undefined,
      virtualWeights
    };

  } else {

    weightInfo = {
      min_value: Math.min(...weights),
      max_value: Math.max(...weights),
      all: [...new Set(weights)],
      virtualWeights: [...new Set(weights)]
    };
  }

  return ({
    idx: d.idx,
    name: d.meta.name,
    url: getUrlForFirstFont(d),
    axes: d.meta.axes,
    weights: weights,
    weightInfo,
    italics,
    hasItalics: italics.includes('italic'),
    fonts: groupFonts(d.dir, d.meta.fonts),
    classification: d.classification
  });
}
