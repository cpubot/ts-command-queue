// tslint:disable no-parameter-reassignment
import CommandQueue from '../../src/CommandQueue';
import View from '../../src/View';

type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };

const WAIT_TIME = 10;

type ViewResult = Map<string, boolean>;

class AsynchronousView extends View<Command, ViewResult> {
  getInitialState() {
    return new Promise<ViewResult>(resolve => {
      setTimeout(() => {
        resolve(new Map());
      }, WAIT_TIME);
    });
  }

  getNextState(map: ViewResult, command: Command) {
    return new Promise<ViewResult>(resolve => {
      setTimeout(() => {
        switch (command.type) {
          case 'add':
            if (!map.has(command.id)) {
              map.set(command.id, true);
              map = new Map(map);
            }
            break;
          case 'remove':
            if (map.has(command.id)) {
              map.delete(command.id);
              map = new Map(map);
            }
            break;
        }

        resolve(map);
      }, WAIT_TIME);
    });
  }
}

const TEST_WAIT_BUFFER = 20;

describe('command queue', () => {
  context('given single command', () => {
    let value: ViewResult;

    beforeAll(async () => {
      const view = new AsynchronousView();
      view.subscribe(result => {
        value = result;
      });
      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);

      const commands = [
        {
          id: '1',
          type: 'add',
        },
      ];

      commands.forEach(commandQueue.push.bind(commandQueue));

      await new Promise(resolve =>
        setTimeout(
          resolve,
          (commands.length + 1) * WAIT_TIME + TEST_WAIT_BUFFER
        )
      );
    });

    it('returns the expected result', () => {
      expect(value).toEqual(new Map([['1', true]]));
    });
  });

  context('given multiple commands', () => {
    let value: ViewResult;

    beforeAll(async () => {
      const view = new AsynchronousView();
      view.subscribe(result => {
        value = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);

      const commands = [
        {
          id: '1',
          type: 'add',
        },
        {
          id: '1',
          type: 'remove',
        },
      ];

      commands.forEach(commandQueue.push.bind(commandQueue));

      await new Promise(resolve =>
        setTimeout(
          resolve,
          (commands.length + 1) * WAIT_TIME + TEST_WAIT_BUFFER
        )
      );
    });

    it('executes in correct order', () => {
      expect(value).toEqual(new Map());
    });
  });
});
