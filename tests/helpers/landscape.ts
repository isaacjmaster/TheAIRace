import {LANDSCAPE} from '../../shared/landscape';
import assert from 'node:assert/strict';
import type {FoundationState} from '../../shared/foundation';
/** First authenticated read adds landscape metadata and one save revision; pre-existing progression must match exactly. */
export function assertLandscapeMigration(actual:FoundationState,before:FoundationState){const {landscape,revision,...progress}=actual;const {revision:oldRevision,...old}=before;assert.deepEqual(progress,old);assert.equal(revision,oldRevision+1);assert.equal(landscape?.version,1);assert.equal(landscape?.items.length,LANDSCAPE.initialCount);return actual;}
