# Copilot Instructions for arcezd/arcezd Repository

## Repository Overview

This is a **personal profile and resume generator** repository that automatically generates PDF resumes in multiple languages (English and Spanish) from JSON data files. The repository serves as both a GitHub profile README and a resume generation tool.

### Purpose
- Generate professional PDF resumes from structured JSON data
- Maintain version-controlled resume content
- Automate resume builds and releases via GitHub Actions
- Display profile information on GitHub

## Technology Stack

### Core Technologies
- **Runtime**: Node.js (v20.x)
- **Package Manager**: Yarn (with frozen lockfiles)
- **Template Engine**: Handlebars.js for HTML templating
- **PDF Generation**: Puppeteer (headless Chrome) for HTML-to-PDF conversion
- **Languages**: JavaScript (ES6+)

### Build & Release Tools
- **Version Management**: Commitizen with semantic versioning (semver2)
- **Changelog**: Automated changelog generation
- **Linting**: yamllint for YAML files
- **CI/CD**: GitHub Actions

### Key Dependencies
```json
{
  "dotenv": "^16.0.0",
  "handlebars": "^4.7.7",
  "puppeteer": "^13.5.2"
}
```

## Project Structure

```
.
├── .github/
│   ├── workflows/          # GitHub Actions workflows
│   │   ├── build.yml       # Build and release workflow (triggered on tags)
│   │   ├── release.yml     # Create new release workflow
│   │   ├── tests.yml       # Linting and tests
│   │   └── copilot-setup-steps.yml  # Setup steps for Copilot
│   └── dependabot.yml      # Dependabot configuration
├── assets/                 # Badge images and assets
├── html/                   # External checkout (NOT in git, see below)
├── resume_en-US.json       # Resume data in English
├── resume_es-CR.json       # Resume data in Spanish
├── task.js                 # Main script for PDF generation
├── README.md               # GitHub profile README
├── CHANGELOG.md            # Auto-generated changelog
├── package.json            # Node.js dependencies
├── .cz.toml               # Commitizen configuration
├── .gitignore             # Git ignore patterns
├── .yamllint              # yamllint configuration
└── .python-version        # Python version for tooling
```

## Critical Setup Requirements

### External Repository Dependency

**IMPORTANT**: This project depends on an external HTML template repository:
- **Repository**: `arcezd/html-resume`
- **Version**: `v1.3.1` (pinned)
- **Checkout Path**: `html/` directory
- **Status**: NOT tracked in git (in .gitignore)

The `html/` directory must be checked out separately before building. The GitHub Actions workflows handle this automatically using:

```yaml
- uses: actions/checkout@v5
  with:
    repository: arcezd/html-resume
    ref: v1.3.1
    path: html
```

**For local development**, you must manually checkout the html-resume repository:
```bash
git clone --branch v1.3.1 https://github.com/arcezd/html-resume.git html
```

The html directory contains:
- `default/resume.html` - Handlebars template
- `default/style.css` - Resume styling
- `default/lang/*.json` - Internationalization files

