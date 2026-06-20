import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { AdpClient } from './client';

/**
 * ADP backend plugin for Backstage
 *
 * This plugin provides:
 * - REST API proxy to ADP server
 * - Session management
 * - Governance policy checks
 * - Decision audit trail
 * - Approval workflow
 * - Context orchestration
 */
export const adpPlugin = createBackendPlugin({
  pluginId: 'adp',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        database: coreServices.database,
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        discovery: coreServices.discovery,
      },
      async init({ httpRouter, config, logger, database, auth, httpAuth, permissions, discovery }) {
        const adpConfig = config.getConfig('adp');
        const baseUrl = adpConfig.getString('baseUrl');
        const apiKey = adpConfig.getOptionalString('apiKey');
        const timeout = adpConfig.getOptionalNumber('timeout') ?? 30000;

        const adpClient = new AdpClient({
          baseUrl,
          apiKey,
          timeout,
          logger: logger.child({ plugin: 'adp' }),
        });

        // Verify connectivity to ADP server
        try {
          await adpClient.healthCheck();
          logger.info('Successfully connected to ADP server', { baseUrl });
        } catch (error) {
          logger.warn('Failed to connect to ADP server - some features may be unavailable', {
            baseUrl,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        const router = await createRouter({
          adpClient,
          config: adpConfig,
          logger: logger.child({ plugin: 'adp' }),
          database,
          auth,
          httpAuth,
          permissions,
          discovery,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
