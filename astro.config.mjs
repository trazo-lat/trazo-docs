import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import mermaid from 'astro-mermaid';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [
    react(),
    mermaid({
      autoTheme: true,
      mermaidConfig: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#5853CF',
          primaryTextColor: '#F5F2EC',
          primaryBorderColor: '#8884E5',
          secondaryColor: '#FF6B5B',
          secondaryTextColor: '#F5F2EC',
          secondaryBorderColor: '#E84D3C',
          tertiaryColor: '#2B2A28',
          tertiaryTextColor: '#F5F2EC',
          tertiaryBorderColor: '#4F4D48',
          lineColor: '#B7B4AD',
          textColor: '#F5F2EC',
          mainBkg: '#5853CF',
          nodeBorder: '#8884E5',
          clusterBkg: 'transparent',
          clusterBorder: '#4F4D48',
          edgeLabelBackground: '#1B1A19',
          nodeTextColor: '#F5F2EC',
        },
      },
    }),
    starlight({
      title: 'Heyllave Docs',
      description: 'Documentation for the Heyllave multi-tenant SaaS platform',
      logo: {
        src: './src/assets/heyllave-logo.svg',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/heyllave/docs' },
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
          label: 'Billing',
          items: [
            { label: 'Overview', slug: 'billing/overview' },
            { label: 'Defining Metrics', slug: 'billing/metrics' },
            { label: 'Gating with the Engine', slug: 'billing/gating' },
            { label: 'Plans & Overrides', slug: 'billing/plans' },
            { label: 'Conditional Rules', slug: 'billing/rules' },
            { label: 'Soft Limits & Thresholds', slug: 'billing/thresholds' },
            { label: 'Policies', slug: 'billing/policies' },
            { label: 'Subscription Contracts', slug: 'billing/contracts' },
            { label: 'Audit Log', slug: 'billing/audit' },
            { label: 'HTTP API Reference', slug: 'billing/api' },
            { label: 'Roadmap', slug: 'billing/roadmap' },
          ],
        },
        {
          label: 'Invoicing',
          items: [
            { label: 'Overview', slug: 'invoicing/overview' },
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
          label: 'Subsystem Guides',
          items: [
            { label: 'Sending Notifications', slug: 'guides/notifications' },
            { label: 'Status Machines', slug: 'guides/status-machines' },
            { label: 'Hooks', slug: 'guides/hooks' },
            { label: 'Approval Workflows', slug: 'guides/approvals' },
            { label: 'Translations (i18n)', slug: 'guides/i18n' },
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
