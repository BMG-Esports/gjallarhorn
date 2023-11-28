import { PushButtonState } from "../@types/types";

export async function wrapPushButton(
  task: () => void | Promise<void>,
  cb: (state: PushButtonState) => void
) {
  cb({ status: 0 });
  try {
    await task();
    cb({ status: 1, lastPush: Date.now() });
  } catch (e) {
    cb({ status: -1, lastPush: Date.now() });
    throw e;
  }
}
