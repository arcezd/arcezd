const fs = require('fs'),
  path = require('path'),
  utils = require('util'),
  puppeteer = require('puppeteer'),
  readFile = utils.promisify(fs.readFile),
  writeFile = utils.promisify(fs.writeFile),
  Mustache = require('mustache');

const HTML_TEMPLATE_SUBFOLDER = process.env.HTML_TEMPLATE_SUBFOLDER || 'html';
const RESUME_LANGUAGE = process.env.HTML_TEMPLATE_SUBFOLDER || 'en';

const resumeTemplatePath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, 'resume.html');
const resumeTemplateData = path.join(__dirname, `resume_${RESUME_LANGUAGE}.json`);
const resumeHtmlPath = path.join(__dirname, HTML_TEMPLATE_SUBFOLDER, `diego.arce_resume_${RESUME_LANGUAGE}.html`);
const resumePdfPath = path.join(__dirname, `diego.arce_resume_${RESUME_LANGUAGE}.pdf`);

async function renderResumeHtml() {
  try {
    console.log(`Loading template file in memory.`);
    const template = await readFile(resumeTemplatePath, 'utf8');
    const data = await readFile(resumeTemplateData, 'utf8');
    const generatedHtml = Mustache.render(template, JSON.parse(data));
    writeFile(resumeHtmlPath, generatedHtml);
    return
  } catch (err) {
    console.error(err);
    return Promise.reject(`Could not render resume template. Template path: ${resumeTemplatePath}. Data path: ${resumeTemplateData}`);
  }
}

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