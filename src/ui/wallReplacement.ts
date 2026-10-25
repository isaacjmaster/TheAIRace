import type {FoundationState} from '../../shared/foundation';

/** An entitlement is saved account state; visibility is strictly local UI context. */
export function wallReplacementAvailable(update:FoundationState['buildingUpdate'],context:{ownCampus:boolean;arranging:boolean;blocked:boolean}){
 return !!update?.pending&&update.acknowledged&&context.ownCampus&&context.arranging&&!context.blocked;
}
