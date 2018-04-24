import { CreateStore, WorkTrackerLike } from "../src";

export interface TestState {
  prop: string;
}

export const UpdateProp = (val: string) => async (state: TestState) => {
  return {
    ...state,
    prop: val
  }
};


test('Create store returns a store like object', async () => {
  const store = CreateStore({ prop: 'Hello world' });

  expect(store.state.prop).toBe('Hello world');
});

test('Dispatch action should update state', async () => {
  const store = CreateStore({ prop: 'Hello world' });

  expect(store.state.prop).toBe('Hello world');

  await store.dispatch(UpdateProp('New value'));

  expect(store.state.prop).toBe('New value');
});
