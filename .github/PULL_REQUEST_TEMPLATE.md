---
name: Pull Request
about: Propose changes to the codebase
title: 'feat: Add new feature'
labels: ''
assignees: ''
---

## Pull Request Description

Please provide a clear and concise description of the changes introduced by this pull request. Explain the **what** and **why** behind your changes.

**Closes #[issue_number]** (if applicable)

---

### Type of Change

Please check the type of change your PR introduces:

- [ ] Bugfix (A change that fixes an issue)
- [ ] New Feature (A change that adds new functionality)
- [ ] New Provider (A change that adds a new content provider)
- [ ] Code Style Update (Formatting, semicolons, etc.; no code change)
- [ ] Refactoring (A change that neither fixes a bug nor adds a feature)
- [ ] Build-related changes (Changes to build scripts, dependencies, etc.)
- [ ] Documentation Update (Changes to documentation files)
- [ ] Other (Please describe below)

### Breaking Change

Does this PR introduce a breaking change?

- [ ] Yes
- [ ] No

If 'Yes', please describe the impact and migration path for existing applications:

---

### How Has This Been Tested?

Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration.

- [ ] Unit tests (e.g., `yarn test`)
- [ ] Manual testing on:
    - [ ] iOS
    - [ ] Android
- [ ] Other (Please describe below)

**Test Configuration:**
- React Native Version: [e.g., 0.72.0]
- Device/Emulator: [e.g., iPhone 14 Pro, Android Emulator API 33]

---

### Screenshots / Gifs (Optional)

If your changes include UI updates or visual enhancements, please provide screenshots or GIFs here.

---

### PR Checklist

Before submitting your pull request, please ensure the following:

- [ ] My code follows the style guidelines of this project (run `yarn lint` and `yarn format`).
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have updated the documentation where necessary.
- [ ] My changes generate no new warnings or errors.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] All existing and new tests pass.
- [ ] I have run the build process (`yarn build`) and confirmed no issues.

---

### Further Comments / Notes (Optional)

Add any additional context or notes about the pull request here.