import { BehaviorSubjectLike, Subscribable, Unsubscribable } from "./rxjs-integration";

export interface WorkTrackerLike {
  track<T>(promise: Promise<T>): Promise<T>;
}


export declare type Dispatcher<T> = (action: Action<T>, tracker?: WorkTrackerLike) => Promise<T>;
export declare type Action<T> = (state: T) => Promise<T>;

export interface Store<T> {
  dispatch: Dispatcher<T>;
  state: T;

  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;

  withDefaultTracker(defaultTracker: WorkTrackerLike): Store<T>;
}

export interface GlacierMiddleware<T> {
  beforeAction?(state: T, action: Action<T>): void | Promise<void | T>;

  afterAction?(state: T, action: Action<T>): void | Promise<void | T>;

  onError?(originalState: T, partiallyUpdatedState: T, action: Action<T>, error: any): void | Promise<void>;
}

const CreateProxy = <T>(store: Store<T>, defaultTracker: WorkTrackerLike): Store<T> => {
  const storeProxy: Store<T> = Object.create(store);
  storeProxy.dispatch = (action: Action<T>, tracker?: WorkTrackerLike) => {
    return store.dispatch(action, tracker || defaultTracker);
  };
  return storeProxy;
};

export interface GlacierOptions<T> {
  middleware?: GlacierMiddleware<T>[]
  defaultTracker?: WorkTrackerLike;
  useObservables?: boolean;
  behaviorSubject?: { new(state: T): BehaviorSubjectLike<T> }
}


const trackMeMaybe = <T>(providedTracker: WorkTrackerLike | undefined, defaultTracker: WorkTrackerLike | undefined, promise: Promise<T>): Promise<T> => {
  if (providedTracker) {
    return providedTracker.track(promise);
  } else if (defaultTracker) {
    return defaultTracker.track(promise);
  }
  return promise;
};

const resOrDefault = async <T>(res: void | Promise<void | T>, defaultValue: T): Promise<T> => {
  if (!res) return defaultValue;
  let promRes = await res;
  return promRes || defaultValue;
};


const applyMiddleware = async <T>(state: T, action: Action<T>, middleware: GlacierMiddleware<T>[]): Promise<T> => {
  let finalState = state;
  try {
    for (let m of middleware) {
      if (!m.beforeAction) continue;
      finalState = await resOrDefault(m.beforeAction(finalState, action), finalState);
    }
    finalState = await action(finalState);
    for (let m of [...middleware].reverse()) {
      if (!m.afterAction) continue;
      finalState = await resOrDefault(m.afterAction(finalState, action), finalState);
    }
    return finalState;
  } catch (err) {
    for (let m of middleware) {
      if (!m.onError) continue;
      let res = m.onError(state, finalState, action, err);
      if (res) await res;
    }
    return Promise.reject(err);
  }
};

const createSubject = <T>(options: GlacierOptions<T>, initialState: T): BehaviorSubjectLike<T> => {
  if (options.useObservables) {
    if (!options.behaviorSubject) {
      throw new Error('Must provide an implementation of BehaviorSubject when useObservables is true. See `options.behaviorSubject`');
    }
    return new options.behaviorSubject(initialState);
  } else {
    let state = initialState;
    return {
      next(newState: T) {
        state = newState;
      },
      asObservable(): Subscribable<T> {
        throw new Error('Not Implemented');
      },
      get value() {
        return state;
      }
    }
  }
};


export const CreateStore = <T>(initialState: T,
                               options: GlacierOptions<T> = {}): Store<T> => {
  let theStorySoFar = Promise.resolve();
  let subject = createSubject(options, initialState);
  const store: Store<T> = {
    get state() {
      return subject.value;
    },
    subscribe(...args: any[]) {
      if (!options.useObservables)
        throw new Error('Must set options.useObservables to true to subscribe to changes');
      return subject.asObservable().subscribe(...args);
    },
    dispatch: (action: Action<T>, tracker?: WorkTrackerLike) => {
      return new Promise<T>((resolve, reject) => {
        theStorySoFar = theStorySoFar
          .then(async () => {
            try {
              subject.next(await applyMiddleware(store.state, action, options && options.middleware || []));
              resolve(store.state);
            } catch (err) {
              reject(err)
            }
          });
        trackMeMaybe(tracker, options && options.defaultTracker, theStorySoFar);
      })

    },
    withDefaultTracker: dt => CreateProxy(store, dt)
  };
  return store;
};

export class LoggingMiddleware<T> implements GlacierMiddleware<T> {

  constructor(private errorLog: (logText: string, error: any, context: { originalState: T, partiallyUpdatedState: T, action: Action<T> }) => void,
              private infoLog?: (logText: string, context: { state: T, action: Action<T> }) => void) {

  }

  beforeAction(state: T, action: Action<T>) {
    if (!this.infoLog) return;
    this.infoLog('Glacier: beforeAction', { state, action });
  }

  afterAction(state: T, action: Action<T>) {
    if (!this.infoLog) return;
    this.infoLog('Glacier: afterAction', { state, action });
  }

  onError(originalState: T, partiallyUpdatedState: T, action: Action<T>, error: any) {
    this.errorLog('Glacier: onError', error, { originalState, partiallyUpdatedState, action });
  }
}