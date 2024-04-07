import { Injectable } from '@angular/core';

import * as staticAssetsList from '../assets.json'

@Injectable({
  providedIn: 'root'
})
export class AssetServiceService {
  constructor() { }

  bustUrl(urlString: string | URL) {

    const url: URL = new URL(urlString, window.document.baseURI)
    const pathName = url.pathname

    const hash = staticAssetsList[pathName.substring(1)]

    if (hash) {
      url.searchParams.append('hash', hash)
    }

    return url

  }
}
