
export interface BehaviorSubjectLike<T> {
  readonly value: T;

  asObservable(): Subscribable<T>;

  next(value: T): void;
}

export interface Subscribable<T> {
  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;
}

export interface Unsubscribable {
  unsubscribe(): void;
}
