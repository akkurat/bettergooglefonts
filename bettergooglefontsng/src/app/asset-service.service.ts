import { Injectable } from '@angular/core';

import * as staticAssetsList from '../assets.json'

@Injectable({
  providedIn: 'root'
})
export class AssetServiceService {
  constructor() { }

  bustUrl(urlString: string ) {

    const url: URL = new URL(urlString, window.document.baseURI)
    const hash = staticAssetsList[urlString]

    if (hash) {
      url.searchParams.append('hash', hash)
    }

    return url

  }
}
