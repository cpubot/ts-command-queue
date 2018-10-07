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

type MapViewResult = Map<string, boolean>;

class MapView extends View<Command, MapViewResult> {
  getInitialState() {
    return new Map();
  }

  getNextState(map: MapViewResult, command: Command) {
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

    return map;
  }
}

type ArrayViewResult = string[];

class ArrayView extends View<Command, ArrayViewResult> {
  getInitialState() {
    return [] as string[];
  }

  getNextState(array: ArrayViewResult, command: Command) {
    switch (command.type) {
      case 'add':
        if (array.indexOf(command.id) === -1) {
          array.push(command.id);
          array = [...array];
        }
        break;
      case 'remove':
        const index = array.indexOf(command.id);
        if (index !== -1) {
          array.splice(index, 1);
          array = [...array];
        }
        break;
    }

    return array;
  }
}

describe('command queue', () => {
  context('given single command', () => {
    let mapViewValue: MapViewResult;
    let arrayViewValue: ArrayViewResult;

    beforeAll(() => {
      const mapView = new MapView();
      mapView.subscribe(result => {
        mapViewValue = result;
      });
      const arrayView = new ArrayView();
      arrayView.subscribe(result => {
        arrayViewValue = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(mapView);
      commandQueue.registerView(arrayView);

      commandQueue.push({
        id: '1',
        type: 'add',
      });
    });

    it('returns the expected result', () => {
      expect(mapViewValue).toEqual(new Map([['1', true]]));
    });

    it('returns the expected result', () => {
      expect(arrayViewValue).toEqual(['1']);
    });
  });

  context('given multiple commands', () => {
    let mapViewValue: MapViewResult;
    let arrayViewValue: ArrayViewResult;

    beforeAll(() => {
      const mapView = new MapView();
      mapView.subscribe(result => {
        mapViewValue = result;
      });
      const arrayView = new ArrayView();
      arrayView.subscribe(result => {
        arrayViewValue = result;
      });

      const commandQueue = new CommandQueue<Command>();
      commandQueue.registerView(mapView);
      commandQueue.registerView(arrayView);

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
      expect(mapViewValue).toEqual(new Map());
    });

    it('executes in correct order', () => {
      expect(arrayViewValue).toEqual([]);
    });
  });
});