## Development Workflow

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/arcezd/arcezd.git
   cd arcezd
   ```

2. **Install dependencies**:
   ```bash
   yarn install --frozen-lockfile
   ```

3. **Checkout html-resume repository**:
   ```bash
   git clone --branch v1.3.1 https://github.com/arcezd/html-resume.git html
   ```

4. **Install Chromium** (for Puppeteer):
   - On GitHub Actions: Uses `browser-actions/setup-chromium@v2`
   - For local development: Puppeteer will download Chromium automatically, or use local Chrome

### Available Commands

- **Generate PDF (default English)**:
  ```bash
  npm run pdf
  # or with debugging:
  npm run pdf-debug
  ```

- **Generate Spanish PDF**:
  ```bash
  RESUME_LANGUAGE=es-CR npm run pdf
  ```

- **Run tests**:
  ```bash
  npm test
  # Note: Currently returns "Error: no test specified"
  ```

### Environment Variables

The `task.js` script supports the following environment variables:

- `USE_LOCAL_CHROME`: Set to "true" to use local Chrome instead of bundled Chromium (default: "false")
- `HTML_TEMPLATE_SUBFOLDER`: Path to HTML template (default: "html/default")
- `RESUME_LANGUAGE`: Language code (default: "en-US", can be "es-CR")
- `TAG_REF_V`: Git tag reference (e.g., "refs/tags/v1.2.0")
- `COMMIT_SHA`: Short commit SHA for build metadata
- `GITHUB_REPO_URL`: Repository URL for build metadata

## How task.js Works

The main script (`task.js`) performs the following:

1. **Load Templates and Data**:
   - Reads Handlebars template from `html/default/resume.html`
   - Loads language strings from `html/default/lang/${RESUME_LANGUAGE}.json`
   - Loads resume data from `resume_${RESUME_LANGUAGE}.json`

2. **Data Processing**:
   - Keeps only last 5 jobs in experience
   - Removes contributions, projects, and education sections
   - Shows only first 5 skills in each category
   - Adds build metadata if environment variables are set

3. **Template Rendering**:
   - Registers Handlebars helpers: `i18n`, `monthYearDate`, `shortDate`, `onlyYearDate`, `reverse`, `assetPath`
   - Compiles template with data
   - Outputs HTML to `html/default/diego.arce_resume_${RESUME_LANGUAGE}.html`

4. **PDF Generation**:
   - Launches Puppeteer with appropriate Chrome configuration
   - Loads the generated HTML file
   - Converts to PDF with Letter format and background printing enabled
   - Outputs to `diego.arce_resume_${RESUME_LANGUAGE}.pdf`

## CI/CD Pipeline

### Workflows

1. **`tests.yml`** - Runs on Pull Requests to `main`:
   - Checks out code
   - Installs Python tooling (uv)
   - Runs `yamllint .` for YAML validation

2. **`release.yml`** - Runs on push to `main` or manual trigger:
   - Creates beta releases by default
   - Uses Commitizen to bump version
   - Updates CHANGELOG.md
   - Signs commits with GPG (bot account)
   - Pushes tags and changes

3. **`build.yml`** - Runs on version tags (v*.*.* or v*.*.*-beta.*):
   - Checks out code and html-resume repository
   - Sets up Node.js v20.x
   - Installs dependencies with `yarn install --frozen-lockfile`
   - Sets up Chromium browser
   - Generates PDFs for both English and Spanish
   - Uploads artifacts
   - Creates GitHub release with PDF attachments

4. **`copilot-setup-steps.yml`** - Runs on workflow dispatch or PR changes:
   - Sets up environment for Copilot agent
   - Checks out both main and html-resume repositories
   - Installs Node.js dependencies and Chromium

### Release Process

The project uses **semantic versioning** with the following flow:

1. Commits must follow **Conventional Commits** format
2. On push to `main`, `release.yml` automatically:
   - Bumps version using Commitizen
   - Updates CHANGELOG.md
   - Creates and pushes a git tag
3. The git tag triggers `build.yml` which:
   - Generates PDFs
   - Creates GitHub release with artifacts

**Version format**: `vMAJOR.MINOR.PATCH` or `vMAJOR.MINOR.PATCH-beta.N`

**Configuration** (`.cz.toml`):
```toml
[tool.commitizen]
annotated_tag = true
bump_message = "chore(release): v$new_version [skip-ci]"
changelog_merge_prerelease = true
gpg_sign = true
name = "cz_conventional_commits"
tag_format = "v$version"
update_changelog_on_bump = true
version_scheme = "semver2"
version_provider = "npm"
```

## Linting and Code Quality

### YAML Linting

Configuration file: `.yamllint`

Key rules:
- Line length: max 150 characters
- Indentation: 2 spaces, consistent sequences
- Truthy values: only 'true' and 'false' allowed (not checking keys)
- Ignores: `node_modules/`

**Run yamllint**:

Using uv (recommended, matches CI):
```bash
# Install Python via uv
uv python install
# Run yamllint using uvx (which downloads and runs yamllint without installing it)
uvx yamllint .
```

Alternative with pip3:
```bash
pip3 install yamllint
yamllint .
```

## Testing

**Current Status**: The project has **no automated tests** defined. The `npm test` command returns an error.

**Recommendation**: When making code changes, manually verify by:
1. Running `npm run pdf` to generate PDFs
2. Opening the generated PDF files to verify output
3. Checking the generated HTML in `html/default/diego.arce_resume_*.html`

## Common Issues and Solutions

### Issue: Missing `html/` directory
**Solution**: Checkout the html-resume repository:
```bash
git clone --branch v1.3.1 https://github.com/arcezd/html-resume.git html
```

### Issue: Puppeteer fails to launch Chrome
**Solution**: 
- Ensure Chromium is installed (CI uses `browser-actions/setup-chromium@v2`)
- For local development, set `USE_LOCAL_CHROME=true` if you have Chrome installed
- Check `task.js` for Chrome executable path configuration

### Issue: PDF not generated
**Solution**: Check that:
1. `html/` directory exists with templates
2. Resume JSON files exist (`resume_en-US.json`, `resume_es-CR.json`)
3. Dependencies are installed (`yarn install`)
4. No errors in console output

### Issue: Build fails on tag
**Solution**: 
- Verify the tag matches the format: `v*.*.*` or `v*.*.*-beta.*`
- Check that the tag exists in git
- Ensure secrets are configured (if using S3 upload features)

## File Patterns to Ignore

**Generated files** (already in .gitignore):
- `*_resume*.pdf` - Generated PDF files
- `html/` - External repository checkout
- `node_modules/` - Dependencies
- `.env` files - Environment variables

**Build artifacts**:
- HTML output files in `html/default/diego.arce_resume_*.html` (generated during build)

## Coding Conventions

### JavaScript
- Use ES6+ features (const, let, arrow functions, async/await)
- Prefer `async/await` over raw promises
- Use `require()` for module imports (CommonJS)
- Handle errors with try/catch blocks and descriptive messages

### Commits
- Follow **Conventional Commits** specification
- Format: `type(scope): subject`
- Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `ci`
- Examples:
  - `feat(resume): add new experience entry`
  - `fix(CI): update node version in workflow`
  - `chore(release): v1.2.0 [skip-ci]`

### YAML Files
- Use 2-space indentation
- Keep lines under 150 characters
- Use single quotes for strings when needed
- Follow `.yamllint` rules

## Key Points for AI Coding Agents

1. **Always check out the `html/` directory** before attempting to build or test. This is an external dependency.

2. **Do not modify files in `html/`** - this is an external repository. Changes should be made in the `arcezd/html-resume` repository.

3. **Resume data lives in JSON files** (`resume_en-US.json`, `resume_es-CR.json`). These are the primary content files.

4. **The main logic is in `task.js`** - this orchestrates template rendering and PDF generation.

5. **No test suite exists** - verify changes manually by running `npm run pdf` and checking output.

6. **Version bumps are automated** - don't manually edit version numbers in `package.json`. Use Commitizen or let CI handle it.

7. **CHANGELOG.md is auto-generated** - don't manually edit it. It's managed by Commitizen.

8. **Dependencies are locked** - use `yarn install --frozen-lockfile` to ensure reproducible builds.

9. **PDFs should not be committed** - they are generated artifacts and are in .gitignore.

10. **The `html/` directory should not be committed** - it's now in .gitignore as it's an external checkout.

## Security Considerations

- **No sensitive data**: Resume data is public information
- **GPG signing**: Release commits are GPG-signed by bot account
- **Secrets**: GitHub Actions uses secrets for GPG keys and AWS credentials (commented out)
- **Dependencies**: Dependabot is configured to monitor and update dependencies

## Additional Resources

- **Resume template repository**: https://github.com/arcezd/html-resume
- **Puppeteer documentation**: https://pptr.dev/
- **Handlebars documentation**: https://handlebarsjs.com/
- **Commitizen**: https://commitizen-tools.github.io/commitizen/
- **Conventional Commits**: https://www.conventionalcommits.org/

## Quick Start for Copilot Agents

To work on this repository:

1. The environment is already set up via `copilot-setup-steps.yml`
2. The `html/` directory is checked out automatically
3. Dependencies are installed
4. Chromium is configured

To make changes:

1. Edit resume data in `resume_en-US.json` or `resume_es-CR.json`
2. If modifying the build script, edit `task.js`
3. Test changes with `npm run pdf`
4. Follow Conventional Commits for commit messages
5. Submit PR to `main` branch - this will trigger `tests.yml`
6. On merge, `release.yml` creates a new version and tag
7. The tag triggers `build.yml` to generate and release PDFs

Remember: This is a personal profile repository, so changes should maintain the professional and personal nature of the content.
