<<<<<<< HEAD
# opendatabd.com
opendatabd.com landing page
Incoming Dataset inside the site
=======
# OpenDataBD

Bangladesh's open platform for data sharing, surveys, and research.

**[opendatabd.org](https://opendatabd.org)** · [Browse Datasets](#) · [Active Surveys](#) · [API Docs](#)

---

## Why open data matters

Open data transforms how a country understands itself. When government statistics, research findings, and citizen-reported information are freely accessible, researchers can identify patterns that drive smarter policy, journalists can hold institutions accountable, and communities can advocate for resources with evidence in hand. For Bangladesh — a country navigating rapid urbanisation, climate vulnerability, and economic growth simultaneously — a shared, trustworthy data commons isn't just useful, it's essential. OpenDataBD exists to lower the barrier between raw data and the people who can act on it.

---

## What's here now

- **Open Data Repository** — Browse and download structured datasets across health, education, climate, economy, and more. All under open licenses.
- **Live Citizen Surveys** — Participate in or launch national surveys. Results publish automatically as open datasets when surveys close.
- **Data Submission** — Researchers, NGOs, and government bodies can submit datasets through a community review process.
- **Developer API** — RESTful JSON access to all datasets for applications, dashboards, and research pipelines.
- **Government Collaboration Portal** — A dedicated space for ministries and agencies to publish official statistics.
- **Research Project Registry** — Register projects, link datasets, and invite collaborators.

---

## Roadmap

These features are planned and will be built incrementally. Each one has its own issue — pick one and jump in.

| Feature | Status | Description |
|---|---|---|
| 🗺️ **Bangladesh District Map** | Planned | Interactive choropleth — click a district to browse its datasets. Immediate visual proof of geographic coverage. |
| 📖 **Data Stories** | Planned | Curated narratives built from platform datasets, making raw data useful to non-researchers and policymakers. |
| ⌨️ **API Playground** | Planned | Browser-based request builder — pick a dataset, set parameters, see live JSON. Turns visitors into API users. |
| 📬 **Dataset Request Board** | Planned | Researchers post what data they need; government agencies can claim and fulfil requests publicly. |
| 📝 **Citation Generator** | Planned | One-click APA / BibTeX / Chicago citation for any dataset. |
| 📊 **Live Survey Dashboard** | Planned | Real-time public view of active survey responses as charts update. |
| 👤 **Contributor Profiles** | Planned | Public researcher pages showing their submitted datasets and linked projects. |
| 📰 **Weekly Data Digest** | Planned | Curated email with new datasets and a data story — keeps the community engaged. |
| 🕓 **Dataset Changelog** | Planned | Public log of every dataset update — new columns, corrections, new versions. |
| 🏛️ **Government Data Request Portal** | Planned | Formal pathway for citizens to file open-data requests directly through the platform. |

---

## Built with

- [Quarto](https://quarto.org) — static site and document framework
- [Bootstrap 5](https://getbootstrap.com) — via Quarto's cosmo theme
- Plain HTML / CSS / vanilla JS — no build chain required beyond `quarto render`

---

## Getting started locally

You need [Quarto](https://quarto.org/docs/get-started/) installed.

```bash
git clone https://github.com/shahan24h/OpendataBD.git
cd OpendataBD
quarto preview
```

The site will open at `http://localhost:4321` with live reload.

To build the static site:

```bash
quarto render
```

Output goes to `_site/`.

---

## Contributing

This project is an open invitation. If you care about data access, civic technology, or Bangladesh — there is something here for you regardless of whether you write code.

**Ways to contribute:**

- **Pick a roadmap item** — open an issue, discuss the approach, then open a PR
- **Add a dataset** — know of a public Bangladeshi dataset that's missing? File an issue with a link
- **Improve the design** — the site is plain HTML/CSS in `index.qmd` and `custom.scss`
- **Write a Data Story** — a short analysis using platform data
- **Fix a bug or typo** — all PRs welcome, no contribution is too small

**Before opening a PR:**

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and run `quarto preview` to check locally
3. Open a pull request with a short description of what you changed and why

There is no CLA, no long contributor agreement. Open a PR and join the journey.

---

## Project structure

```
OpendataBD/
├── _quarto.yml          # site config, navbar, footer
├── index.qmd            # landing page
├── custom.scss          # all styles (CSS vars for dark/light mode)
├── custom.css           # small Quarto overrides
├── assets/
│   └── logo.svg
└── _includes/
    ├── theme-init.html  # prevents theme flash on load
    └── theme-toggle.html# injects dark/light toggle into navbar
```

As pages are added (API docs, survey pages, data submission form, etc.) they will each get their own `.qmd` file and be registered in `_quarto.yml`.

---

## License

Content and datasets published on OpenDataBD are available under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) unless otherwise noted. The platform code is [MIT licensed](LICENSE).

---

*Built for Bangladesh, by the community.*
>>>>>>> 7145eef (v2.0 clean start)
