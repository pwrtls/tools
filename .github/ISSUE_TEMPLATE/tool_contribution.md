---
name: Tool contribution
description: Propose a new tool for Power Tools
title: "[Tool]: "
labels: ["tool-contribution", "needs-review"]
body:
  - type: markdown
    attributes:
      value: |
        🎉 Thank you for considering contributing a new tool to Power Tools! New tools help expand the capabilities available to the Power Platform community.

        Before submitting, please review our [Contributing Guide](CONTRIBUTING.md) and [Development Guide](DEVELOPMENT.md).

  - type: input
    id: tool-name
    attributes:
      label: Tool name
      description: What should your tool be called?
      placeholder: my-awesome-tool
    validations:
      required: true

  - type: textarea
    id: tool-description
    attributes:
      label: Tool description
      description: Provide a clear, concise description of what your tool does and who it helps.
      placeholder: This tool helps [target users] [solve problem] by [key functionality].
    validations:
      required: true

  - type: dropdown
    id: tool-category
    attributes:
      label: Tool category
      description: What category best describes your tool?
      options:
        - Data Management (import/export, migration)
        - Development Tools (debugging, testing)
        - Analytics & Reporting (audit logs, metrics)
        - Administration (user management, security)
        - Integration (connectors, APIs)
        - Productivity (automation, workflows)
        - Visualization (charts, dashboards)
        - Other (please specify in description)
    validations:
      required: true

  - type: dropdown
    id: powerplatform-services
    attributes:
      label: Power Platform services used
      description: Which Power Platform services does your tool interact with? (Select all that apply)
      multiple: true
      options:
        - Dataverse / CDS
        - Power Apps
        - Power Automate
        - Power BI
        - Power Pages
        - Power Virtual Agents
        - Admin APIs
        - Power Query
        - Other (please specify in description)
    validations:
      required: true

  - type: textarea
    id: key-features
    attributes:
      label: Key features
      description: List the main features and capabilities of your tool.
      placeholder: |
        - Feature 1: Brief description
        - Feature 2: Brief description
        - Feature 3: Brief description
      render: markdown
    validations:
      required: true

  - type: dropdown
    id: tech-stack
    attributes:
      label: Technology stack
      description: What technologies will you use to build this tool?
      multiple: true
      options:
        - React
        - TypeScript
        - Svelte
        - JavaScript
        - jQuery
        - Ant Design
        - Other (please specify in description)
    validations:
      required: true

  - type: textarea
    id: target-audience
    attributes:
      label: Target audience
      description: Who is the primary audience for this tool?
      placeholder: This tool is designed for [user roles] such as administrators, developers, analysts, etc.
    validations:
      required: true

  - type: textarea
    id: similar-tools
    attributes:
      label: Similar tools or alternatives
      description: Are there existing tools (in XrmToolBox or elsewhere) that do something similar? How is yours different?
      placeholder: There are existing tools like [tool name] that do [similar function], but mine [differentiation].

  - type: textarea
    id: development-plan
    attributes:
      label: Development plan
      description: Briefly outline your plan for developing and testing this tool.
      placeholder: |
        1. Set up basic React/TypeScript project structure
        2. Implement core functionality
        3. Add UI components and styling
        4. Test with Power Platform environments
        5. Add documentation and examples
      render: markdown
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: Before submitting
      description: Please ensure you've completed these steps before submitting your tool proposal.
      options:
        - label: I have read the Contributing Guide and Development Guide
          required: true
        - label: I understand Power Tools' architecture and integration requirements
          required: true
        - label: I have considered the tool's fit with the project's goals and community needs
          required: true
        - label: I am committed to maintaining this tool after it's added
          required: true
        - label: I am willing to collaborate with the community on this tool's development
          required: true
---

