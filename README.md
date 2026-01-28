## Resumed Helper CLI

Interactive command line tool to generate tailored resumes from a single `resume.json`, and then export them with the [`resumed`](https://www.npmjs.com/package/resumed) CLI.

It lets you:
- **Select which contact / basics fields to include** (name, label, email, phone, website, summary, location, profiles, and optionally street address).
- **Select sections** (Experiences, Education, Publications, Projects, Skills, Languages, Interests).
- **Select individual items** within list sections (e.g. specific jobs, schools, projects).
- **Generate a filtered `resume.generated.json`** containing only what you selected.
- **Detect globally installed `jsonresume-theme-*` packages**, let you pick one, and
- **Export the filtered resume with `resumed`** to a PDF file.

### Prerequisites

- **Node.js** (v21+ recommended)
- **npm**
- **A valid `resume.json`** in [JSON Resume](https://jsonresume.org/) format in the project root.
- **resumed CLI** installed globally:
  - `npm install -g resumed`
- At least one **JSON Resume theme** installed globally, e.g.:
  - `npm install -g jsonresume-theme-even`

### Installation

From the project root (the directory containing `package.json` and `resume.json`):

```bash
npm install
```

### Usage

Run the CLI from the project root:

```bash
npm start
```

or directly:

```bash
node index.js
```

If you prefer a global command:

```bash
npm install -g .
resumed-helper
