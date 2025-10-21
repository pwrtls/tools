# Contributing to Power Tools

Thank you for your interest in contributing to Power Tools! This document provides guidelines and instructions for contributing to our community-driven toolkit for Microsoft Power Platform developers and administrators.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Contribution Process](#contribution-process)
- [Development Guidelines](#development-guidelines)
- [Tool Development](#tool-development)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold these values:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be collaborative**: Work together to solve problems and improve the project
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different experience levels

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (LTS version recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **Code editor** (VS Code recommended)
- **Power Platform environment** for testing (optional but recommended)

### Repository Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/pwrtls.git
   cd pwrtls/tools
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/pwrtls/pwrtls.git
   ```
4. **Install dependencies** for the tools you'll be working on:
   ```bash
   cd your-tool-name
   npm install
   ```

## Contribution Process

### 1. Issue Creation

Before starting work, please:

- **Check existing issues** to avoid duplicates
- **Use clear, descriptive titles** and descriptions
- **Include relevant labels** (bug, enhancement, documentation, etc.)
- **Provide context** about the problem or feature request
- **Include steps to reproduce** for bug reports

### 2. Branch Management

- **Create feature branches** from `main`:
  ```bash
  git checkout main
  git pull upstream main
  git checkout -b feature/your-feature-name
  ```
- **Use descriptive branch names**:
  - `feature/tool-name` for new tools
  - `fix/tool-name-issue` for bug fixes
  - `docs/update-guide` for documentation
  - `refactor/tool-name` for refactoring

### 3. Development Workflow

1. **Make your changes** following the [Development Guidelines](#development-guidelines)
2. **Test thoroughly** using the [Testing Requirements](#testing-requirements)
3. **Update documentation** as needed
4. **Commit with clear messages**:
   ```bash
   git commit -m "feat(tool-name): add new feature"
   git commit -m "fix(tool-name): resolve issue with data loading"
   git commit -m "docs: update contributing guidelines"
   ```

### 4. Pull Request Process

When submitting a pull request:

- **Ensure your branch is up to date** with main
- **Write a clear description** of your changes
- **Reference related issues** using `Fixes #123` or `Closes #123`
- **Include screenshots** for UI changes
- **Add tests** for new functionality
- **Update documentation** as needed

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Local testing completed
- [ ] PowerTools integration tested
- [ ] No console errors
- [ ] Cross-browser compatibility verified

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Development Guidelines

### Architecture Overview

Power Tools are built as React applications that integrate with the PowerTools UI framework. Key principles:

- **Framework Integration**: Tools must use PowerTools Context for API access
- **Component Reuse**: Leverage shared UI components for consistency
- **Authentication**: Use framework-provided authentication
- **Context Management**: Utilize environment and user context

### Project Structure

Each tool should follow this structure:

```
tool-name/
├── src/
│   ├── index.tsx          # Entry point
│   ├── AppRouter.tsx      # Routing configuration
│   ├── models/            # TypeScript interfaces
│   ├── views/             # Main view components
│   ├── components/        # Reusable UI components
│   ├── api/               # API service functions
│   ├── powertools/        # Framework integration
│   └── utils/             # Utility functions
├── public/
│   └── index.html         # HTML template with PowerTools script
├── package.json           # Dependencies and scripts
└── README.md              # Tool documentation
```

## Tool Development

### Creating a New Tool

1. **Create tool directory**:
   ```bash
   mkdir tools/your-tool-name
   cd tools/your-tool-name
   ```

2. **Initialize React project**:
   ```bash
   npx create-react-app . --template typescript
   ```

3. **Install PowerTools dependencies**:
   ```bash
   npm install @ant-design/icons antd axios react-router-dom
   ```

4. **Add PowerTools integration** to `public/index.html`:
   ```html
   <head>
     <script src="../../src/powertools/powertools-api.js"></script>
   </head>
   ```

5. **Follow the project structure** outlined above

### PowerTools Integration Requirements

- **Use PowerTools Context** for all API calls
- **Implement proper error handling** for authentication failures
- **Follow UI/UX guidelines** for consistency
- **Test with real Power Platform environments**

### UI/UX Guidelines

- **Use Ant Design components** for consistency
- **Follow responsive design** principles
- **Implement proper loading states** and error handling
- **Ensure accessibility** compliance
- **Use consistent color scheme** and typography

## Code Standards

### TypeScript Guidelines

- **Use strict TypeScript** configuration
- **Define interfaces** for all data models
- **Use proper typing** for function parameters and returns
- **Avoid `any` types** unless absolutely necessary

### React Best Practices

- **Use functional components** with hooks
- **Implement proper state management**
- **Use React.memo** for performance optimization
- **Follow component composition** patterns

### Code Style

- **Use consistent indentation** (2 spaces)
- **Follow ESLint rules** and fix all warnings
- **Use meaningful variable names**
- **Add comments** for complex logic
- **Keep functions small** and focused

## Testing Requirements

### Local Testing

1. **Build and run locally**:
   ```bash
   npm start
   ```

2. **Test with PowerTools framework**:
   - Use development server for integration testing
   - Test with real Dynamics 365 environment
   - Verify authentication flows

3. **Check browser console** for errors
4. **Test responsive design** on different screen sizes

### Test Cases

- **Authentication**: Test with different user roles
- **API Integration**: Verify data retrieval and error handling
- **UI Components**: Test interaction patterns and edge cases
- **Performance**: Test with large datasets
- **Error Handling**: Test error scenarios and recovery

### Testing Checklist

- [ ] Tool loads without errors
- [ ] Authentication works correctly
- [ ] API calls succeed and fail gracefully
- [ ] UI components respond properly
- [ ] No console errors or warnings
- [ ] Responsive design works
- [ ] Accessibility features function

## Documentation

### Tool Documentation

Each tool must include:

- **README.md** with:
  - Tool description and purpose
  - Installation and setup instructions
  - Usage examples
  - API documentation
  - Troubleshooting guide

- **DEVELOPMENT.md** (for complex tools) with:
  - Architecture overview
  - Development setup
  - Testing procedures
  - Deployment instructions

### Code Documentation

- **Comment complex logic** and algorithms
- **Document API functions** with JSDoc comments
- **Include usage examples** in comments
- **Update documentation** when making changes

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community discussions
- **Documentation**: Check existing guides and examples
- **Code Review**: Learn from existing code and pull requests

### Recognition

Contributors will be recognized through:

- **Contributor credits** in tool documentation
- **GitHub contributor statistics**
- **Community highlights** in release notes
- **Special badges** for significant contributions

## Contributors

We thank all contributors who help make Power Tools better for the Power Platform community.

### Core Team

#### Project Maintainers
- **[@jaredhilton](https://github.com/jaredhilton)** - Project Lead, Architecture & Backend
- **[@username](https://github.com/username)** - Technical Lead, Frontend & UI
- **[@username](https://github.com/username)** - Community Lead, Documentation & Events

#### Core Contributors
- **[@username](https://github.com/username)** - Backend Development, API Design
- **[@username](https://github.com/username)** - Frontend Development, UI/UX
- **[@username](https://github.com/username)** - Plugin Framework, Developer Experience
- **[@username](https://github.com/username)** - Documentation, Community Support

### Recognition Levels

#### 🏆 Power Tools Champion
*Top contributors with significant impact*
- 50+ merged pull requests
- Major feature contributions
- Active community leadership
- Consistent long-term engagement

#### 🚀 Tool Builder
*Created successful plugins*
- Published plugin in marketplace
- Active maintenance and updates
- Community adoption and positive feedback
- Documentation and support

#### 📚 Documentation Master
*Major documentation contributions*
- Comprehensive guides and tutorials
- API documentation and examples
- Community resources and best practices
- Learning materials and onboarding

#### 🐛 Bug Slayer
*Found and fixed critical bugs*
- Identified security vulnerabilities
- Fixed performance issues
- Resolved compatibility problems
- Improved system reliability

#### 🎓 Mentor
*Helped new contributors*
- Guided new community members
- Provided technical assistance
- Created educational content
- Organized learning events

#### 🌟 Community Champion
*Active community engagement*
- Regular participation in discussions
- Event organization and participation
- Community advocacy and promotion
- Support and encouragement

### How to Get Recognized

#### Contributing Code
- Submit pull requests with bug fixes or features
- Follow coding standards and best practices
- Include tests and documentation
- Participate in code reviews

#### Creating Plugins
- Build useful tools for the Power Platform community
- Follow plugin development guidelines
- Provide comprehensive documentation
- Maintain and update your plugins

#### Improving Documentation
- Fix typos and improve clarity
- Add missing documentation
- Create tutorials and guides
- Translate documentation

#### Community Engagement
- Participate in discussions
- Help other contributors
- Organize or attend events
- Promote the project

#### Reporting Issues
- Report bugs with detailed information
- Suggest new features
- Provide feedback and suggestions
- Test new releases

### Recognition Process

Contributors are recognized based on:

- **Quality of contributions** - Code quality, documentation, tests
- **Community impact** - How contributions help the community
- **Consistency** - Regular and sustained contributions
- **Collaboration** - Working well with others
- **Leadership** - Helping others and driving initiatives

Recognition is updated monthly and contributors are notified of their achievements.

### Support Channels

- **GitHub Issues**: Technical problems and bugs
- **GitHub Discussions**: General questions and ideas
- **Pull Request Reviews**: Code feedback and suggestions
- **Documentation**: Self-service help and guides

## Release Process

### Version Management

- **Semantic versioning** (MAJOR.MINOR.PATCH)
- **Changelog updates** for each release
- **Release notes** highlighting new features
- **Migration guides** for breaking changes

### Quality Gates

Before release, tools must:

- [ ] Pass all tests
- [ ] Meet performance benchmarks
- [ ] Complete security review
- [ ] Update documentation
- [ ] Receive community feedback

## License

By contributing to Power Tools, you agree that your contributions will be licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Questions?

If you have questions about contributing:

1. **Check existing documentation** and issues
2. **Ask in GitHub Discussions** for general questions
3. **Create an issue** for specific problems
4. **Join community discussions** to connect with other contributors

Thank you for contributing to Power Tools! Together, we're building a powerful toolkit for the Power Platform community.

---

*This contributing guide is a living document. Please suggest improvements through issues or pull requests.*
