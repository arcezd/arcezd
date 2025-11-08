const fs = require("fs"),
  path = require("path"),
  puppeteer = require("puppeteer"),
  Handlebars = require("handlebars"),
  utils = require("util"),
  readFile = utils.promisify(fs.readFile),
  writeFile = utils.promisify(fs.writeFile);

require("dotenv").config();

const USE_LOCAL_CHROME = process.env.USE_LOCAL_CHROME || "false";

const HTML_TEMPLATE_SUBFOLDER =
  process.env.HTML_TEMPLATE_SUBFOLDER || "html/default";
const RESUME_LANGUAGE = process.env.RESUME_LANGUAGE || "en-US";

const TAG_REF_V = process.env.TAG_REF_V;
const COMMIT_SHA = process.env.COMMIT_SHA;
const GITHUB_REPO_URL = process.env.GITHUB_REPO_URL;

const resumeTemplatePath = path.join(
  __dirname,
  HTML_TEMPLATE_SUBFOLDER,
  `resume.html`
);
const resumeLangTemplateJSONPath = path.join(
  __dirname,
  HTML_TEMPLATE_SUBFOLDER,
  "lang",
  `${RESUME_LANGUAGE}.json`
);
const resumeTemplateData = path.join(
  __dirname,
  `resume_${RESUME_LANGUAGE}.json`
);
const resumeHtmlPath = path.join(
  __dirname,
  HTML_TEMPLATE_SUBFOLDER,
  `diego.arce_resume_${RESUME_LANGUAGE}.html`
);
const resumePdfPath = path.join(
  __dirname,
  `diego.arce_resume_${RESUME_LANGUAGE}.pdf`
);

// Render resume to html
async function renderResumeHtml() {
  try {
    console.log(`Loading template file in memory.`);
    const templateSrc = await readFile(resumeTemplatePath, "utf8");
    const langTemplateJsonStr = await readFile(
      resumeLangTemplateJSONPath,
      "utf8"
    );
    const dataStr = await readFile(resumeTemplateData, "utf8");
    const templateLang = JSON.parse(langTemplateJsonStr);
    let data = JSON.parse(dataStr);

    // keep only the last 5 jobs experience
    data.experience = data.experience.slice(0, 5);

    // keep only the last 5 jobs experience
    data.experience = data.experience.slice(0, 5);

    // remove contributions for new resumes
    data.contributions = [];

    // remove projects for new resumes
    data.projects = [];

    // remove education for new resumes
    data.education = [];

    // show only the last 5 skills
    if (data.skills && data.skills.languages)
      data.skills.languages = data.skills.languages.slice(0, 5);
    if (data.skills && data.skills.frameworks)
      data.skills.frameworks = data.skills.frameworks.slice(0, 5);
    if (data.skills && data.skills.other)
      data.skills.other = data.skills.other.slice(0, 5);

    // load compilation data
    if (TAG_REF_V && COMMIT_SHA && GITHUB_REPO_URL) {
      data = {
        ...data,
        build: {
          tagRef: TAG_REF_V,
          version: await extractVersionFromTagRef(TAG_REF_V),
          commitSha: COMMIT_SHA,
          repoUrl: GITHUB_REPO_URL,
        },
      };
    }

    Handlebars.registerHelper("i18n", function (value) {
      if (templateLang[value]) return templateLang[value];
      else
        console.error(
          `Error mapping template 'i18n' variable for value: ${value}.`
        );
    });

    Handlebars.registerHelper("monthYearDate", function (value) {
      if (value) {
        // check if date is in ISO8601 format
        if (!isNaN(Date.parse(value))) {
          const date = new Date(value);
          // parse date to short format
          shortDate = date.toLocaleDateString(RESUME_LANGUAGE, {
            year: "numeric",
            month: "short",
          });
          return shortDate;
        } else if (
          value.toLowerCase() === "today" ||
          value.toLowerCase() === "actual"
        ) {
          return value;
        } else
          console.error(
            `Error mapping template 'shortDate' variable for value: ${value}.`
          );
      } else console.error(`Error mapping template 'shortDate' variable for value: ${value}.`);
    });

    Handlebars.registerHelper("shortDate", function (value) {
      if (value) {
        // check if date is in ISO8601 format
        if (!isNaN(Date.parse(value))) {
          const date = new Date(value);
          // parse date to short format dd/MM/YY
          dateString = date.toLocaleDateString(RESUME_LANGUAGE, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          return dateString;
        } else
          console.error(
            `Error mapping template 'shortDate' variable for value: ${value}.`
          );
      } else console.error(`Error mapping template 'shortDate' variable for value: ${value}.`);
    });

    Handlebars.registerHelper("onlyYearDate", function (value) {
      if (value) {
        // check if date is in ISO8601 format
        if (!isNaN(Date.parse(value))) {
          const date = new Date(value);
          // parse date to format year/month
          dateString = date.toLocaleDateString(RESUME_LANGUAGE, {
            year: "numeric",
          });
          return dateString;
        } else
          console.error(
            `Error mapping template 'onlyYear' variable for value: ${value}.`
          );
      } else console.error(`Error mapping template 'onlyYear' variable for value: ${value}.`);
        }
        else console.error(`Error mapping template 'onlyYear' variable for value: ${value}.`);
      }
      else console.error(`Error mapping template 'onlyYear' variable for value: ${value}.`);
    });

    const template = Handlebars.compile(templateSrc);

    const generatedHtml = template(data);

    writeFile(resumeHtmlPath, generatedHtml);
    return;
  } catch (err) {
    console.error(err.message);
    return Promise.reject(
      `Could not render resume template. Template path: ${resumeTemplatePath}. Lang data path: ${resumeLangTemplateJSONPath}. Data path: ${resumeTemplateData}`
    );
  }
}

// extract version from tag ref
async function extractVersionFromTagRef(tagRef) {
  try {
    const rExp =
      /^([A-Z]+)\/([A-Z]+)\/(v([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[a-z]+\.[0-9]+)?)/gi;
    const tagRefArray = rExp.exec(tagRef);
    if (!tagRefArray)
      throw new Error(
        "Incorrect git Tag Ref. Expected to be format: 'refs/tags/v0.0.1' or 'refs/tags/v0.0.1-beta.1'"
      );
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
    if (USE_LOCAL_CHROME === "true") {
      const args = [];
      args.push("--no-sandbox");
      args.push("--ignore-certificate-errors");
      puppeteerOpts = {
        headless: false,
        executablePath:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ignoreHTTPSErrors: true,
        args,
      };
    } else {
      puppeteerOpts = {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };
    }
    const browser = await puppeteer.launch(puppeteerOpts);
    const page = await browser.newPage();
    await page.goto(`file:${htmlPath}`, {
      waitUntil: "networkidle0",
    });
    // We use pdf function to generate the resumePdfPath.
    await page.pdf({
      path: resumePdfPath,
      printBackground: true,
      format: "Letter",
    });
    await browser.close();
    console.log("PDF Generated");
  } catch (err) {
    console.error(err);
    return Promise.reject(
      `Could not generate resume pdf. HTML path: ${resumeTemplatePath}. PDF path: ${resumeTemplateData}`
    );
  }
}

console.log("Start process");
renderResumeHtml()
  .then((_) => {
    return generateResumePdf(resumeHtmlPath);
  })
  .then((_) => {
    console.log("Process completed");
  })
  .catch((err) => {
    console.error(err);
    console.log("Process failed");
  });
