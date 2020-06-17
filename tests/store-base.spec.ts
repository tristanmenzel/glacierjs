import { CreateStore, StoreBase } from '../src'

export interface TestState {
  prop: string;
}

export const UpdateProp = (val: string) => async (state: TestState) => {
  return {
    ...state,
    prop: val,
  }
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

  await store.dispatch(UpdateProp('New value'))

  expect(store.state.prop).toBe('New value')
})
