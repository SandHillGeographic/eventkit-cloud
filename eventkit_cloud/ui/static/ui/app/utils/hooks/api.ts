import {Reducer, useCallback, useReducer} from "react";
import axios from "axios";
import {ensureErrorShape} from "../generic";


export enum ACTIONS {
    FETCHING='fetching',
    SUCCESS='success',
    ERROR='error',
    CANCEL='cancel',
    NOT_FIRED='not_fired',
}

export enum FileStatus {
    COMPLETED = "COMPLETED",  // Used for runs when all tasks were successful
    INCOMPLETE = "INCOMPLETE",  // Used for runs when one or more tasks were unsuccessful
    SUBMITTED = "SUBMITTED",  // Used for runs that have not been started

    PENDING = "PENDING",  // Used for tasks that have not been started
    RUNNING = "RUNNING", // Used for tasks that have been started
    CANCELED = "CANCELED",  // Used for tasks that have been CANCELED by the user
    SUCCESS = "SUCCESS",  // Used for tasks that have successfully completed
    FAILED = "FAILED"
}

export class ApiStatuses {
    static readonly hookActions = ACTIONS;
    static readonly files = FileStatus;
    static readonly finishedStates = [FileStatus.COMPLETED, FileStatus.INCOMPLETE, FileStatus.CANCELED,
        FileStatus.SUCCESS, FileStatus.FAILED];
    static readonly inProgressStates = [FileStatus.PENDING, FileStatus.RUNNING, FileStatus.SUBMITTED];

    static readonly isFetching = (status: any) => status === ACTIONS.FETCHING;
    static readonly isSuccess = (status: any) => status === ACTIONS.SUCCESS;
    static readonly isNotFired = (status: any) => status === ACTIONS.NOT_FIRED;
    static readonly isError = (status: any) => status === ACTIONS.ERROR;
}

interface RequestState {
    status?: any,
    response?: any
    onCancel?: () => void;
}

const initialState = {
    status: ACTIONS.NOT_FIRED, response: {}, onCancel: () => {
    }
} as RequestState;

function submitReducer(state = initialState, {type = undefined, response = undefined, onCancel = undefined} = {}): RequestState {
    switch (type) {
        case ACTIONS.FETCHING:
            return {...initialState, status: ACTIONS.FETCHING, onCancel: onCancel ? onCancel : initialState.onCancel};
        case ACTIONS.SUCCESS:
            return {...state, status: ACTIONS.SUCCESS, response};
        case ACTIONS.ERROR:
            return {...state, status: ACTIONS.ERROR, response};
        case ACTIONS.CANCEL:
            return {...initialState};
        default:
            return state;
    }
}

interface Dispatcher {
    fetching: (onCancel: () => void) => void;
    success: (response) => void;
    error: (response) => void;
    cancel: () => void;
}

interface ApiAction extends RequestState {
    type: ACTIONS;
}

// Async request hook with more fine grained ability to control the request.
export function useAsyncRequest_Control(): [RequestState, Dispatcher] {
    const [state, dispatch] = useReducer<Reducer<RequestState, ApiAction>>(submitReducer, initialState);
    const dispatches = {
        fetching: (onCancel: () => void) => dispatch({onCancel, type: ACTIONS.FETCHING}),
        success: (response) => dispatch({type: ACTIONS.SUCCESS, response}),
        error: (response) => dispatch({type: ACTIONS.ERROR, response}),
        cancel: () => {
            if (state.onCancel) {
                state.onCancel();
            }
            dispatch({type: ACTIONS.CANCEL})
        },
    };
    return [state, dispatches]
}

export function useAsyncRequest(cancelMessage=''): [RequestState, (params: any) => Promise<void>, () => void] {
    const [state, dispatches] = useAsyncRequest_Control();
    const makeRequest = useCallback(async (params: any) => {
        const CancelToken = axios.CancelToken;
        const source = CancelToken.source();
        dispatches.fetching(() => source.cancel(cancelMessage));
        try {
            const response = await axios({
                ...params,
                cancelToken: source.token,
            });
            dispatches.success(response);
            return response;
        } catch (e) {
            dispatches.error(ensureErrorShape(e));
        }
    }, []);
    return [state, makeRequest as any, dispatches.cancel];
}