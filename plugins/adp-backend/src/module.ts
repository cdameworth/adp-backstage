import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { AdpClient } from './client';
import { AdpEntityProvider } from './providers/AdpEntityProvider';

/**
 * Catalog backend module that registers the {@link AdpEntityProvider}, syncing
 * ADP services into the Backstage catalog as Component entities.
 *
 * Wire it into your backend alongside the catalog plugin:
 *
 * ```ts
 * import { catalogModuleAdpEntityProvider } from '@adp/backstage-plugin-adp-backend';
 * backend.add(catalogModuleAdpEntityProvider);
 * ```
 *
 * It is a no-op (with a warning) when the `adp` config block is absent, so it
 * is safe to add unconditionally.
 */
export const catalogModuleAdpEntityProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'adp-entity-provider',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ catalog, config, logger }) {
        const adpConfig = config.getOptionalConfig('adp');
        if (!adpConfig) {
          logger.warn(
            'ADP entity provider not registered: missing "adp" config block',
          );
          return;
        }

        const childLogger = logger.child({
          plugin: 'adp',
          component: 'entity-provider',
        });

        const adpClient = new AdpClient({
          baseUrl: adpConfig.getString('baseUrl'),
          apiKey: adpConfig.getOptionalString('apiKey'),
          timeout: adpConfig.getOptionalNumber('timeout') ?? 30000,
          logger: childLogger,
        });

        catalog.addEntityProvider(
          new AdpEntityProvider({
            adpClient,
            logger: childLogger,
            refreshInterval: adpConfig.getOptionalNumber(
              'entityProvider.refreshIntervalMs',
            ),
            organizationId: adpConfig.getOptionalString('organizationId'),
            techdocsRef: adpConfig.getOptionalString('entityProvider.techdocsRef'),
          }),
        );

        logger.info('Registered ADP entity provider with catalog');
      },
    });
  },
});
