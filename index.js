#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const util = require('util');
const { exec } = require('child_process');

const execAsync = util.promisify(exec);

async function loadResume(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = await fs.promises.readFile(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function buildSections(resume) {
  const sections = [];

  if (Array.isArray(resume.work) && resume.work.length) {
    sections.push({
      key: 'work',
      label: 'Experiences',
      type: 'array',
      items: resume.work.map((w, index) => ({
        id: `work-${index}`,
        index,
        label: `${w.position || 'Role'} @ ${w.name || 'Company'}`
      }))
    });
  }

  if (Array.isArray(resume.education) && resume.education.length) {
    sections.push({
      key: 'education',
      label: 'Education',
      type: 'array',
      items: resume.education.map((e, index) => ({
        id: `education-${index}`,
        index,
        label: `${e.studyType || 'Study'} in ${e.area || 'Area'} @ ${e.institution || 'Institution'}`
      }))
    });
  }

  if (Array.isArray(resume.publications) && resume.publications.length) {
    sections.push({
      key: 'publications',
      label: 'Publications',
      type: 'array',
      items: resume.publications.map((p, index) => ({
        id: `publications-${index}`,
        index,
        label: `${p.name || 'Publication'} (${p.publisher || 'Publisher'})`
      }))
    });
  }

  if (Array.isArray(resume.projects) && resume.projects.length) {
    sections.push({
      key: 'projects',
      label: 'Projects',
      type: 'array',
      items: resume.projects.map((p, index) => ({
        id: `projects-${index}`,
        index,
        label: `${p.name || 'Project'} (${p.type || 'Project'})`
      }))
    });
  }

  if (Array.isArray(resume.skills) && resume.skills.length) {
    sections.push({
      key: 'skills',
      label: 'Skills',
      type: 'array',
      items: resume.skills.map((s, index) => ({
        id: `skills-${index}`,
        index,
        label: `${s.name || 'Skill'} (${s.level || 'level unknown'})`
      }))
    });
  }

  if (Array.isArray(resume.languages) && resume.languages.length) {
    sections.push({
      key: 'languages',
      label: 'Languages',
      type: 'array',
      items: resume.languages.map((l, index) => ({
        id: `languages-${index}`,
        index,
        label: `${l.language || 'Language'} – ${l.fluency || 'fluency unknown'}`
      }))
    });
  }

  if (Array.isArray(resume.interests) && resume.interests.length) {
    sections.push({
      key: 'interests',
      label: 'Interests',
      type: 'array',
      items: resume.interests.map((i, index) => ({
        id: `interests-${index}`,
        index,
        label: i.name || 'Interest'
      }))
    });
  }

  return sections;
}

function buildFilteredResume(resume, sectionsSelection, itemsSelectionBySection, basicsOptions) {
  const result = {};

  // Handle basics / contacts first, based on fine-grained selections
  if (resume.basics && basicsOptions) {
    const basics = resume.basics;
    const filteredBasics = {};

    if (basicsOptions.includeName && basics.name) {
      filteredBasics.name = basics.name;
    }

    if (basicsOptions.includeLabel && basics.label) {
      filteredBasics.label = basics.label;
    }

    if (basicsOptions.includeImage && basics.image) {
      filteredBasics.image = basics.image;
    }

    if (basicsOptions.includeEmail && basics.email) {
      filteredBasics.email = basics.email;
    }

    if (basicsOptions.includePhone && basics.phone) {
      filteredBasics.phone = basics.phone;
    }

    if (basicsOptions.includeUrl && basics.url) {
      filteredBasics.url = basics.url;
    }

    if (basicsOptions.includeSummary && basics.summary) {
      filteredBasics.summary = basics.summary;
    }

    if (basicsOptions.includeLocation && basics.location) {
      const location = { ...basics.location };

      // If we are not including street address, strip detailed address info
      if (!basicsOptions.includeStreetAddress) {
        delete location.address;
        delete location.postalCode;
      }

      filteredBasics.location = location;
    }

    if (Array.isArray(basics.profiles) && basics.profiles.length) {
      const selectedProfileIndexes = basicsOptions.selectedProfileIndexes || new Set();
      const selectedProfiles = basics.profiles.filter((_, index) =>
        selectedProfileIndexes.has(index)
      );
      if (selectedProfiles.length) {
        filteredBasics.profiles = selectedProfiles;
      }
    }

    if (Object.keys(filteredBasics).length > 0) {
      result.basics = filteredBasics;
    }
  }

  for (const section of sectionsSelection) {
    const key = section.key;
    const original = resume[key];

    if (section.type === 'array') {
      const selectedIndexes = itemsSelectionBySection[key] || new Set();

      result[key] = original.filter((_, index) => selectedIndexes.has(index));
    }
  }

  return result;
}

async function getGlobalJsonResumeThemes() {
  try {
    const { stdout } = await execAsync('npm ls -g --depth=0 --json');
    const parsed = JSON.parse(stdout || '{}');
    const deps = parsed.dependencies || {};
    const allNames = Object.keys(deps);
    return allNames.filter((name) => name.startsWith('jsonresume-theme-')).sort();
  } catch (err) {
    console.error('Unable to detect global jsonresume-theme-* packages:', err.message);
    return [];
  }
}

async function ensureResumedInstalled() {
  try {
    await execAsync('resumed --version');
    return true;
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const looksMissing =
      err.code === 'ENOENT' ||
      /not recognized as an internal or external command/i.test(message) ||
      /command not found/i.test(message);

    if (looksMissing) {
      console.error('The "resumed" CLI does not appear to be installed globally.');
      console.error('Please install it with: npm install -g resumed');
    } else {
      console.error('Error while checking for the "resumed" CLI:', message);
    }
    return false;
  }
}

async function main() {
  try {
    const resume = await loadResume('resume.json');
    const sections = buildSections(resume);
    const basicsPresent = !!resume.basics;

    const basicsOptions = {
      includeName: true,
      includeLabel: true,
      includeImage: false,
      includeEmail: true,
      includePhone: true,
      includeUrl: true,
      includeSummary: true,
      includeLocation: true,
      includeStreetAddress: true,
      selectedProfileIndexes: new Set()
    };

    // First, let the user choose which parts of basics/contacts to include
    if (basicsPresent) {
      const basics = resume.basics;
      const basicsChoices = [];

      if (basics.name) {
        basicsChoices.push({
          title: `Name: ${basics.name}`,
          value: 'name',
          selected: true
        });
      }
      if (basics.label) {
        basicsChoices.push({
          title: `Label: ${basics.label}`,
          value: 'label',
          selected: true
        });
      }
      if (basics.image) {
        basicsChoices.push({
          title: 'Image',
          value: 'image',
          selected: false
        });
      }
      if (basics.email) {
        basicsChoices.push({
          title: `Email: ${basics.email}`,
          value: 'email',
          selected: true
        });
      }
      if (basics.phone) {
        basicsChoices.push({
          title: `Phone: ${basics.phone}`,
          value: 'phone',
          selected: true
        });
      }
      if (basics.url) {
        basicsChoices.push({
          title: `Website: ${basics.url}`,
          value: 'url',
          selected: true
        });
      }
      if (basics.summary) {
        basicsChoices.push({
          title: 'Summary',
          value: 'summary',
          selected: true
        });
      }
      if (basics.location) {
        const { city, region, countryCode, address } = basics.location;
        const locSummaryParts = [city, region, countryCode].filter(Boolean);
        const locSummary = locSummaryParts.length ? ` (${locSummaryParts.join(', ')})` : '';

        // General location (city/region/country)
        basicsChoices.push({
          title: `Location${locSummary}`,
          value: 'location',
          selected: true
        });

        // Separate checkbox for full street address, if present
        if (address) {
          basicsChoices.push({
            title: `Street address: ${address}`,
            value: 'locationAddress',
            selected: true
          });
        }
      }
      if (Array.isArray(basics.profiles) && basics.profiles.length) {
        basics.profiles.forEach((profile, index) => {
          const titleParts = [];
          if (profile.network) titleParts.push(profile.network);
          if (profile.username) titleParts.push(profile.username);
          if (profile.url) titleParts.push(profile.url);
          const title = titleParts.length
            ? `Profile: ${titleParts.join(' – ')}`
            : `Profile #${index + 1}`;

          basicsChoices.push({
            title,
            value: `profile-${index}`,
            selected: true
          });
        });
      }

      if (basicsChoices.length) {
        const { selectedBasics } = await prompts({
          type: 'multiselect',
          name: 'selectedBasics',
          message: 'Select which contact details to include',
          instructions: false,
          choices: basicsChoices
        });

        if (!selectedBasics) {
          console.log('No contact details selection made. Exiting.');
          process.exit(0);
        }

        basicsOptions.includeName = selectedBasics.includes('name');
        basicsOptions.includeLabel = selectedBasics.includes('label');
        basicsOptions.includeImage = selectedBasics.includes('image');
        basicsOptions.includeEmail = selectedBasics.includes('email');
        basicsOptions.includePhone = selectedBasics.includes('phone');
        basicsOptions.includeUrl = selectedBasics.includes('url');
        basicsOptions.includeSummary = selectedBasics.includes('summary');
        basicsOptions.includeLocation = selectedBasics.includes('location');
        basicsOptions.includeStreetAddress = selectedBasics.includes('locationAddress');

        const profileIndexes = new Set();
        selectedBasics
          .filter((v) => v.startsWith('profile-'))
          .forEach((v) => {
            const index = Number.parseInt(v.replace('profile-', ''), 10);
            if (!Number.isNaN(index)) {
              profileIndexes.add(index);
            }
          });
        basicsOptions.selectedProfileIndexes = profileIndexes;

        // If no explicit street address choice but we have location without address, disable street address
        if (
          !selectedBasics.includes('locationAddress') ||
          !basics.location ||
          !Object.prototype.hasOwnProperty.call(basics.location, 'address')
        ) {
          basicsOptions.includeStreetAddress = false;
        }
      }
    }

    if (!sections.length) {
      console.error('No recognizable sections found in resume.json.');
      process.exit(1);
    }

    const sectionChoices = sections.map((section) => ({
      title: section.label,
      value: section.key,
      selected: true
    }));

    const { selectedSections } = await prompts({
      type: 'multiselect',
      name: 'selectedSections',
      message: 'Select sections to include in the generated resume',
      instructions: false,
      choices: sectionChoices
    });

    if (!selectedSections || !selectedSections.length) {
      console.log('No sections selected. Exiting without generating a resume.');
      process.exit(0);
    }

    const activeSections = sections.filter((s) => selectedSections.includes(s.key));

    const itemsSelectionBySection = {};

    for (const section of activeSections) {
      if (section.type !== 'array') {
        continue;
      }

      const choices = section.items.map((item) => ({
        title: item.label,
        value: item.index,
        selected: true
      }));

      const { selectedItems } = await prompts({
        type: 'multiselect',
        name: 'selectedItems',
        message: `Select items to include from ${section.label}`,
        instructions: false,
        choices
      });

      if (!selectedItems || !selectedItems.length) {
        // If no items selected within a chosen section, that section becomes empty.
        itemsSelectionBySection[section.key] = new Set();
      } else {
        itemsSelectionBySection[section.key] = new Set(selectedItems);
      }
    }

    const filteredResume = buildFilteredResume(
      resume,
      activeSections,
      itemsSelectionBySection,
      basicsOptions
    );

    const { outputPath } = await prompts({
      type: 'text',
      name: 'outputPath',
      message: 'Path for generated resume JSON',
      initial: 'resume.generated.json'
    });

    const finalOutputPath = path.resolve(process.cwd(), outputPath || 'resume.generated.json');
    await fs.promises.writeFile(finalOutputPath, JSON.stringify(filteredResume, null, 2), 'utf8');

    console.log(`Generated resume written to: ${finalOutputPath}`);

    // After generating the shorter resume, let the user pick a jsonresume theme for export via resumed.
    const themes = await getGlobalJsonResumeThemes();

    if (!themes.length) {
      console.log(
        'No global jsonresume-theme-* packages found. Install one globally, e.g. "npm install -g jsonresume-theme-even", then re-run this tool.'
      );
      return;
    }

    const { selectedTheme } = await prompts({
      type: 'select',
      name: 'selectedTheme',
      message: 'Select a jsonresume theme to use when exporting with resumed',
      choices: themes.map((name) => ({ title: name, value: name }))
    });

    if (!selectedTheme) {
      console.log('No theme selected. You can run the export manually later with "resumed".');
      return;
    }

    console.log(`Selected theme: ${selectedTheme}`);

    const hasResumed = await ensureResumedInstalled();
    if (!hasResumed) {
      console.log(
        'Cannot continue with export because "resumed" is not available. Please install it globally and re-run.'
      );
      return;
    }

    const { exportPath } = await prompts({
      type: 'text',
      name: 'exportPath',
      message: 'Path for exported resume file (PDF, handled by resumed)',
      initial: 'resume.pdf'
    });

    const finalExportPath = path.resolve(
      process.cwd(),
      exportPath && exportPath.trim().length ? exportPath.trim() : 'resume.pdf'
    );

    console.log(`Exporting resume with resumed to: ${finalExportPath}`);

    try {
      // Use "export" alias for "render" so we can pass input file and options.
      const cmd = `resumed export "${finalOutputPath}" --theme "${selectedTheme}" --output "${finalExportPath}"`;
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout && stdout.trim()) {
        console.log(stdout.trim());
      }
      if (stderr && stderr.trim()) {
        console.error(stderr.trim());
      }
      console.log(`Resume successfully exported to: ${finalExportPath}`);
    } catch (err) {
      console.error('Failed to export resume with resumed:', err.message);
      console.error(
        'You can try running the command manually:',
        `resumed export "${finalOutputPath}" --theme "${selectedTheme}" --output "${finalExportPath}"`
      );
    }
  } catch (err) {
    console.error('Error while generating resume:', err.message);
    process.exit(1);
  }
}

main();


