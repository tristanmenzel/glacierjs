export interface WorkTrackerLike {
  track<T>(promise: Promise<T>): Promise<T>;
}

export declare type Dispatcher<T> = (action: Action<T>, tracker?: WorkTrackerLike) => Promise<void>;
export declare type Action<T> = (state: T) => Promise<T>;


export interface Store<T> {
  dispatch: Dispatcher<T>;
  readonly state: T;

  withDefaultTracker(defaultTracker: WorkTrackerLike): Store<T>;
}

export interface GlacierMiddleware<T> {
  beforeAction?(state: T, action: Action<T>): void | Promise<void | T>;

  afterAction?(state: T, action: Action<T>): void | Promise<void | T>;

  onError?(originalState: T, partiallyUpdatedState: T, action: Action<T>, error: any): void | Promise<void>;
}

const CreateProxy = <T>(store: Store<T>, defaultTracker: WorkTrackerLike): Store<T> => {
  const storeProxy = {
    get state() {
      return store.state;
    },
    dispatch: (action: Action<T>, tracker?: WorkTrackerLike) => {
      return store.dispatch(action, tracker || defaultTracker);
    },
    withDefaultTracker: (dt: WorkTrackerLike): Store<T> => CreateProxy(storeProxy, dt)
  };
  return storeProxy;
};

export interface GlacierOptions<T> {
  middleware?: GlacierMiddleware<T>[]
  defaultTracker?: WorkTrackerLike;
  developmentMode?: boolean;
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
    return state;
  }
};

const createReadonlyProxy = <T>(state: T): T => {
  if (typeof state !== "object") return state;
  return new Proxy(state as any, {
    get(target: T, property: keyof T) {
      let val: any = target[property];
      if (val instanceof Object) {
        return createReadonlyProxy(val as any);
      }
      return val;
    },
    set(target: T, property: keyof T, value: any): boolean {
      console.warn(`Property ${property} is readonly and cannot be set`);
      return false;
    }
  });
};

export const CreateStore = <T>(initialState: T,
                               options?: GlacierOptions<T>): Store<T> => {
  let theStorySoFar = Promise.resolve();
  let state: T = options && options.developmentMode
    ? createReadonlyProxy(initialState)
    : initialState;

  const store: Store<T> = {
    get state() {
      return state;
    },
    dispatch: async (action: Action<T>, tracker?: WorkTrackerLike) => {
      theStorySoFar = theStorySoFar
        .then(async () => {
          let newState = await applyMiddleware(state as T, action, options && options.middleware || []);
          if (options && options.developmentMode) {
            newState = createReadonlyProxy(newState as any);
          }
          state = newState;
        });
      return await trackMeMaybe(tracker, options && options.defaultTracker, theStorySoFar);
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