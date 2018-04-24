export interface WorkTracker {
  track<T>(promise: Promise<T>): Promise<T>;
}

export declare type Dispatcher<T> = (action: Action<T>, tracker?: WorkTracker) => Promise<T>;
export declare type Action<T> = (state: T) => Promise<T>;

export interface Store<T> {
  dispatch: Dispatcher<T>;
  state: T;

  withDefaultTracker(defaultTracker: WorkTracker): Store<T>;
}

const CreateProxy = <T>(store: Store<T>, defaultTracker: WorkTracker): Store<T> => {
  const storeProxy = {
    get state() {
      return store.state;
    },
    dispatch: (action: Action<T>, tracker?: WorkTracker) => {
      return store.dispatch(action, tracker || defaultTracker);
    },
    withDefaultTracker: (dt: WorkTracker): Store<T> => CreateProxy(storeProxy, dt)
  };
  return storeProxy;
};


export const CreateStore = <T>(initialState: T,
                               errorLogger?: (err: any) => void,
                               defaultTracker?: WorkTracker): Store<T> => {
  let theStorySoFar = Promise.resolve<T>(initialState);
  const store: Store<T> = {
    state: initialState,
    dispatch: async (action: Action<T>, tracker?: WorkTracker) => {
      theStorySoFar = theStorySoFar
        .catch(err => {
          if (errorLogger) {
            errorLogger(err);
          }
        }).then(async () => {
          store.state = await action(store.state);
          return store.state;
        });
      if (tracker) {
        tracker.track(theStorySoFar);
      } else if (defaultTracker) {
        defaultTracker.track(theStorySoFar);
      }
      return await theStorySoFar;
    },
    withDefaultTracker: dt => CreateProxy(store, dt)
  };
  return store;
};
