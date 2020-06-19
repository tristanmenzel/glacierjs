# glacierjs

Inspired by redux - glacier is a framework agnostic single directional data flow state management solution. Glacier replaces redux's serializable actions with first class functions to improve typing support and to do away with much of the boiler plate. 

## Install

```
npm i --save glacierjs
```

## Usage

Create an interface to define your state

```ts
export interface DemoState {
    demoValue: string
}
```

Create a new store passing in an initial state

```ts
import {CreateStore, Store} from 'glacierjs';

const store: Store<DemoState> = CreateStore({demoValue: 'Some value'});

// expect(store.state.demoValue).toBe('Some value');
```

Create an action to update the state

```ts
import {Action} from 'glacierjs'

const UpdateStateWithFixedValue: Action<DemoState> = async (state: DemoState) => {
  return {
    ...state,
    demoValue: 'New fixed value'
  };
};
```

Dispatch the action to the store

```ts
store.dispatch(UpdateStateWithFixedValue).then(()=>{
   // expect(store.state.demoValue).toBe('New fixed value');    
})
```

Define an action which takes additional args (Action creators)

```ts
const UpdateStateWithValue = (value: string): Action<TState> => async (state: DemoState) => {
  return {
    ...state,
    demoValue: value
  };
}

const UpdateStateWithServerValue = (someService: {getValue():Promise<string>}): Action<TState> => async  (state: DemoState) => {
  let value = await someService.getValue();
  return {
    ...state,
    demoValue: value
  };
}
```

Invoke the action creator (the outer func) and then dispatch the returned action to the store

```ts
store.dispatch(UpdateStateWithValue('Different value')).then(()=>{
   expect(store.state.demoValue).toBe('Different value');    
});

const fakeService = {getValue(){return Promise.resolve('Async value')}};

store.dispatch(UpdateStateWithServerValue(fakeService)).then(()=>{
   expect(store.state.demoValue).toBe('Async value');    
});
```

Create an action which returns a tuple

```ts
export const UpdateStateAndReturnValue = (api: ApiClient) => async (): Promise<[DemoState, number]> => { 
 const entity = await api.createEntity(...);
 return [{
    ...state,
    demoValue: entity.name
  }, entity.id];
}
```


```ts

const api = {
  createEntity() {
    return Promise.resolve({name: "new entity", id: Math.random()});
  }
};

const id = await store.dispatch(UpdateStateAndReturnValue(api));
expect(typeof id).toBe('number');
expect(store.state.demoValue).toBe('new entity');    
```


## Middleware

Middleware can optionally be provided to the `CreateStore` function.  
- `beforeAction` handlers will be executed LTR before an action is dispatched
- `afterAction` handlers will be executed RTL after an action has been dispatched
- `onError` handlers are called LTR if there is an error in the action or any middleware



```ts
export class ExampleMiddleware<TState> implements GlacierMiddleware<TState> {
  beforeAction(state: TState, action: Action<TState>) {
      // Do something, then return void OR a Promise<void> OR a Promise<TState> where
      // T is your state. This value will be passed to proceeding middleware and the action
  }

  afterAction(state: TState, action: Action<TState>) {
      // Do something, then return void OR a Promise<void> OR a Promise<TState> where
      // T is your state. This value will be passed to proceeding middleware and will be returned
      // as the action result.
  }

  onError(originalState: TState, partiallyUpdatedState: TState, action: Action<TState>, error: any) {
      // Log the error somewhere, then return void or a Promise<void>
  }
}

const store = CreateStore<DemoState>({demoValue: 'Demo'}, {
    middleware: [
        new LoggingMiddleware<DemoState>(console.error, console.info),
        new ExampleMiddleware<DemoState>()]
})
```
