import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatestWith, filter, Observable } from 'rxjs';
import { FontByWeight, FontNameUrlMulti } from './FontNameUrl';
import { MemoryDb, MinimongoLocalDb } from 'minimongo';
import { Subject } from 'rxjs/internal/Subject';

export type AxesInfo = Map<string,{count:number, min:number, max:number}>


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

export type FontInfo = {
  idx: number
  dir: string
  meta: {
    category: string[];
    stroke?: string;
    name: string
    fonts: {
      style: 'italic'|'normal';
      weight: number;
      filename: string
    }[]
    axes: AxisInfo[]
  }
}

@Injectable({
  providedIn: 'root'
})
export class MongofontService {

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
        for (const meta of (metas as FontInfo[])) {
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
          const metafonts: FontNameUrlMulti[] = docs.map((d: FontInfo) => ({
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


  getFontByFolderName(name: string): Observable<FontInfo> {
    const sub = new Subject<FontInfo>()
    this.dbready.subscribe(ready => {
      if (ready) {
        this.db.collections['fonts'].findOne({ dir: name }).then(f => {
          sub.next(f)
        })
      }
    })

    return sub.asObservable();
  }

  getFontByName(name: string): Observable<FontInfo> {
    const sub = new Subject<FontInfo>()
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

  getFontBySkip(selector?, options?): Observable<FontInfo> {
    const sub = new Subject<FontInfo>()
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

export function getUrlForFirstFont(d: FontInfo) {
  const filename = d.meta.fonts[0].filename;
  return getUrlForFont(filename);
  return `assets/${d.dir}/${d.meta.fonts[0].filename}`;
}

function getUrlForFont(filename: string) {
  return `assets/gf-subsets/ascii_us/${filename.replace(/\.ttf$/, "-subset.woff2")}`;
}

export function getTtfUrlForFirstFont(d: FontInfo) {
  return `https://raw.githubusercontent.com/google/fonts/main/${d.dir.substring(6)}/${d.meta.fonts[0].filename}`;
  return `assets/${d.dir}/${d.meta.fonts[0].filename}`;
}

function groupFonts(fonts: { style: 'italic' | 'normal'; weight: number; filename: string; }[]): FontByWeight[] {
  const normalMap = new Map() 
  const italicMap = new Map()
  for( const font of fonts ) {
    if(font.style === 'italic') {
      italicMap.set(font.weight, getUrlForFont(font.filename))
    }
    else if(font.style === 'normal') {
      normalMap.set(font.weight, getUrlForFont(font.filename))
    }
  }

  const out: FontByWeight[] = []

  for( const [weight,url] of normalMap.entries() )
  {
    out.push({weight, url, italicUrl: italicMap.get(weight)})
  }
  return out
}

