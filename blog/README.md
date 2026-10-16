# blog

Personal notes. Plain Hugo, no theme; all templates are in `layouts/`.

```sh
hugo server -D          # preview locally, drafts included
hugo --minify           # production build into public/
```

Posts are Markdown files in `content/posts/` with this front matter:

```yaml
---
title: My note
date: 2026-10-16
tags: [aws, hugo]
draft: true            # set to false (or delete the line) to publish
---
```

Pushing to `main` under `blog/` deploys via `.github/workflows/blog.yml`
(S3 + CloudFront). `infra/cloudfront/rewrite-index.js` is the viewer-request
function that maps `/path/` and `/path` to `/path/index.html`.
