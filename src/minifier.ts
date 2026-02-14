import type { TransformerFactory } from './transformer';
import {
  deadCodeEliminationTransformer,
  constantFoldingTransformer,
  renameIdentifiersTransformer,
} from './transformers';

export function createMinifierTransformers(): TransformerFactory[] {
  return [
    constantFoldingTransformer(),
    deadCodeEliminationTransformer(),
    renameIdentifiersTransformer(),
  ];
}
