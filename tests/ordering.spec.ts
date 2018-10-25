import { Action, CreateStore } from "../src";
import { TestState } from "./create-store.spec";

export interface ExternallyResolvableAction<T> {
  resolve(): void;

  reject(): void;

  action: Action<T>;
}

export const CreateExternallyResolvableAction = <T>(action: Action<T>): ExternallyResolvableAction<T> => {
  let res: ExternallyResolvableAction<T> = {
    resolve: null as any,
    reject: null as any,
    action: null as any
  };
  let p = new Promise((resolve, reject) => {
    res.resolve = resolve;
    res.reject = () => reject('Action rejected');
  });
  res.action = async (state: T) => {
    await p;
    return await action(state);
  };
  return res;
};


test('Multiple async actions are applied serially in order of dispatch when resolved in order', async () => {
  const store = CreateStore({ prop: 'abc' });
  const a1 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'def' }));
  const a2 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'ghi' }));


  const p1 = store.dispatch(a1.action);
  const p2 = store.dispatch(a2.action);

  expect(store.state.prop).toBe('abc');
  a1.resolve();
  await p1;
  expect(store.state.prop).toBe('abcdef');

  a2.resolve();
  await p2;
  expect(store.state.prop).toBe('abcdefghi');
});

test('Multiple async actions are applied serially in order of dispatch when resolved out of order', async () => {
  const store = CreateStore({ prop: 'abc' });
  const a1 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'def' }));
  const a2 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'ghi' }));


  const p1 = store.dispatch(a1.action);
  const p2 = store.dispatch(a2.action);

  expect(store.state.prop).toBe('abc');

  a2.resolve();
  expect(store.state.prop).toBe('abc');

  a1.resolve();

  await p1;
  await p2;
  expect(store.state.prop).toBe('abcdefghi');
});

test('If an error is thrown in the second action, the result is the first state', async () => {
  const store = CreateStore({ prop: 'abc' });
  const a1 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'def' }));
  const a2 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'ghi' }));


  const p1 = store.dispatch(a1.action);
  const p2 = store.dispatch(a2.action);

  expect(store.state.prop).toBe('abc');
  a1.resolve();
  await p1;
  expect(store.state.prop).toBe('abcdef');

  a2.reject();
  await p2.catch(() => "Suppress");
  expect(store.state.prop).toBe('abcdef');
});

test('If an error is thrown in the first action, the second action is run on the initial state', async () => {
  const store = CreateStore({ prop: 'abc' });
  const a1 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'def' }));
  const a2 = CreateExternallyResolvableAction(async (state: TestState) => ({ prop: state.prop + 'ghi' }));


  const p1 = store.dispatch(a1.action);
  const p2 = store.dispatch(a2.action);

  expect(store.state.prop).toBe('abc');
  a1.reject();
  await p1.catch(() => "Suppress");
  expect(store.state.prop).toBe('abc');

  a2.resolve();
  await p2;
  expect(store.state.prop).toBe('abcghi');
});