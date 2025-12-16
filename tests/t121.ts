
import { TestCase } from '../src/test-types';

export const t121: TestCase = {
  name: 'Test 121: Concurrency Ping Pong',
  source: `
(program
  (module (name "pingpong") (version 0))
  (defs
    (deffn (name worker) (args) (ret I64) (eff !Any)
      (body
        (let (msg (sys.recv))
             (let (_ (io.print (str.concat "Worker received: " msg)))
             (let (p (sys.send 1 "Pong"))
             0)))
      )
    )

    (deffn (name main) (args) (ret I64) (eff !Any)
      (body
        (let (myself (sys.self))
        (let (child (sys.spawn "worker"))
        (let (_ (io.print "Main spawned worker"))
        (let (sent (sys.send child "Ping"))
        (let (reply (sys.recv))
             (let (_ (io.print (str.concat "Main received: " reply)))
             0)
        )))))
      )
    )
  )
)
  `,
  expect: "0",
  expectOutput: [
    "Main spawned worker",
    "Worker received: Ping",
    "Main received: Pong"
  ]
};
