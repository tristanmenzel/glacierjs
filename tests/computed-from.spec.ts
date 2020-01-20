import { ComputedFrom, configureComputedFrom } from "../src/computed-from";

class TestViewModel {
  dependency = "initial";
  callCount = 0;

  @ComputedFrom("dependency")
  get TestProp() {
    this.callCount++;
    return [this.dependency];
  }
}

describe("ComputedFrom", () => {
  configureComputedFrom({enableLogging: true});

  let testViewModel = new TestViewModel();
  beforeEach(() => {
    testViewModel = new TestViewModel();
  });


  test(`Repeated calls don't increment call count and return same value`, () => {
    let val = testViewModel.TestProp;
    let otherVal = testViewModel.TestProp;
    let oneMoreTime = testViewModel.TestProp;

    expect(val[0]).toBe(testViewModel.dependency);
    expect(val).toBe(otherVal);
    expect(val).toBe(oneMoreTime);
    expect(testViewModel.callCount).toBe(1);
  });
  test(`If dependency changes, new value is returned`, () => {
    let val = testViewModel.TestProp;
    testViewModel.dependency = "new value";
    let otherVal = testViewModel.TestProp;

    expect(val).not.toBe(otherVal);
    expect(otherVal[0]).toBe(testViewModel.dependency);
    expect(testViewModel.callCount).toBe(2);
  });
  /*
  ComputedFrom should not behave like a true memoize. Only the most recent value should be recalled
   */
  test(`If dependency changes back to original value, new value is returned`, () => {
    let val = testViewModel.TestProp;
    testViewModel.dependency = "new value";
    let otherVal = testViewModel.TestProp;
    testViewModel.dependency = "initial";
    let backToOriginalVal = testViewModel.TestProp;

    expect(val).not.toBe(backToOriginalVal);
    expect(backToOriginalVal[0]).toBe(testViewModel.dependency);
    expect(testViewModel.callCount).toBe(3);
  });

});
