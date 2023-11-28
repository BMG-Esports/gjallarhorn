import { injectable } from "inversify";

@injectable()
export class CacheService {
  EXPIRY = 60; // 60 seconds
  CLEANUP = 300; // 5 minutes

  cache: {
    [key: string]: {
      data: any;
      expiry: number;
    };
  } = {};

  constructor() {
    setInterval(() => {
      Object.keys(this.cache).map((key) => {
        // Periodically purge dead entries from the cache.
        if (this.cache[key].expiry < Date.now()) {
          delete this.cache[key];
        }
      });
    }, this.CLEANUP * 1000);
  }

  public async get<T>(
    key: string,
    miss: () => Promise<T>,
    expiry = this.EXPIRY
  ): Promise<T> {
    if (this.cache[key] && this.cache[key].expiry > Date.now()) {
      return this.cache[key].data;
    }

    this.cache[key] = {
      data: await miss(),
      expiry: Date.now() + expiry * 1000,
    };
    return this.cache[key].data;
  }

  public clear() {
    this.cache = {};
  }
}
