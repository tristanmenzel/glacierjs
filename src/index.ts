import { BehaviorSubjectLike, Subscribable, Unsubscribable } from './rxjs-integration'

export { ComputedFrom, configureComputedFrom } from './computed-from'

export interface WorkTrackerLike {
  track<TState>(promise: Promise<TState>): Promise<TState>;

  readonly complete: boolean;
}


export declare type Dispatcher<TState> = <TReturn>(action: Action<TState, TReturn>, tracker?: WorkTrackerLike) => Promise<TReturn>;
export declare type Action<TState, TReturn = void> = (state: TState) => Promise<TState | [TState, TReturn]>;

export interface Store<TState> {
  dispatch: Dispatcher<TState>;
  readonly state: TState;

  subscribe(next?: (value: TState) => void, error?: (error: any) => void, complete?: () => void): Unsubscribable;

  readonly tracker: WorkTrackerLike | undefined;

  withDefaultTracker(defaultTracker: WorkTrackerLike): Store<TState>;
}

export class StoreBase<TState> implements Store<TState> {
  private readonly store: Store<TState>

  get dispatch(): Dispatcher<TState> {
    return this.store.dispatch
  }

  get state(): TState {
    return this.store.state
  };

  get subscribe(): (next?: (value: TState) => void, error?: (error: any) => void, complete?: () => void) => Unsubscribable {
    return this.store.subscribe
  }

  get tracker(): WorkTrackerLike | undefined {
    return this.store.tracker
  }


  get withDefaultTracker(): (defaultTracker: WorkTrackerLike) => Store<TState> {
    return this.store.withDefaultTracker
  }

  constructor(initialState: TState, options?: GlacierOptions<TState>) {
    this.store = CreateStore<TState>(initialState, options)
  }
}

export interface GlacierMiddleware<TState> {
  beforeAction?(state: TState, action: Action<TState, any>): void | Promise<void | TState>;

  afterAction?(state: TState, action: Action<TState, any>): void | Promise<void | TState>;

  onError?(originalState: TState, partiallyUpdatedState: TState, action: Action<TState, any>, error: any): void | Promise<void>;
}

const CreateProxy = <TState>(store: Store<TState>, defaultTracker: WorkTrackerLike): Store<TState> => {
  const storeProxy: Store<TState> = Object.create(store)
  storeProxy.dispatch = <TReturn>(action: Action<TState, TReturn>, tracker?: WorkTrackerLike) => {
    return store.dispatch(action, tracker || defaultTracker)
  }
  Object.defineProperty(storeProxy, 'tracker', {
    configurable: true,
    get() {
      return defaultTracker
    },
  })
  return storeProxy
}

export interface GlacierOptions<TState> {
  middleware?: GlacierMiddleware<TState>[]
  defaultTracker?: WorkTrackerLike;
  useObservables?: boolean;
  behaviorSubject?: { new(state: TState): BehaviorSubjectLike<TState> }
}


const trackMeMaybe = <TState>(providedTracker: WorkTrackerLike | undefined, defaultTracker: WorkTrackerLike | undefined, promise: Promise<TState>): Promise<TState> => {
  if (providedTracker) {
    return providedTracker.track(promise)
  } else if (defaultTracker) {
    return defaultTracker.track(promise)
  }
  return promise
}

const resOrDefault = async <TState>(res: void | Promise<void | TState>, defaultValue: TState): Promise<TState> => {
  if (!res) {
    return defaultValue
  }
  let promRes = await res
  return promRes || defaultValue
}

const convertToTuple = <TState, TReturn = void>(result: TState | [TState, TReturn]): [TState, TReturn] => {
  if(Array.isArray(result))
    return result;
  return [result, undefined as any]
}

const applyMiddleware = async <TState, TReturn>(state: TState, action: Action<TState, TReturn>, middleware: GlacierMiddleware<TState>[]): Promise<[TState, TReturn]> => {
  let finalState = state
  try {
    for (let m of middleware) {
      if (!m.beforeAction) {
        continue
      }
      finalState = await resOrDefault(m.beforeAction(finalState, action), finalState)
    }
    let returnValue: TReturn
    [finalState, returnValue] = convertToTuple(await action(finalState))
    for (let m of [...middleware].reverse()) {
      if (!m.afterAction) {
        continue
      }
      finalState = await resOrDefault(m.afterAction(finalState, action), finalState)
    }
    return [finalState, returnValue]
  } catch (err) {
    for (let m of middleware) {
      if (!m.onError) {
        continue
      }
      let res = m.onError(state, finalState, action, err)
      if (res) {
        await res
      }
    }
    return Promise.reject(err)
  }
}

const createSubject = <TState>(options: GlacierOptions<TState>, initialState: TState): BehaviorSubjectLike<TState> => {
  if (options.useObservables) {
    if (!options.behaviorSubject) {
      throw new Error('Must provide an implementation of BehaviorSubject when useObservables is true. See `options.behaviorSubject`')
    }
    return new options.behaviorSubject(initialState)
  } else {
    let state = initialState
    return {
      next(newState: TState) {
        state = newState
      },
      asObservable(): Subscribable<TState> {
        throw new Error('Not Implemented')
      },
      get value() {
        return state
      },
    }
  }
}


export const CreateStore = <TState>(initialState: TState,
  options: GlacierOptions<TState> = {}): Store<TState> => {
  let theStorySoFar = Promise.resolve()
  let subject = createSubject(options, initialState)
  const store: Store<TState> = {
    get state() {
      return subject.value
    },
    tracker: undefined,
    subscribe(...args: any[]) {
      if (!options.useObservables) {
        throw new Error('Must set options.useObservables to true to subscribe to changes')
      }
      return subject.asObservable().subscribe(...args)
    },
    dispatch: <TReturn = void>(action: Action<TState, TReturn>, tracker?: WorkTrackerLike) => {
      return new Promise<TReturn>((resolve, reject) => {
        theStorySoFar = theStorySoFar
          .then(async () => {
            try {
              const [state, returnValue] = await applyMiddleware(store.state, action, options && options.middleware || [])
              subject.next(state)
              resolve(returnValue)
            } catch (err) {
              reject(err)
            }
          })
        trackMeMaybe(tracker, options && options.defaultTracker, theStorySoFar)
      })
    },
    withDefaultTracker: dt => CreateProxy(store, dt),
  }
  Object.defineProperty(store, 'tracker', {
    configurable: true,
    get() {
      return options && options.defaultTracker
    },
  })

  return store
}

export class LoggingMiddleware<TState> implements GlacierMiddleware<TState> {

  constructor(private errorLog: (logText: string, error: any, context: { originalState: TState, partiallyUpdatedState: TState, action: Action<TState> }) => void,
    private infoLog?: (logText: string, context: { state: TState, action: Action<TState> }) => void) {

  }

  beforeAction(state: TState, action: Action<TState>) {
    if (!this.infoLog) {
      return
    }
    this.infoLog('Glacier: beforeAction', { state, action })
  }

  afterAction(state: TState, action: Action<TState>) {
    if (!this.infoLog) {
      return
    }
    this.infoLog('Glacier: afterAction', { state, action })
  }

  onError(originalState: TState, partiallyUpdatedState: TState, action: Action<TState>, error: any) {
    this.errorLog('Glacier: onError', error, { originalState, partiallyUpdatedState, action });
  }
}
