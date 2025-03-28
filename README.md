# Git Analyzer

<!-- 
2025-03-28: Initial README update with project description, features, architecture, and setup instructions.
-->

A modern web application for analyzing Git repositories across multiple platforms (GitHub, GitLab, and Azure DevOps). This tool provides insights into repository health, commit patterns, pipeline performance, and contributor metrics to help teams improve their development practices.

## Features

- **Multi-Platform Support**: Connect to GitHub, GitLab, and Azure DevOps repositories
- **Repository Analytics**:
  - Commit analysis (frequency, code changes, description quality)
  - Pipeline performance (success rates, deployment frequency)
  - Branch health (stagnant branches, protection status)
  - Contributor metrics (bus factor, commit distribution, Gini coefficient)
  - Pull request statistics
- **User-Friendly Interface**:
  - Repository search and filtering
  - Sortable repository list
  - Pin favorite repositories
  - Dark mode support

## Architecture

- **Frontend**: Vue 3 with TypeScript, Tailwind CSS, and Pinia for state management
- **Authentication**: Token-based authentication for each Git provider
- **Services**: Dedicated services for each Git provider (GitHub, GitLab, Azure) and analytics

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

## Getting Started

1. Register an API token for your Git provider (GitHub, GitLab, or Azure DevOps)
2. Log in to the application using your token
3. Browse your repositories and select one to analyze
4. View detailed analytics about your repository's health and activity

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) for the best development experience.

## Technologies

- Vue 3 (Composition API)
- TypeScript
- Tailwind CSS
- Pinia for state management
- Vue Router
- Vite build tool
- Headless UI components
- Lucide icons
