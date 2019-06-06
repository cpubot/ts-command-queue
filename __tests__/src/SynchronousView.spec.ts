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

type ViewResult = Set<string>;

class SynchronousView extends View<Command, ViewResult> {
  getInitialState() {
    return new Set<string>();
  }

  getNextState(set: ViewResult, command: Command) {
    switch (command.type) {
      case 'add':
        if (!set.has(command.id)) {
          set.add(command.id);
          set = new Set(set);
        }
        break;
      case 'remove':
        if (set.has(command.id)) {
          set.delete(command.id);
          set = new Set(set);
        }
        break;
    }

    return set;
  }
}

describe('command queue', () => {
  context('given single command', () => {
    let value: ViewResult;

    beforeAll(async () => {
      const view = new SynchronousView();
      view.subscribe(result => {
        value = result;
      });
      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);
      commandQueue.push({
        id: '1',
        type: 'add',
      });
    });

    it('returns the expected result', () => {
      expect(value).toEqual(new Set(['1']));
    });
  });

  context('given multiple commands', () => {
    let value: ViewResult;

    beforeAll(() => {
      const view = new SynchronousView();
      view.subscribe(result => {
        value = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);

      commandQueue.push({
        id: '1',
        type: 'add',
      });
      commandQueue.push({
        id: '1',
        type: 'remove',
      });
    });

    it('executes in correct order', () => {
      expect(value).toEqual(new Set());
    });
  });

  context('given an array of commands', () => {
    let value: ViewResult;

    beforeAll(() => {
      const view = new SynchronousView();
      view.subscribe(result => {
        value = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);

      commandQueue.push([
        {
          id: '1',
          type: 'add',
        },
        {
          id: '1',
          type: 'remove',
        },
      ]);
    });

    it('executes in correct order', () => {
      expect(value).toEqual(new Set());
    });
  });

  context('given no commands', () => {
    let value: ViewResult;

    beforeAll(() => {
      const view = new SynchronousView();
      view.subscribe(result => {
        value = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);
    });

    it('receives the default state', () => {
      expect(value).toEqual(new Set());
    });
  });

  context('given late subscribed view', () => {
    let value: ViewResult;

    beforeAll(async () => {
      const commandQueue = new CommandQueue<Command>();
      const view = new SynchronousView();
      commandQueue.registerView(view);

      await new Promise(resolve =>
        setTimeout(() => {
          view.subscribe(result => {
            value = result;
          });
          resolve();
        }, 10)
      );
    });

    it('receives the default state', () => {
      expect(value).toEqual(new Set());
    });
  });
});
