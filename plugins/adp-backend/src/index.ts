/**
 * ADP Backend Plugin for Backstage
 *
 * This plugin provides the backend API integration for the Agent Developer Portal,
 * enabling governance, context delivery, and audit capabilities for AI agents.
 *
 * @packageDocumentation
 */

export { adpPlugin, adpPlugin as default } from './plugin';
export { createRouter } from './router';
export type { RouterOptions } from './router';
export { AdpClient } from './client';
export type { AdpClientConfig, Session, Decision, Approval, Service, ContextResponse, PolicyCheckResult } from './client';
export { AdpEntityProvider, createAdpEntityProvider } from './providers/AdpEntityProvider';
export type { AdpEntityProviderConfig } from './providers/AdpEntityProvider';
export { catalogModuleAdpEntityProvider } from './module';
export { authorizeRequest } from './router';
export * from './permissions';
