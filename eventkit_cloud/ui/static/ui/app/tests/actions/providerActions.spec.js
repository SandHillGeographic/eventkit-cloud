import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import createTestStore from '../../store/configureTestStore';
import * as actions from '../../actions/providerActions';

describe('provider actions', () => {
    it('getProviders should return providers from the api', () => {
        const mock = new MockAdapter(axios, { delayResponse: 1 });
        mock.onGet('/api/providers').reply(200, ['my providers']);

        const expectedActions = [
            { type: actions.types.GETTING_PROVIDERS },
            { type: actions.types.PROVIDERS_RECEIVED, providers: ['my providers'] },
        ];
        const store = createTestStore({});
        return store.dispatch(actions.getProviders())
            .then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
    });

    it('getProviders should handle errors', () => {
        const mock = new MockAdapter(axios, { delayResponse: 1 });
        mock.onGet('/api/providers').reply(400);

        const expectedActions = [
            { type: actions.types.GETTING_PROVIDERS },
        ];
        const store = createTestStore({});
        return store.dispatch(actions.getProviders())
            .then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
    });

    it('cancelProviderTask should dispatch canceling and canceled actions', () => {
        const mock = new MockAdapter(axios, { delayResponse: 10 });

        mock.onPatch('/api/provider_tasks/123456789').reply(204);
        const expectedActions = [
            { type: actions.types.CANCELING_PROVIDER_TASK },
            { type: actions.types.CANCELED_PROVIDER_TASK },
        ];

        const store = createTestStore({ cancelProviderTask: {} });

        return store.dispatch(actions.cancelProviderTask('123456789'))
            .then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
    });

    it('cancelProviderTask should dispatch an error', () => {
        const mock = new MockAdapter(axios, { delayResponse: 10 });

        mock.onPatch('/api/provider_tasks/123').reply(400, 'oh no an error');
        const expectedActions = [
            { type: actions.types.CANCELING_PROVIDER_TASK },
            { type: actions.types.CANCEL_PROVIDER_TASK_ERROR, error: 'oh no an error' },
        ];

        const store = createTestStore({ cancelProviderTask: {} });

        return store.dispatch(actions.cancelProviderTask('123'))
            .then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
    });
});