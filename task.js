const fs = require('fs'),
  path = require('path'),
  utils = require('util'),
  puppeteer = require('puppeteer'),
  readFile = utils.promisify(fs.readFile),
  writeFile = utils.promisify(fs.writeFile),
  Mustache = require('mustache');

require('dotenv').config();

const HTML_TEMPLATE_SUBFOLDER = process.env.HTML_TEMPLATE_SUBFOLDER || 'default';
const RESUME_LANGUAGE = process.env.RESUME_LANGUAGE || 'en';

const TAG_REF_V = process.env.TAG_REF_V;
const COMMIT_SHA = process.env.COMMIT_SHA;
const GITHUB_REPO_URL = `https://github.com/${process.env.GITHUB_REPO}`;

const resumeTemplatePath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, `resume_${RESUME_LANGUAGE}.html`);
const resumeTemplateData = path.join(__dirname, `resume_${RESUME_LANGUAGE}.json`);
const resumeHtmlPath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, `diego.arce_resume_${RESUME_LANGUAGE}.html`);
const resumePdfPath = path.join(__dirname, `diego.arce_resume_${RESUME_LANGUAGE}.pdf`);

// Render resume to html
async function renderResumeHtml() {
  try {
    console.log(`Loading template file in memory.`);
    const template = await readFile(resumeTemplatePath, 'utf8');
    const dataStr = await readFile(resumeTemplateData, 'utf8');
    let data = JSON.parse(dataStr);
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
    const generatedHtml = Mustache.render(template, data);
    writeFile(resumeHtmlPath, generatedHtml);
    return
  } catch (err) {
    console.error(err);
    return Promise.reject(`Could not render resume template. Template path: ${resumeTemplatePath}. Data path: ${resumeTemplateData}`);
  }
}

async function extractVersionFromTagRef(tagRef) {
  try {
    const rExp = /^\/([A-Z]+)\/([A-Z]+)\/(v([0-9]+)\.([0-9]+)\.([0-9]+)(?:\.[0-9]+)?)/gi;
    const tagRefArray = rExp.exec(tagRef);
    return tagRefArray[3];
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Generate pdf from html
async function generateResumePdf(htmlPath) {
  try {
    console.log(`Starting PDF generation`);
    const browser = await puppeteer.launch();
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