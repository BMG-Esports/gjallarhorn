import { injectable } from "inversify";
import { Subject } from "rxjs";

@injectable()
export class ErrorService {
  errors$ = new Subject<Error>();

  report(e: Error) {
    this.errors$.next(e);
  }
}
