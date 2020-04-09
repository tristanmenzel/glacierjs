

export function RunOnce() {
  // tslint:disable-next-line:ban-types
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    const cacheKey = Symbol.for(propertyKey);

    if (descriptor.get != null) {
      const original = descriptor.get;
      descriptor.get = function() {
        const instance: any = this;
        const cache: RunOnceCache = instance[cacheKey] || (instance[cacheKey] = { hasRun: false });

        if (cache.hasRun === undefined) {
          cache.hasRun = true;
          cache.prevVal = original.apply(instance, []);
          return cache.prevVal;
        }
        return cache.prevVal;
      };
    } else {
      throw new Error("Only put a RunOnce() decorator on a get accessor.");
    }
  };
}



interface RunOnceCache {
  hasRun: boolean;
  prevVal: any;
}
