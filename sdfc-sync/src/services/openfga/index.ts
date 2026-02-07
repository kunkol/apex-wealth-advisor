export { FGAClient, loadModelDsl } from './client.js';
export type { Tuple, TupleKey, CheckResult } from './client.js';

export {
  translateUsers,
  translateRoles,
  translateGroups,
  translateGroupMembers,
  translatePermissionSetAssignments,
  translateAccounts,
  translateContacts,
  translateTasks,
  translateAccountShares,
  translateContactShares,
  translateContactPermissionsFromAccountShares,
  translateIndustryRestrictions,
  translateAll,
} from './translator.js';
export type { TranslationResult } from './translator.js';
