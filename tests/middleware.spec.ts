import { Action, CreateStore, GlacierMiddleware } from "../src";
import { TestState, UpdateProp } from "./create-store.spec";
import { CreateExternallyResolvableAction } from "./ordering.spec";


class AggregatingMiddleware<TState> implements GlacierMiddleware<TState> {
  constructor(private container: any[][], private identifier: string) {

  }

  beforeAction(state: TState, action: Action<TState>) {
    this.container.push([this.identifier, 'beforeAction', state, action]);
  }

  afterAction(state: TState, action: Action<TState>) {
    this.container.push([this.identifier, 'afterAction', state, action]);
  }

  onError(originalState: TState, partiallyUpdatedState: TState, action: Action<TState>, error: any) {
    this.container.push([this.identifier, 'onError', originalState, partiallyUpdatedState, action, error]);
  }
}

test('Before middleware is called', async () => {
  const eventsStore: any[][] = [];

  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1')]
  });

  expect(eventsStore.length).toBe(0);

  await store.dispatch(UpdateProp('123'));

  expect(eventsStore.length).toBe(2);
  expect(eventsStore.every(x => x[0] === 'Middleware1')).toBeTruthy();
  expect(eventsStore[0][1]).toBe('beforeAction');
});

test('After middleware is called', async () => {
  const eventsStore: any[][] = [];

  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1')]
  });

  expect(eventsStore.length).toBe(0);

  await store.dispatch(UpdateProp('123'));

  expect(eventsStore.length).toBe(2);
  expect(eventsStore.every(x => x[0] === 'Middleware1')).toBeTruthy();
  expect(eventsStore[1][1]).toBe('afterAction');
});

test('Error middleware is called', async () => {
  const eventsStore: any[][] = [];
  const action = CreateExternallyResolvableAction(UpdateProp('123'));
  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1')]
  });

  expect(eventsStore.length).toBe(0);

  const p1 = store.dispatch(action.action);
  action.reject();
  await p1.catch(() => "Suppress");

  expect(eventsStore.length).toBe(2);
  expect(eventsStore[1][1]).toBe('onError');
});


test('Before middleware is called left to right', async () => {
  const eventsStore: any[][] = [];

  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1'),
      new AggregatingMiddleware<TestState>(eventsStore, 'Middleware2')]
  });

  expect(eventsStore.length).toBe(0);

  await store.dispatch(UpdateProp('123'));

  expect(eventsStore.length).toBe(4);

  expect(eventsStore[0][0]).toBe('Middleware1');
  expect(eventsStore[0][1]).toBe('beforeAction');
  expect(eventsStore[1][0]).toBe('Middleware2');
  expect(eventsStore[1][1]).toBe('beforeAction');
});

test('After middleware is called right to left', async () => {
  const eventsStore: any[][] = [];

  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1'),
      new AggregatingMiddleware<TestState>(eventsStore, 'Middleware2')]
  });

  expect(eventsStore.length).toBe(0);

  await store.dispatch(UpdateProp('123'));

  expect(eventsStore.length).toBe(4);

  expect(eventsStore[2][0]).toBe('Middleware2');
  expect(eventsStore[2][1]).toBe('afterAction');
  expect(eventsStore[3][0]).toBe('Middleware1');
  expect(eventsStore[3][1]).toBe('afterAction');
});

test('Error middleware is called left to right', async () => {
  const eventsStore: any[][] = [];
  const action = CreateExternallyResolvableAction(UpdateProp('123'));
  const store = CreateStore({ prop: 'abc' }, {
    middleware: [new AggregatingMiddleware<TestState>(eventsStore, 'Middleware1'),
      new AggregatingMiddleware<TestState>(eventsStore, 'Middleware2')]
  });

  expect(eventsStore.length).toBe(0);

  const p1 = store.dispatch(action.action);
  action.reject();
  await p1.catch(() => "Suppress");

  expect(eventsStore.length).toBe(4);
  expect(eventsStore[2][0]).toBe('Middleware1');
  expect(eventsStore[2][1]).toBe('onError');
  expect(eventsStore[3][0]).toBe('Middleware2');
  expect(eventsStore[3][1]).toBe('onError');
});
