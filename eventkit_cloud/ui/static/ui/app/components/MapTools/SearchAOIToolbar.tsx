import React from 'react';
import {getGeocode, types} from '../../actions/geocodeActions';
import {connect} from "react-redux";
import {createStyles, Theme, withStyles, withTheme} from '@material-ui/core/styles';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import '../../styles/typeaheadStyles.css';
import debounce from 'lodash/debounce';
import CircularProgress from '@material-ui/core/CircularProgress';
import {Menu, Typeahead} from 'react-bootstrap-typeahead';
import TypeaheadMenuItem from './TypeaheadMenuItem';
import SearchAOIButton from './SearchAOIButton';

const jss = (theme: Theme & Eventkit.Theme) => createStyles({
    container: {
        zIndex: 2,
        position: 'absolute',
        width: 'calc(100% - 70px)',
        minWidth: '300px',
        maxWidth: '700px',
        height: '50px',
        top: '1em',
        left: '10px',
        backgroundColor: theme.eventkit.colors.secondary,
        borderRadius: '5px',
        display: 'inline-grid',
        boxShadow: '0px 3px 15px rgba(0, 0, 0, 0.2)',
    },
    buttonContainer: {
        position: 'absolute',
        left: '0px',
        width: '50px',
        height: '50px',
        borderRight: '1px solid rgba(112, 114, 116, 1)',
    },
    error: {
        color: theme.eventkit.colors.warning,
        padding: '16px',
        userSelect: 'none',
        cursor: 'default',
        borderTop: '1px solid rgba(112, 114, 116, .4)',
        borderBottom: '1px solid rgba(112, 114, 116, .4)',
    },
    empty: {
        padding: '16px',
        userSelect: 'none',
        cursor: 'default',
        borderTop: '1px solid rgba(112, 114, 116, .4)',
        borderBottom: '1px solid rgba(112, 114, 116, .4)',
    },
    loading: {
        position: 'absolute',
        width: '50px',
        height: '100%',
        left: '0px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    spinnerContainer: {
        zIndex: 3,  // Make sure spinner can float above the text box.
        position: 'absolute',
        right: '12px',
        bottom: '13px',
        width: '25px',
    },
    spinner: {
        float: 'right',
    },
});

interface Props {
    toolbarIcons: any;
    geocode: {
        cancelSource: boolean;
        data: any;
        error: any;
        fetched: boolean;
        fetching: boolean;
        empty: boolean;
    };
    setFetchingGeocode: () => void;
    setGeocodeEmpty: () => void;
    getGeocode: (any) => void;
    handleSearch: (any) => any;
    handleCancel: () => void;
    setAllButtonsDefault: () => void;
    setSearchAOIButtonSelected: () => void;
    containerStyle: any;
    theme: any;
    classes: { [className: string]: string };
}

interface State {
    suggestions: any[];
}

export class SearchAOIToolbar extends React.Component<Props, State> {
    private typeAheadInput: React.RefObject<Typeahead>;
    static defaultProps = {
        containerStyle: {},
    };
    private debouncer;
    private minimumValue = 2;

    constructor(props) {
        super(props);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleEnter = this.handleEnter.bind(this);
        this.state = {
            suggestions: []
        };
        this.typeAheadInput = React.createRef();
    }

    componentDidMount() {
        this.debouncer = debounce(e => this.handleChange(e), 500);
    }

    componentDidUpdate(prevProps) {
        if (this.props.geocode.fetched === true && !prevProps.geocode.fetched) {
            this.setState({suggestions: this.props.geocode.data});
        } else if (!this.props.geocode.fetched && this.state.suggestions.length > 0) {
            this.setState({suggestions: []});
        }
        if (this.props.toolbarIcons.search !== prevProps.toolbarIcons.search) {
            if (this.props.toolbarIcons.search === 'DEFAULT') {
                this.typeAheadInput.current.clear();
            }
        }
    }

    handleInputChange(e) {
        this.setState({
            suggestions: []
        });
        if (this.minimumValue >= e.length) {
            this.props.setGeocodeEmpty();
        } else {
            this.props.setFetchingGeocode();
        }
        this.debouncer(e);
    }

    handleChange(e) {
        const query = e.slice(0, 1000);

        // If 2 or more characters are entered then make request for suggested names.
        if (query.length >= this.minimumValue) {
            this.props.getGeocode(query);
        }
    }

    handleEnter(e) {
        const results = e.slice(0, 1000);
        if (results.length > 0) {
            if (this.props.handleSearch(results[0])) {
                this.props.setSearchAOIButtonSelected();
            } else {
                this.props.setAllButtonsDefault();
            }
            this.typeAheadInput.current.blur();
        }
    }

    render() {
        const {classes} = this.props;

        const renderer = (results, menuProps) => {
            let content = null;
            if (this.props.geocode.error) {
                content = (
                    <div className={classes.error}>
                        ERROR: {this.props.geocode.error}
                    </div>
                );
            } else if (this.props.geocode.fetched) {
                if (this.props.toolbarIcons.search === 'SELECTED' || results.length) {
                    content = results.map((result, index) => (
                        <TypeaheadMenuItem
                            result={result}
                            index={index}
                            key={JSON.stringify(result.properties)}
                        />
                    ))
                } else {
                    content = (
                        <div className={classes.empty}>
                            No results were found.
                        </div>
                    );
                }
            }

            return (
                <Menu {...menuProps}>
                    {content}
                </Menu>
            );
        };

        return (
            <div className={classes.container}>
                <div className="typeahead">
                    <Typeahead
                        id="aoiSearchBar"
                        ref={this.typeAheadInput}
                        disabled={this.props.toolbarIcons.search === 'INACTIVE'}
                        options={this.state.suggestions}
                        onChange={this.handleEnter}
                        placeholder="Search admin boundary or location..."
                        onInputChange={this.handleInputChange}
                        labelKey="name"
                        filterBy={() => (
                            // this disables the built in filtering
                            // we dont need it since we are getting results dynamically
                            true
                        )}
                        paginate={false}
                        emptyLabel=" "
                        minLength={2}
                        renderMenu={renderer}
                        className="qa-SearchAOIToolbar-typeahead"
                    >
                        {this.props.geocode.fetching ?
                            <span className={classes.spinnerContainer}>
                                <CircularProgress
                                    size={25}
                                    color="primary"
                                    className={classes.spinner}
                                />
                            </span>
                            : null
                        }
                    </Typeahead>
                </div>
                <div className={classes.buttonContainer}>
                    <SearchAOIButton
                        buttonState={this.props.toolbarIcons.search}
                        handleCancel={this.props.handleCancel}
                        setAllButtonsDefault={this.props.setAllButtonsDefault}
                    />
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        geocode: state.geocode
    };
}

function mapDispatchToProps(dispatch) {
    return {
        getGeocode: (query) => {
            dispatch(getGeocode(query));
        },
        setFetchingGeocode: () => {
            dispatch({type: types.FETCHING_GEOCODE});
        },
        setGeocodeEmpty: () => {dispatch({type: types.FETCH_GEOCODE_EMPTY})},
    };
}

export default withTheme(withStyles<any, any>(jss)(connect(mapStateToProps, mapDispatchToProps)(SearchAOIToolbar)));