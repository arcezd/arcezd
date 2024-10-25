const fs = require('fs'),
  path = require('path'),
  puppeteer = require('puppeteer'),
  Handlebars = require('handlebars'),
  utils = require('util'),
  readFile = utils.promisify(fs.readFile),
  writeFile = utils.promisify(fs.writeFile);

require('dotenv').config();

const USE_LOCAL_CHROME = process.env.USE_LOCAL_CHROME || 'false';

const HTML_TEMPLATE_SUBFOLDER = process.env.HTML_TEMPLATE_SUBFOLDER || 'html/default';
const RESUME_LANGUAGE = process.env.RESUME_LANGUAGE || 'en';

const TAG_REF_V = process.env.TAG_REF_V;
const COMMIT_SHA = process.env.COMMIT_SHA;
const GITHUB_REPO_URL = `https://github.com/${process.env.GITHUB_REPO}`;

const resumeTemplatePath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, `resume.html`);
const resumeLangTemplateJSONPath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, 'lang', `${RESUME_LANGUAGE}.json`);
const resumeTemplateData = path.join(__dirname, `resume_${RESUME_LANGUAGE}.json`);
const resumeHtmlPath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, `diego.arce_resume_${RESUME_LANGUAGE}.html`);
const resumePdfPath = path.join(__dirname, `diego.arce_resume_${RESUME_LANGUAGE}.pdf`);

// Render resume to html
async function renderResumeHtml() {
  try {
    console.log(`Loading template file in memory.`);
    const templateSrc = await readFile(resumeTemplatePath, 'utf8');
    const langTemplateJsonStr = await readFile(resumeLangTemplateJSONPath, 'utf8');
    const dataStr = await readFile(resumeTemplateData, 'utf8');
    const templateLang = JSON.parse(langTemplateJsonStr);
    let data = JSON.parse(dataStr);

    // Keep only the last 5 jobs experience
    data.experience = data.experience.slice(0, 5);

    // Remove contributions for new resumes
    data.contributions = [];

    // Load compilation data
    if (TAG_REF_V && COMMIT_SHA && GITHUB_REPO_URL) {
      data = {
        ...data,
        build: {
          tagRef: TAG_REF_V,
          version: await extractVersionFromTagRef(TAG_REF_V),
          commitSha: COMMIT_SHA,
          repoUrl: GITHUB_REPO_URL
        }
      }
    }

    Handlebars.registerHelper('i18n', function (value) {
      if (templateLang[value]) return templateLang[value];
      else console.error(`Error mapping template 'i18n' variable for value: ${value}.`);
    });

    const template = Handlebars.compile(templateSrc);

    const generatedHtml = template(data);

    writeFile(resumeHtmlPath, generatedHtml);
    return
  } catch (err) {
    console.error(err.message);
    return Promise.reject(`Could not render resume template. Template path: ${resumeTemplatePath}. Lang data path: ${resumeLangTemplateJSONPath}. Data path: ${resumeTemplateData}`);
  }
}

async function extractVersionFromTagRef(tagRef) {
  try {
    const rExp = /^([A-Z]+)\/([A-Z]+)\/(v([0-9]+)\.([0-9]+)\.([0-9]+)(?:\.[0-9]+)?)/gi;
    const tagRefArray = rExp.exec(tagRef);
    if (!tagRefArray) throw new Error('Incorrect git Tag Ref. Expected to be format: \'refs/tags/v0.0.1\'');
    return tagRefArray[3];
  } catch (err) {
    console.error(err.message);
    return tagRef;
  }
}

// Generate pdf from html
async function generateResumePdf(htmlPath) {
  try {
    console.log(`Starting PDF generation`);
    puppeteerOpts = {};
    if (USE_LOCAL_CHROME === 'true') {
      const args = [];
      args.push('--no-sandbox');
      args.push('--ignore-certificate-errors');
      puppeteerOpts = {
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ignoreHTTPSErrors: true,
        args
      };
    }
    const browser = await puppeteer.launch(puppeteerOpts);
    const page = await browser.newPage()
    await page.goto(`file:${htmlPath}`, {
      waitUntil: 'networkidle0'
    });
    // We use pdf function to generate the resumePdfPath.
    await page.pdf({
      path: resumePdfPath,
      printBackground: true,
      format: 'Letter'
    })
    await browser.close();
    console.log("PDF Generated")
  } catch (err) {
    console.error(err);
    return Promise.reject(`Could not generate resume pdf. HTML path: ${resumeTemplatePath}. PDF path: ${resumeTemplateData}`);
  }
}

console.log('Start process');
renderResumeHtml().then(_ => {
  return generateResumePdf(resumeHtmlPath);
}).then(_ => {
  console.log('Process completed');
}).catch(err => {
  console.error(err);
  console.log('Process failed');
});