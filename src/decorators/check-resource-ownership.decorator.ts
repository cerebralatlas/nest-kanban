import { SetMetadata } from '@nestjs/common';

export const RESOURCE_OWNERSHIP_KEY = 'resource_ownership';

export type ResourceType = 'workspace' | 'board';

export interface ResourceOwnershipConfig {
  resourceType: ResourceType;
  paramName?: string; // 默认为 'id'
}

export const CheckResourceOwnership = (config: ResourceOwnershipConfig) => 
  SetMetadata(RESOURCE_OWNERSHIP_KEY, config);
