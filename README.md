# IBMICE — Q2D landing pages

Static site for the Q2D × IBM Innovation Centre for Education future-skills programs (PEARL).
No build step: plain HTML, CSS and vanilla JS.

| Page | What it is |
| --- | --- |
| `index.html` | Journey page — ember hero, scroll-driven robot dismantle (400vh), lunar-mission parallax with trajectory, km counter and mission reel (600vh), contact and footer. |
| `landing.html` | Landing page — 3D neural-core globe that follows the cursor, parallax hero, tilting domain cards, PEARL steps, institutions and CTA. |

```
assets/
  css/journey.css   styles for index.html
  css/landing.css   styles for landing.html
  js/robot.js       procedural robot-head canvas renderer (window.Q2DRobot)
  js/journey.js     index.html: nav sheet, scroll/pointer state -> CSS custom properties, robot loop
  js/landing.js     landing.html: cursor follower, parallax, card tilt, neural-core globe
```

Scroll- and pointer-driven values on `index.html` are written as CSS custom properties
(`--b0-o`, `--lm-t1`, `--rail`, …) on `.page`; the markup reads them with `var(…)`.

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/ (or open `index.html` directly).

## Placeholders to fill

`landing.html` still has the design's placeholders: `[YOUR EMAIL]`, `[YOUR PHONE]`, `[00]+` learners
assessed, and the `[ Photo slot — … ]` boxes for photography.
