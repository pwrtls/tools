---
name: Feature request
description: Suggest an idea for Power Tools
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thank you for suggesting a new feature! Feature requests help us understand what the community needs and guide the future development of Power Tools.

  - type: textarea
    id: problem-description
    attributes:
      label: Is your feature request related to a problem?
      description: Please describe the problem you're trying to solve. This helps us understand the context and importance.
      placeholder: I'm always frustrated when [problem description]. It would be great if [solution approach].
    validations:
      required: true

  - type: textarea
    id: solution-description
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
      placeholder: I would like [feature description] so that [benefit/use case].
    validations:
      required: true

  - type: textarea
    id: alternatives-considered
    attributes:
      label: Describe alternatives you've considered
      description: Have you explored any alternative solutions or workarounds?
      placeholder: I've tried [alternative approach], but it [limitations/issues].

  - type: dropdown
    id: tool-scope
    attributes:
      label: Which tool or area should this feature be added to?
      description: Select the primary tool or framework area this feature relates to.
      options:
        - Core Framework (authentication, API, etc.)
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
        - New tool (please specify in description)
    validations:
      required: true

  - type: dropdown
    id: feature-type
    attributes:
      label: Feature type
      description: What type of feature is this?
      options:
        - New functionality
        - UI/UX improvement
        - Performance enhancement
        - Integration/API addition
        - Documentation/tooling
        - Bug fix pattern
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context, mockups, or examples that would help illustrate your feature request.
      placeholder: Include screenshots, diagrams, or links to similar features in other tools.

  - type: textarea
    id: implementation-suggestions
    attributes:
      label: Implementation suggestions (optional)
      description: If you have thoughts on how this could be implemented, please share them.
      placeholder: This could be implemented by [technical approach] or using [specific technology/library].

  - type: checkboxes
    id: checklist
    attributes:
      label: Before submitting
      description: Please ensure you've completed these steps before submitting your feature request.
      options:
        - label: I have checked existing issues and discussions for similar requests
          required: true
        - label: I have provided a clear description of the problem and solution
          required: true
        - label: I have considered how this fits with Power Tools' goals and architecture
          required: true
        - label: I am willing to help with implementation or testing if needed
          required: false
---

