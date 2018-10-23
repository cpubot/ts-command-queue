// tslint:disable no-parameter-reassignment
import CommandQueue from '../../src/CommandQueue';
import View from '../../src/View';
import ViewDerivation from '../../src/ViewDerivation';

type Command =
  | {
      type: 'remove';
      id: string;
    }
  | {
      type: 'add';
      id: string;
    };

type ViewResult = Map<string, number>;

class MapView extends View<Command, ViewResult> {
  getInitialState() {
    return new Map();
  }

  getNextState(map: ViewResult, command: Command) {
    const currentCount = map.get(command.id) || 0;

    switch (command.type) {
      case 'add':
        if (currentCount === 1) {
          return map;
        }

        return new Map(map).set(command.id, currentCount + 1);

      case 'remove':
        if (currentCount === 0) {
          return map;
        }

        return new Map(map).set(command.id, currentCount - 1);
    }

    return map;
  }
}

class TotalCountDerivation extends ViewDerivation<ViewResult, number> {
  getInitialState() {
    return 0;
  }

  getNextState(parentState: ViewResult) {
    return Array.from(parentState.values()).reduce((sum, num) => sum + num, 0);
  }
}

describe('command queue', () => {
  context('given single command', () => {
    let value: number;

    beforeAll(() => {
      const view = new MapView();
      const derivation = new TotalCountDerivation();
      derivation.subscribe(result => {
        value = result;
      });
      view.registerDerivation(derivation);

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);
      commandQueue.push({
        id: '1',
        type: 'add',
      });
    });

    it('returns the expected result', () => {
      expect(value).toEqual(1);
    });
  });

  context('given multiple commands', () => {
    let value: number;

    beforeAll(() => {
      const view = new MapView();
      const derivation = new TotalCountDerivation();
      derivation.subscribe(result => {
        value = result;
      });
      view.registerDerivation(derivation);

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
      expect(value).toEqual(0);
    });
  });

  context('given an array of commands', () => {
    let value: number;

    beforeAll(() => {
      const view = new MapView();
      const derivation = new TotalCountDerivation();
      derivation.subscribe(result => {
        value = result;
      });
      view.registerDerivation(derivation);

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
      expect(value).toEqual(0);
    });
  });

  context.only('given no commands', () => {
    let value: number;

    beforeAll(() => {
      const view = new MapView();
      const derivation = new TotalCountDerivation();
      derivation.subscribe(result => {
        value = result;
      });
      view.registerDerivation(derivation);

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(view);
    });

    it('receives the default state', () => {
      expect(value).toEqual(0);
    });
  });

  context.only('given late subscribed view', () => {
    let value: number;

    beforeAll(async () => {
      const commandQueue = new CommandQueue<Command>();

      commandQueue.push({
        id: '1',
        type: 'add',
      });

      const view = new MapView();
      const derivation = new TotalCountDerivation();

      commandQueue.registerView(view);
      view.registerDerivation(derivation);

      await new Promise(resolve =>
        setTimeout(() => {
          derivation.subscribe(result => {
            value = result;
            resolve();
          });
        }, 10)
      );
    });

    it('receives the default state', () => {
      expect(value).toEqual(1);
    });
  });
});
