import { CreateStore, Store } from "../src";
import { BehaviorSubject } from "rxjs";

export interface TestState {
  prop: string;
}

test('When useObservables is set and no implementation is provided it should throw', () => {
  expect(() => {
    CreateStore<TestState>({ prop: 'abc' }, {
      useObservables: true
    })
  }).toThrow();
});

test('When useObservables is not set and no implementation is provided it should not throw', () => {
  CreateStore<TestState>({ prop: 'abc' }, {
    useObservables: false
  });
});

test('When useObservables is set and an implementation is provided it should not throw', () => {
  CreateStore<TestState>({ prop: 'abc' }, {
    useObservables: true,
    behaviorSubject: BehaviorSubject
  })
});

describe('rxjs integration', () => {
  let store: Store<TestState>;

  beforeEach(() => {
    store = CreateStore<TestState>({ prop: 'abc' }, {
      useObservables: true,
      behaviorSubject: BehaviorSubject
    });
  });

  it('Should allow you to get the current value', async () => {
    expect(store.state.prop).toBe('abc');
    await store.dispatch(async s => ({ ...s, prop: s.prop + 'def' }));
    expect(store.state.prop).toBe('abcdef');
  });

  it('Should notify you of changes to the state', async () => {
    let prom = new Promise<TestState>(resolve => {
      let count = 0;
      let sub = store.subscribe((s: TestState) => {
        count++;
        if (count == 2) {
          resolve(s);
          sub.unsubscribe();
        }
      });
    });
    await store.dispatch(async s => ({ ...s, prop: s.prop + 'def' }));

    // Expect that this will be resolved
    let newState = await prom;
    expect(newState.prop).toBe('abcdef');

  })
});


