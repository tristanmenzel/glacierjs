import { CreateStore, WorkTrackerLike } from "../src";
import { UpdateProp } from "./create-store.spec";


class FakeTracker implements WorkTrackerLike {
  wasCalled: boolean = false;

  track<TState>(promise: Promise<TState>): Promise<TState> {
    this.wasCalled = true;
    return promise;
  }

  get complete() {
    return true;
  }
}

test('Dispatch action with no tracker should use default', async () => {
  const store = CreateStore({ prop: 'Hello world' }, {
    defaultTracker: new FakeTracker()
  });

  expect((store.tracker as FakeTracker).wasCalled).toBe(false);
  expect(store.state.prop).toBe('Hello world');

  await store.dispatch(UpdateProp('New value'));

  expect(store.state.prop).toBe('New value');
  expect((store.tracker as FakeTracker).wasCalled).toBe(true);
});
test('Dispatch action with tracker should use provided tracker and not default', async () => {
  const fakeDefaultTracker = new FakeTracker();
  const fakeLocalTracker = new FakeTracker();
  const store = CreateStore({ prop: 'Hello world' }, {
    defaultTracker: fakeDefaultTracker
  });

  expect(fakeDefaultTracker.wasCalled).toBe(false);
  expect(fakeLocalTracker.wasCalled).toBe(false);
  expect(store.state.prop).toBe('Hello world');

  await store.dispatch(UpdateProp('New value'), fakeLocalTracker);

  expect(store.state.prop).toBe('New value');
  expect(fakeDefaultTracker.wasCalled).toBe(false);
  expect(fakeLocalTracker.wasCalled).toBe(true);
});

test('Dispatch action with store proxy should use overridden default tracker', async () => {
  const fakeDefaultTracker = new FakeTracker();
  const fakeOverrideTracker = new FakeTracker();
  const store = CreateStore({ prop: 'Hello world' }, {
    defaultTracker: fakeDefaultTracker
  });

  const overriddenStore = store.withDefaultTracker(fakeOverrideTracker);

  expect(store.tracker).toBe(fakeDefaultTracker);
  expect(overriddenStore.tracker).toBe(fakeOverrideTracker);

  expect((store.tracker as FakeTracker).wasCalled).toBe(false);
  expect((overriddenStore.tracker as FakeTracker).wasCalled).toBe(false);
  expect(store.state.prop).toBe('Hello world');

  await overriddenStore.dispatch(UpdateProp('New value'));

  expect(store.state.prop).toBe('New value');
  expect((store.tracker as FakeTracker).wasCalled).toBe(false);
  expect((overriddenStore.tracker as FakeTracker).wasCalled).toBe(true);

});

