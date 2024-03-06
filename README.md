# Better Google Fonts

![Filtered view of googlefonts filtered by: Fonts containing a variable wght-axis from 100 - 900, horizontal cap of the stems (e, a) and a Helvetica like K/k ](filters.png)

# How to Run
## installation

```bash
git clone https://github.com/akkurat/bettergooglefonts.git
```

Cloning the submodule is only necessary for creating a new woff2-subset updating meta infos

```bash
git clone --recurse-submodules https://github.com/akkurat/bettergooglefonts.git
```

(submodule will take it's time as it is >1GB to clone)



## combine all meta font data into one fat json
Installation is needed for protobuf parser
```bash
npm i
node gf.js bettergooglefontsng/assets/
```

## start angular app to serve font files and overview
```bash
cd bettergooglefontsng
npm i
ng serve
```

# Roadmap
## Bugish
* questionnaire based on font name (and not directory)

## Reasonable TODOs
* Questionaire: Characterizations for Serif fonts
* Checkbox to in- or exclude fonts without the respective axis availabe
* Map standard axis to discrete values (e.g. weight, width, slant/ italic angle)
* Detailview of font with something like this [https://www.axis-praxis.org/specimens/__DEFAULT__] -> Quickwin: Link to google fonts for now
* Custom specimen text -> Sofar only Ascii letters possible (due to subset woff) -> load ttf from github raw?
* Grid/List view
* Size / Width/ Weight Waterfall

## Fancy Todos
(not necessarily hard to implement, but lower prio)
* Show number filtered Fonts due to Range or Selection Filter
* [Sankey Diagram](https://en.wikipedia.org/wiki/Sankey_diagram) for filtering path
* [Venn Diagram](https://en.wikipedia.org/wiki/Venn_diagram) for font properties (e.g. which fonts have a helvetica like K, double story g and and are real italics)




# Limitations
* Size matters: All ttf fonts originally are 1.7 GB. Subsetting them for only ASCII and converting to woff2 results in a reasonable 60MB in total
* Preview for a specific font is now going to the original google page. The font tester is actually quite ok. 

# Structure

## Data consolidation
### Sources of Information
* FONTMETA.pb: Axes Information, Font Styles, Filepath of the font
* axisregistry: Metainfos on Axis (not yet used in GUI but .pb files are parsed)
* tags/all/families.csv: Tagging Info more detailed than just serif / sans (not yet used)
* classification.json

### Offline computing
* All FONTMETA.pb files (protobuf files) are parse by the nodescript gf.js and wrote into ```bettergooglefontsng/src/assets/fontmeta.json``` (parameter of the script)
* All *.pb files in the axisregistry/data are merged into ```bettergooglefontsng/src/assets/axismeta.json```
* classification.json is copied from 'http://localhost:4200/classify-json' 
* converting ttf fonts to woff2 with only ascii for the preview: ```glyphhanger --subset="fonts/**/*.ttf" --output=gf-subsets/ascii_us --US_ASCII --formats=woff2```

### App 
* At startup an in-memory minimongo db is setup with the contents of fontmeta.json and classification.json merged together
* Afterwards filtering is done via mongo queries

### Questionnaire
* To classify a font use (http://localhost:4200/classify/paprika)
* The answers are written into localstorage
* To contribute classifications go to http://localhost:4200/classify-json and copy the contents into classification.json

## Angular App
* mongofont.service.ts -> Has the meta data
* fontoverview -> listing fonts, main routing
* fontpreview -> One tile in the listing
* fontfilters -> upper part of fontoverview
* classifier -> questionnaire
