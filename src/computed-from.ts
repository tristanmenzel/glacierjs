const computedFromConfig = {
  enableLogging: false,
  loggingMethod: console.info
};

export const configureComputedFrom = (config: Partial<typeof computedFromConfig>) => {
  Object.assign(computedFromConfig, config)
};

export function ComputedFrom(property: string, ...properties: string[]) {
  const accessProp = (target: any, prop: string) => prop.split(".").reduce((acc, cur) => acc && acc[cur], target);

  const accessors = [property, ...properties].map(p => (target: any) => accessProp(target, p));

  // tslint:disable-next-line:ban-types
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    const cacheKey = Symbol.for(propertyKey);

    if (descriptor.get != null) {
      const original = descriptor.get;
      descriptor.get = function() {
        const instance: any = this;
        const cache: IComputedCache = instance[cacheKey] || (instance[cacheKey] = { prevKey: undefined });

        const references = accessors.map(a => a(instance));
        if (cache.prevKey === undefined || !references.every((r, i) => r === cache.prevKey[i])) {
          cache.prevKey = references;
          cache.prevVal = original.apply(instance, []);
          computedFromConfig.enableLogging && computedFromConfig.loggingMethod('[ComputedFrom]: Cache miss for ' + propertyKey);
          return cache.prevVal;
        }
        computedFromConfig.enableLogging && computedFromConfig.loggingMethod('[ComputedFrom]: Cache hit for ' + propertyKey);
        return cache.prevVal;
      };
    } else {
      throw new Error("Only put a computedFrom() decorator on a get accessor.");
    }
  };
}



interface IComputedCache {
  prevKey: any[];
  prevVal: any;
}
