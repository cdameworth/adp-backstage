import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';
import { AdpClient, Service } from '../client';

/**
 * Configuration for the ADP entity provider
 */
export interface AdpEntityProviderConfig {
  adpClient: AdpClient;
  logger: LoggerService;
  /** Refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
  /** Organization ID to scope services to */
  organizationId?: string;
  /**
   * Optional value for the `backstage.io/techdocs-ref` annotation applied to
   * every ADP-managed entity, enabling a TechDocs "Docs" tab. Only set this if
   * your TechDocs setup can actually serve docs for these entities (e.g. an
   * external publisher) — see the plugins README. Left unset, no annotation is
   * added.
   */
  techdocsRef?: string;
}

/**
 * Entity provider that syncs ADP services to the Backstage catalog
 *
 * This provider:
 * - Fetches services from ADP
 * - Converts them to Backstage Component entities
 * - Syncs them periodically to the catalog
 * - Adds ADP-specific annotations for governance metadata
 */
export class AdpEntityProvider implements EntityProvider {
  private readonly adpClient: AdpClient;
  private readonly logger: LoggerService;
  private readonly refreshInterval: number;
  private readonly organizationId?: string;
  private readonly techdocsRef?: string;
  private connection?: EntityProviderConnection;
  private refreshTimer?: NodeJS.Timeout;

  constructor(config: AdpEntityProviderConfig) {
    this.adpClient = config.adpClient;
    this.logger = config.logger;
    this.refreshInterval = config.refreshInterval ?? 5 * 60 * 1000; // 5 minutes
    this.organizationId = config.organizationId;
    this.techdocsRef = config.techdocsRef;
  }

  /** Provider ID for the catalog */
  getProviderName(): string {
    return 'adp';
  }

  /**
   * Connect to the catalog and start syncing
   */
  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;

    // Initial sync
    await this.refresh();

    // Schedule periodic refresh
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refresh();
      } catch (error) {
        this.logger.error('Failed to refresh ADP entities', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.refreshInterval);

    this.logger.info('ADP entity provider connected', {
      refreshInterval: this.refreshInterval,
    });
  }

  /**
   * Disconnect and stop syncing
   */
  async disconnect(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.connection = undefined;
    this.logger.info('ADP entity provider disconnected');
  }

  /**
   * Refresh entities from ADP
   */
  async refresh(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to catalog');
    }

    this.logger.debug('Refreshing ADP entities');

    try {
      // Fetch all services from ADP
      const services: Service[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await this.adpClient.listServices({ limit, offset });
        services.push(...response.items);

        if (services.length >= response.total || response.items.length < limit) {
          break;
        }
        offset += limit;
      }

      this.logger.info('Fetched services from ADP', { count: services.length });

      // Convert services to Backstage entities
      const entities = services.map(service => this.serviceToEntity(service));

      // Apply to catalog with full mutation
      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: `adp-provider:${this.organizationId || 'default'}`,
        })),
      });

      this.logger.info('Applied ADP entities to catalog', { count: entities.length });
    } catch (error) {
      this.logger.error('Failed to refresh ADP entities', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Convert an ADP service to a Backstage Component entity
   */
  private serviceToEntity(service: Service): Entity {
    const annotations: Record<string, string> = {
      'adp.io/service-id': service.id,
      'backstage.io/managed-by-location': `adp:${service.id}`,
      'backstage.io/managed-by-origin-location': `adp:${service.id}`,
    };

    // Add repository annotation if available
    if (service.repository_url) {
      // Parse GitHub URL to backstage format
      const match = service.repository_url.match(
        /github\.com\/([^/]+)\/([^/]+)/,
      );
      if (match) {
        annotations['github.com/project-slug'] = `${match[1]}/${match[2]}`;
      }
      annotations['backstage.io/source-location'] = `url:${service.repository_url}`;
    }

    // Add context configuration annotations
    if (service.context_config) {
      annotations['adp.io/context-config'] = JSON.stringify(service.context_config);
    }

    // Add escalation configuration annotations
    if (service.escalation_config) {
      annotations['adp.io/escalation-config'] = JSON.stringify(service.escalation_config);
    }

    // Enable a TechDocs "Docs" tab when configured (see AdpEntityProviderConfig.techdocsRef)
    if (this.techdocsRef) {
      annotations['backstage.io/techdocs-ref'] = this.techdocsRef;
    }

    // Build owner reference
    let owner = 'unknown';
    if (service.owner_team) {
      owner = `group:default/${service.owner_team}`;
    } else if (service.owner_user) {
      owner = `user:default/${service.owner_user}`;
    }

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: this.sanitizeName(service.name),
        title: service.name,
        description: service.description,
        annotations,
        labels: {
          'adp.io/managed': 'true',
        },
        tags: ['adp-managed'],
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
        owner,
      },
    };

    return entity;
  }

  /**
   * Sanitize a name for use in Backstage
   * Names must be lowercase, alphanumeric with dashes
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63); // Max length
  }
}

/**
 * Create an ADP entity provider
 */
export function createAdpEntityProvider(
  config: AdpEntityProviderConfig,
): AdpEntityProvider {
  return new AdpEntityProvider(config);
}
