export interface Config {
  /**
   * Configuration for the Agent Developer Portal (ADP) Backstage plugin.
   */
  adp?: {
    /**
     * Base URL of the ADP REST API server (adp-server), e.g.
     * http://adp-server:8080. Required.
     */
    baseUrl: string;

    /**
     * API key sent as a Bearer token on every request to the ADP server.
     * @visibility secret
     */
    apiKey?: string;

    /**
     * Request timeout in milliseconds for calls to the ADP server.
     * Defaults to 30000.
     */
    timeout?: number;

    /**
     * Organization ID used to scope catalog entities created by the optional
     * ADP entity provider.
     */
    organizationId?: string;

    /**
     * Settings for the optional catalog entity provider that syncs ADP
     * services into the Backstage catalog.
     */
    entityProvider?: {
      /**
       * Refresh interval in milliseconds. Defaults to 300000 (5 minutes).
       */
      refreshIntervalMs?: number;

      /**
       * Optional value for the `backstage.io/techdocs-ref` annotation applied to
       * ADP-managed entities, enabling a TechDocs "Docs" tab. Only set this if
       * your TechDocs setup can serve docs for these entities.
       */
      techdocsRef?: string;
    };
  };
}
