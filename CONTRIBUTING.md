# Contributing to OpenDataBD

Thank you for helping improve OpenDataBD. Contributions involving code, documentation, testing, accessibility, design, and dataset discovery are welcome.

## Before You Start

1. Review the open GitHub Issues.
2. Comment on the issue you want to work on.
3. Wait for assignment or confirmation before starting major changes.
4. For substantial new features, open an issue for discussion first.

## Development Setup

1. Fork this repository.
2. Clone your fork.
3. Create a new branch:

```bash
git checkout -b feature/short-description

4. Install the project dependencies:
npm install

5. Start the local Vercel development environment:
npx vercel dev

Contribution Guidelines
- Keep each pull request focused on one issue.
- Use clear commit messages.
- Follow the existing HTML, CSS, and JavaScript style.
- Test changes on desktop and mobile.
- Do not commit passwords, API keys, service-role keys, access tokens, or .env files.
- Do not include copyrighted or restricted datasets without permission.
- Update documentation when behavior changes.
- Include screenshots for visual changes.
- Reference the related issue in the pull request.
Pull Requests
Your pull request should include:
- A clear summary of the changes
- The related issue number
- Testing steps and results
- Screenshots for interface changes
- Any database or configuration changes
- Any known limitations
Use Closes #ISSUE_NUMBER in the pull-request description when the contribution fully resolves an issue.
Dataset Contributions
Dataset contributions must include:
- Original source
- License or usage terms
- Clear description
- Collection methodology
- Geographic coverage
- Temporal coverage
- File format information
Dataset licenses are separate from the MIT License that covers the OpenDataBD source code.
Security
Do not publicly disclose security vulnerabilities through regular GitHub Issues. Contact the project maintainer privately so the problem can be investigated safely.
Code of Conduct
Be respectful, constructive, and inclusive when participating in the OpenDataBD community.
