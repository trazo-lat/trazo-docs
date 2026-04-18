import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import mermaid from 'astro-mermaid';

export default defineConfig({
  integrations: [
    mermaid({
      autoTheme: true,
      mermaidConfig: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#2563eb',
          secondaryColor: '#1e3a5f',
          secondaryTextColor: '#ffffff',
          secondaryBorderColor: '#1a2b4a',
          tertiaryColor: '#dbeafe',
          tertiaryTextColor: '#1e3a5f',
          tertiaryBorderColor: '#93c5fd',
          lineColor: '#888b96',
          textColor: '#c0c2c7',
          mainBkg: '#3b82f6',
          nodeBorder: '#2563eb',
          clusterBkg: '#24272f',
          clusterBorder: '#545861',
          edgeLabelBackground: '#24272f',
          nodeTextColor: '#ffffff',
        },
      },
    }),
    starlight({
      title: 'Trazo Docs',
      description: 'Documentation for the Trazo multi-tenant SaaS platform',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/trazo-dev' },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Prerequisites', slug: 'getting-started/prerequisites' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Local Development', slug: 'getting-started/local-development' },
            { label: 'Your First Tenant', slug: 'getting-started/first-tenant' },
            { label: 'Configuration', slug: 'getting-started/configuration' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Overview', slug: 'architecture/overview' },
            { label: 'Diagrams', slug: 'architecture/diagrams' },
            {
              label: 'Core',
              collapsed: true,
              items: [
                { label: 'Core Struct', slug: 'architecture/core-struct' },
                { label: 'Schema-per-Tenant', slug: 'architecture/schema-per-tenant' },
                { label: 'Error System', slug: 'architecture/error-system' },
                { label: 'Status Engine', slug: 'architecture/status-engine' },
              ],
            },
            {
              label: 'Modules',
              collapsed: true,
              items: [
                { label: 'Module System', slug: 'architecture/module-system' },
                { label: 'Multi-Instance Modules', slug: 'architecture/multi-instance-modules' },
              ],
            },
            {
              label: 'Security & Access',
              collapsed: true,
              items: [
                { label: 'Authentication', slug: 'architecture/authentication' },
                { label: 'Permissions', slug: 'architecture/permissions' },
                { label: 'Rate Limiting', slug: 'architecture/rate-limiting' },
              ],
            },
            {
              label: 'Events & Messaging',
              collapsed: true,
              items: [
                { label: 'Event Outbox', slug: 'architecture/event-outbox' },
                { label: 'Event Subscriptions', slug: 'architecture/event-subscriptions' },
                { label: 'Hooks', slug: 'architecture/hooks' },
                { label: 'Notifications', slug: 'architecture/notifications' },
              ],
            },
            {
              label: 'Infrastructure',
              collapsed: true,
              items: [
                { label: 'Audit Trail', slug: 'architecture/audit-trail' },
                { label: 'File Storage', slug: 'architecture/storage' },
              ],
            },
          ],
        },
        {
          label: 'Module Development',
          items: [
            { label: 'Creating a Module', slug: 'guides/creating-a-module' },
            { label: 'module.yaml Reference', slug: 'guides/module-yaml-reference' },
            { label: 'Service Patterns', slug: 'guides/service-patterns' },
            { label: 'Handler Patterns', slug: 'guides/handler-patterns' },
            { label: 'Repository Patterns', slug: 'guides/repository-patterns' },
            { label: 'Testing Guide', slug: 'guides/testing-guide' },
            { label: 'Migrations', slug: 'guides/migrations' },
            { label: 'Cross-Module Calls', slug: 'guides/cross-module-calls' },
          ],
        },
        {
          label: 'Flows',
          items: [
            { label: 'Creating a Module', slug: 'guides/flow-creating-a-module' },
            { label: 'Updating a Module', slug: 'guides/flow-updating-a-module' },
            { label: 'Application Startup', slug: 'guides/flow-startup-lifecycle' },
            { label: 'Request Lifecycle', slug: 'guides/flow-request-lifecycle' },
            { label: 'Event Propagation', slug: 'guides/flow-event-propagation' },
            { label: 'Local Dev Setup', slug: 'guides/flow-local-dev-setup' },
          ],
        },
        {
          label: 'API',
          items: [
            {
              label: 'Guides',
              collapsed: true,
              items: [
                { label: 'Authentication', slug: 'api-guides/authentication' },
                { label: 'Auth Method Management', slug: 'api-guides/auth-method-management' },
                { label: 'Tenant Management', slug: 'api-guides/tenant-management' },
                { label: 'User Management', slug: 'api-guides/user-management' },
                { label: 'Audit Logs', slug: 'api-guides/audit-logs' },
                { label: 'Events', slug: 'api-guides/events' },
                { label: 'Notifications', slug: 'api-guides/notifications' },
              ],
            },
            ...openAPISidebarGroups,
          ],
        },
        {
          label: 'CLI Reference',
          items: [
            { label: 'Overview', slug: 'cli/overview' },
            { label: 'Database Commands', slug: 'cli/db-commands' },
            { label: 'Migration Commands', slug: 'cli/migrate-commands' },
            { label: 'Module Commands', slug: 'cli/module-commands' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Core Types', slug: 'reference/core-types' },
            { label: 'Core Interfaces', slug: 'reference/core-interfaces' },
            { label: 'Error Codes', slug: 'reference/error-codes' },
            { label: 'Database Schema', slug: 'reference/database-schema' },
            { label: 'Configuration', slug: 'reference/configuration-reference' },
            { label: 'module.yaml Spec', slug: 'reference/module-yaml-spec' },
          ],
        },
      ],
      plugins: [
        starlightOpenAPI([
          {
            base: 'api',
            label: 'API Reference',
            schema: './schemas/openapi.json',
          },
        ]),
      ],
    }),
  ],
});
