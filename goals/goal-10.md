# Goal 10: Concurrency (Actors)

## Objective
Implement Actor-based concurrency model in IRIS.

## Features
- **ProcessManager**: Manages lightweight processes.
- **Intrinsics**:
  - `sys.spawn(fn, arg)`: Create a new process.
  - `sys.self()`: Get current process ID.
  - `sys.send(pid, msg)`: Send a message to a process.
  - `sys.recv()`: Receive a message (blocking).
  - `sys.sleep(ms)`: Sleep for x milliseconds.

## Implementation
- `src/interpreter/ProcessManager.ts`: Handles scheduling and message queues.
- `src/interpreter/Interpreter.ts`: Integration with `evalIntrinsic`.

## Verification
- Verified with `tests/t121.ts` (Ping Pong test).
