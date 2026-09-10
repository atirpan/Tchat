/**
 * DI tokens for Messaging module.
 *
 * Lives in its own file so services can depend on the symbol without
 * importing the module file (breaks circularity).
 */
export const CLOCK_TOKEN = Symbol('messaging:clock');
