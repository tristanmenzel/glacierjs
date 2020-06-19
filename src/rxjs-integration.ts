
export interface BehaviorSubjectLike<TState> {
  readonly value: TState;

  asObservable(): Subscribable<TState>;

  next(value: TState): void;
}

export interface Subscribable<TState> {
  subscribe(next?: (value: TState) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;
}

export interface Unsubscribable {
  unsubscribe(): void;
}
