/** The time source of the settle rule: a monotonic clock in milliseconds and a sleep. */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}
