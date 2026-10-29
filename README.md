# Value Cards

A small, free web app for finding your values. You sort a deck of 50 value cards down to 10, then 5, then your core 3. Then you rename your five if you like, write one line on what each means to you, and save a shareable image.

Everything stays in the visitor's browser (`localStorage`). Nothing is sent anywhere except an optional, cookie-free visit count (see below).

## Files

- `index.html`: the page shell
- `style.css`: the look of the cards
- `values.js`: the 50 values
- `app.js`: the sorting flow, the definitions step, and the image export

There's no build step. To run it locally, use any static server:

```bash
python3 -m http.server 8123
```

## Hosting on GitHub Pages

1. Push this folder to a **public** GitHub repository.
2. In the repo, go to **Settings → Pages**, and set **Source** to "Deploy from a branch", **Branch** to `main`, and the folder to `/ (root)`.
3. The site goes live at `https://<username>.github.io/<repo-name>/`.

## Counting visitors (optional)

The app can report visits and completions to [GoatCounter](https://www.goatcounter.com), which is free for personal use and sets no cookies.

1. Sign up and pick a site code, for example `valuecards`.
2. In `app.js`, set `const GOATCOUNTER_CODE = 'valuecards';`.
3. Your dashboard (`https://valuecards.goatcounter.com`) then shows:
   - page views
   - a `started` event each time someone begins a sort
   - a `completed` event each time someone reaches their results

Visits from `localhost` aren't counted.

## Where the values come from

The deck is adapted mainly from the **Personal Values Card Sort**: Miller, W. R., C'de Baca, J., Matthews, D. B., & Wilbourne, P. L. (2001), University of New Mexico. That card sort is in the public domain. Some cards merge near-duplicates from it, for example Autonomy covers Autonomy, Independence and Freedom.

The deck was cross-checked against these sources so that every broad family of values is represented:

- Schwartz, S. H. (1992). Universals in the content and structure of values. *Advances in Experimental Social Psychology, 25*, 1–65.
- Schwartz, S. H., et al. (2012). Refining the theory of basic individual values. *Journal of Personality and Social Psychology, 103*(4), 663–688.
- Rokeach, M. (1973). *The Nature of Human Values.* Free Press.
- Peterson, C., & Seligman, M. E. P. (2004). *Character Strengths and Virtues.* (Used as a reference only.)
- Wilson, K. G., et al. (2010). The Valued Living Questionnaire. *The Psychological Record, 60*, 249–272.
