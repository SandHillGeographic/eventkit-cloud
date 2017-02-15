import React from 'react';
import { render } from 'react-dom';
import configureStore from './store/configureStore';
import { Provider } from 'react-redux';
import { browserHistory, Router, Route, IndexRoute } from 'react-router'
import { syncHistoryWithStore, routerActions, routerMiddleware } from 'react-router-redux'
import Application from './components/Application'
import LoginPage from './components/login/LoginPage'
import Loading from './components/login/Loading'
import About from './components/About'
import Exports from './components/Exports'
import Export from './components/Export'
import CreateExport from './components/CreateExport'
import ExportAOI from './components/ExportAOI'
import ExportInfo from './components/ExportInfo'
import { UserAuthWrapper } from 'redux-auth-wrapper'
import { applyMiddleware } from 'redux'


const store = configureStore();
const history = syncHistoryWithStore(browserHistory, store)

const UserIsAuthenticated = UserAuthWrapper({
    authSelector: state => state.user.data,
    authenticatingSelector: state => state.user.isLoading,
    LoadingComponent: Loading,
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsAuthenticated'
})

const UserIsNotAuthenticated = UserAuthWrapper({
    authSelector: state => state.user,
    redirectAction: routerActions.replace,
    wrapperDisplayName: 'UserIsNotAuthenticated',
    // Want to redirect the user when they are done loading and authenticated
    predicate: user => user.data === null && user.isLoading === false,
    failureRedirectPath: (state, ownProps) => (ownProps.location.query.redirect || ownProps.location.query.next) || '/exports',
    allowRedirectBack: false
})

const Authenticated = UserIsAuthenticated((props) => React.cloneElement(props.children, props));

render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Application}>
                <Route path="/login" component={UserIsNotAuthenticated(LoginPage)}/>
                <Route component={Authenticated}>
                    <Route path="/exports" component={Exports}>
                        <Route path="/export/:uid" component={Export}/>
                    </Route>
                    <Route path="/create" component={CreateExport}>
                        <Route path="/exportAOI" component={ExportAOI}/>
                        <Route path="/exportInfo" component={ExportInfo}/>
                    </Route>
                </Route>
                <Route path="/about" component={About}/>
            </Route>
        </Router>
    </Provider>,
    document.getElementById('root')
)


