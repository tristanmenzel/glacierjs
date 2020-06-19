import { Action, CreateStore, StoreBase } from '../src'

export interface TestState {
  prop: string;
}

export const UpdateProp = (val: string) => async (state: TestState): Promise<[TestState, number]> => {
  return [{
    ...state,
    prop: val,
  } as const, 123]
}

class TestStore extends StoreBase<TestState> {
  constructor() {super({ prop: 'Hello world' })}
}


test('new store creates a store like object', async () => {
  const store = new TestStore()

  expect(store.state.prop).toBe('Hello world')
})

test('Dispatch action should update state', async () => {
  const store = new TestStore()

  expect(store.state.prop).toBe('Hello world')

  const result = await store.dispatch(UpdateProp('New value'))
  expect(result).toBe(123)
  expect(store.state.prop).toBe('New value')
})
