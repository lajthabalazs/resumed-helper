## Resumed Helper CLI

Interactive command line tool to generate tailored resumes from a single `resume.json`.

It lets you:
- **Select sections** (Contacts, Experiences, Education, Publications, Projects, Skills, Languages, Interests).
- **Select individual items** within list sections (e.g. specific jobs, schools, projects).
- **Generate a filtered `resume.generated.json`** containing only what you selected.

### Prerequisites

- **Node.js** (v16+ recommended)
- **npm**

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
```

### Interactive flow

1. **Load resume**
   - The tool reads `resume.json` from the current working directory.

2. **Select sections**
   - You see a list like:
     - Contacts
     - Experiences
     - Education
     - Publications
     - Projects
     - Skills
     - Languages
     - Interests
   - Use the arrow keys and space to toggle checkboxes.
   - Press **Enter** to confirm.

3. **Select items within sections**
   - For each selected list section (e.g. Experiences, Education, Projects, Skills, etc.), you get another multiselect listing all items in that section.
   - Again, use space to toggle items and Enter to confirm.
   - If you deselect all items in a chosen section, that section will be empty in the generated resume.

4. **Choose output file**
   - You are asked for an output path for the generated resume JSON.
   - Default: `resume.generated.json` in the current directory.

5. **Result**
   - The tool writes a filtered resume JSON containing only the selected sections and items.
   - Example message:
     - `Generated resume written to: C:\Users\you\projects\resumed-helper\resume.generated.json`


