import { CreateStore, WorkTrackerLike } from "../src";

export interface TestState {
  prop: string;
  nested?: {
    otherProp: number
  }
  collection?: {
    test: number
  }[]
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

test('State should be immutable if development mode is on', async () => {
  const store = CreateStore({
    prop: 'Hello world',
    nested: { otherProp: 3 },
    collection: [{ test: 2 }]
  }, { developmentMode: true });


  expect(() => {
    store.state.prop = "hmmm";
  }).toThrow();

  expect(() => {
    store.state.nested.otherProp = 2323;
  }).toThrow();

  expect(() => {
    store.state.collection[0].test = 4;
  }).toThrow();

  expect(store.state.prop).toBe('Hello world');
  expect(store.state.nested.otherProp).toBe(3);
  expect(store.state.collection[0].test).toBe(2);
});