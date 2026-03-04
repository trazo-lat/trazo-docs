import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

export default defineConfig({
  legacy: {
    collections: true,
  },
  integrations: [
    starlight({
      title: 'Trazo Docs',
      description: 'Documentation for the Trazo multi-tenant SaaS platform',
      social: {
        github: 'https://github.com/trazo-dev',
      },
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
            { label: 'Core Struct', slug: 'architecture/core-struct' },
            { label: 'Schema-per-Tenant', slug: 'architecture/schema-per-tenant' },
            { label: 'Module System', slug: 'architecture/module-system' },
            { label: 'Permissions', slug: 'architecture/permissions' },
            { label: 'Audit Trail', slug: 'architecture/audit-trail' },
            { label: 'Event Outbox', slug: 'architecture/event-outbox' },
            { label: 'Notifications', slug: 'architecture/notifications' },
            { label: 'Error System', slug: 'architecture/error-system' },
            { label: 'Authentication', slug: 'architecture/authentication' },
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
        ...openAPISidebarGroups,
        {
          label: 'API Guides',
          items: [
            { label: 'Authentication', slug: 'api-guides/authentication' },
            { label: 'Tenant Management', slug: 'api-guides/tenant-management' },
            { label: 'User Management', slug: 'api-guides/user-management' },
            { label: 'Audit Logs', slug: 'api-guides/audit-logs' },
            { label: 'Events', slug: 'api-guides/events' },
            { label: 'Notifications', slug: 'api-guides/notifications' },
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
