# Frontend source map

```
src/
├── main.jsx, App.jsx            entry point and page layout
├── index.css                    the only stylesheet entry: it @imports everything in styles/
│
├── styles/                      ALL styling (no styling in the .jsx files)
│   ├── base.css                 design tokens (colours, radii, shadows, font), reset, page
│   ├── components.css           shared pieces: card, button, chevron toggle, dropdown menu
│   ├── search-shared.css        fields, search bar, icon buttons, results table (both search cards)
│   ├── app.css                  page-level layout
│   ├── semantic-search.css      one file per feature …
│   ├── keyword-search.css
│   ├── report-modal.css
│   ├── graph-maker.css          Graph maker card, editor, info box
│   ├── charts.css               text, legends and marks inside the SVG charts
│   └── color-chooser.css        colour chooser popover and custom colour picker
│
├── components/                  shared UI used by several features (look identical everywhere)
│   ├── Button.jsx               the one button (variants: default, primary; sizes: medium, small)
│   ├── ChevronToggle.jsx        expand / collapse arrow (down = collapsed, up = expanded)
│   ├── CollapsibleCard.jsx      card frame: title, description, chevron, content
│   ├── SearchSubmitButton.jsx   round magnifier button of the two searches
│   ├── ColorChooser.jsx         theme swatches + "Change theme" + "Color picker"
│   └── ColorPicker.jsx          free colour picker (square, hue slider, hex field)
│
├── constants/
│   └── species.js               species lists, alphabetical (semantic search / find about genes)
│
└── features/
    ├── semantic-search/         Semantic search card
    ├── keyword-search/          "Find about genes" card
    ├── report/                  "Report it" modal
    └── graph-maker/
        ├── GraphMaker.jsx       the card and its screens (choose -> editor -> graph)
        ├── graphTypes.js        the three graphs and their info texts
        ├── icons/               icons of the three graph choices
        ├── editor/              paste editor: categories, groups, colours, validation
        ├── charts/              d3 charts: BarPlot, Heatmap, NetworkPlot + shared chart parts
        └── data/                parsing of pasted tables/JSON/xlsx, statistics, palettes, export
```

Rules of thumb
- Styling goes in `styles/`, using the tokens from `base.css`. A new feature gets its own file there plus one line in `index.css`.
- If a UI element appears in more than one feature (button, arrow, menu …) it lives in `components/` and `styles/components.css`.
