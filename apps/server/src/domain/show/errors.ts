import type { ShowId } from '@superthree/domain/show/show-id';
import type { ShowName } from '@superthree/domain/show/show-name';
import { TaggedError } from 'better-result';

export class ShowNotFound extends TaggedError('ShowNotFound')<{ id: ShowId; message: string }> {}

export class ShowNameTaken extends TaggedError('ShowNameTaken')<{ name: ShowName; message: string }> {}

export type GetShowError = ShowNotFound;
export type CreateShowError = ShowNameTaken;
export type UpdateShowError = ShowNotFound | ShowNameTaken;
export type DeleteShowError = ShowNotFound;
