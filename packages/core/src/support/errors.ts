export class BackendError extends Error {
  /**
   * @param message Error message to display.
   * @param source A user-friendly name for the source.
   * @param fatal Whether this error should mark the system as fatal.
   * @param suberror The original error, if present, to be printed in the logs.
   */
  constructor(
    message: string,
    public source?: string,
    public fatal = false,
    public suberror?: any
  ) {
    super(message);
  }

  nonFatal() {
    this.fatal = false;
    return this;
  }
}
