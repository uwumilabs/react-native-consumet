/** The error `promise` rejects with; throws (failing the test) when it resolves. */
export const rejectionOf = (promise: Promise<unknown>): Promise<any> =>
  promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => error
  );

/** The error `run` throws; throws (failing the test) when it returns. */
export const thrownBy = (run: () => unknown): any => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected an error');
};
