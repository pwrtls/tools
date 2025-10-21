---
name: Bug report
description: Create a report to help us improve
title: "[Bug]: "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report! Please provide as much detail as possible to help us understand and fix the issue.

  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
      placeholder: When I try to [action], [unexpected behavior] happens instead of [expected behavior].
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: Please provide step-by-step instructions to reproduce the issue.
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
      render: bash
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected behavior
      description: What did you expect to happen?
      placeholder: The tool should [expected behavior] when [condition].
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: Actual behavior
      description: What actually happened?
      placeholder: Instead, [actual behavior] occurred.
    validations:
      required: true

  - type: dropdown
    id: tool-name
    attributes:
      label: Which tool is affected?
      description: Select the Power Tools tool where you encountered this bug.
      options:
        - query-builder
        - dataflow-manager
        - metadata-explorer
        - plugin-trace-viewer
        - power-audit
        - solution-manager
        - solutions-viewer
        - user-manager
        - webresources-viewer
        - PowerTool-FetchXMLBuilder
        - Other (please specify in description)
    validations:
      required: true

  - type: input
    id: powerplatform-version
    attributes:
      label: Power Platform version
      description: What version of Power Platform/Dataverse are you using? (e.g., Dataverse 9.2.12345)
      placeholder: Dataverse 9.2.x

  - type: input
    id: browser
    attributes:
      label: Browser (if applicable)
      description: Which browser are you using? Include version if known.
      placeholder: Chrome 120.0, Firefox 119.0, etc.

  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context about the problem here, such as screenshots, error messages, or related issues.
      placeholder: Screenshots, error logs, or additional details that might help us understand the issue.

  - type: checkboxes
    id: checklist
    attributes:
      label: Before submitting
      description: Please ensure you've completed these steps before submitting your bug report.
      options:
        - label: I have checked existing issues to avoid duplicates
          required: true
        - label: I have provided a clear description with steps to reproduce
          required: true
        - label: I have included expected vs actual behavior
          required: true
        - label: I am using a supported version of Power Tools
          required: true
---

