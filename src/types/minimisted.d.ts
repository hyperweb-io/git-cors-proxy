declare module "minimisted" {
  function minimisted<T>(fn: (options: T) => void | Promise<void>): void;
  export = minimisted;
}
