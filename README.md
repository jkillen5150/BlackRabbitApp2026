# Black Rabbit Landscaping

Static multi-page site for **blackrabbitlawn.com** — lawn care serving Yelm, Rainier, Lacey, Roy, Olympia & Thurston County.

## Pages

| Page | File |
|------|------|
| Home (+ quote form, rotating reviews) | `index.html` |
| Testimonials | `testimonials.html` |
| Portfolio | `portfolio.html` |
| Service map (pins) | `service-area.html` |
| Customer / admin login | `login.html` |
| Admin CMS | `admin.html` |
| Customer dashboard | `customer.html` |
| Quote thank-you | `thankyou.html` |

## Admin

1. Open **Login → Admin**
2. Username: `jkillen5150` (password set in auth hash)
3. Add reviews, portfolio photos, and map pins
4. Edits save in the browser; use **Export content.json** and replace `data/content.json`, then redeploy so all visitors see updates

## Content data

- Default seed data: `data/content.json`
- Shared styles: `css/site.css`
- Scripts: `js/`

## Local preview

```bash
python3 -m http.server 8765
# open http://localhost:8765
```
