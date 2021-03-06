import * as React from 'react';
import AlertWarning from '@material-ui/icons/Warning';
import AlertError from '@material-ui/icons/Error';
import ActionDone from '@material-ui/icons/Done';
import CircularProgress from '@material-ui/core/CircularProgress';
import Popover from '@material-ui/core/Popover';
import Typography from '@material-ui/core/Typography';
import BaseDialog from '../Dialog/BaseDialog';
import {useState} from "react";
import {createStyles, IconButton, Theme, withStyles} from "@material-ui/core";
import CloseIcon from '@material-ui/icons/Close';
import axios from "axios";
import {getCookie} from "../../utils/generic";
import {useAsyncRequest} from "../../utils/hooks/api";

const jss = (theme: Eventkit.Theme & Theme) => createStyles({
    iconBtn: {
        float: 'right' as 'right',
        color: theme.eventkit.colors.primary,
        marginTop: '-7px',
    },
    closeIcon: {
        backgroundColor: theme.eventkit.colors.white,
    },
    popoverTitle: {
        color: theme.eventkit.colors.primary,
        fontWeight: 300,
    }
});

interface Props extends React.HTMLAttributes<HTMLElement> {
    availability: {
        status: string;
        type: string;
        message: string;
        slug: string;
    }
    provider: Eventkit.Provider;
    geojson: GeoJSON.FeatureCollection;
    overSize: boolean;
    overArea: boolean;
    aoiArea: number;
    providerInfo: Eventkit.Store.ProviderInfo;
    providerHasEstimates: boolean;
    areEstimatesLoading: boolean;
    supportsZoomLevels: boolean;
    baseStyle?: any;
    iconStyle?: any;
    classes: { [className: string]: string };
    theme: Eventkit.Theme & Theme;
}

enum STATUS {
    SUCCESS = 'SUCCESS',
    FATAL = 'FATAL',
    ERR = 'ERR',
    WARN = 'WARN',
    PENDING = 'PENDING',
    ESTIMATES_PENDING = 1,
    OVER_DATA_SIZE,
    OVER_AREA_SIZE
}

ProviderStatusCheck.defaultProps = {availability: {status: '', type: '', message: ''}} as Props;

const CancelToken = axios.CancelToken;
const source = CancelToken.source();

export function ProviderStatusCheck(props: Props) {
    const {
        areEstimatesLoading, providerHasEstimates,
        aoiArea, providerInfo, provider, geojson
    } = props;
    const [anchorElement, setAnchor] = useState(null);
    const [isSubmissionOpen, setSubmissionOpen] = useState(false);
    const [{status: requestStatus, response}, requestCall] = useAsyncRequest();
    const {classes} = props;

    const csrfmiddlewaretoken = getCookie('csrftoken');
    const makeRequest = async () => {
        const estimatedSize = providerInfo.estimates.size;
        requestCall({
            url: `/api/providers/requests/size`,
            method: 'post',
            data: {
                provider: provider.id,
                selection: geojson,
                requested_aoi_size: Math.round(aoiArea),
                requested_data_size: estimatedSize ? Math.trunc(estimatedSize.value) : undefined,
            },
            headers: {'X-CSRFToken': csrfmiddlewaretoken},
            cancelToken: source.token,
        });
    };

    function handlePopoverOpen(e: { currentTarget: any }) {
        setAnchor(e.currentTarget);
    }

    function handlePopoverClose() {
        setAnchor(null);
    }

    async function handleSubmissionOpen() {
        if (Object.keys(props.geojson).length === 0) {
            return null;
        }
        await makeRequest();
        setSubmissionOpen(true);
    }

    function handleSubmissionClose() {
        setSubmissionOpen(false);
    }

    function handleErrorMessage(response) {
        const {data} = response.response;
        return (
            data.errors.map((error, ix) => (
                <span key={ix} title={error.title}>
                    {error.title}
                </span>
            ))
        )
    }

    const style = {
        base: {
            ...props.baseStyle,
        },
        icon: {
            verticalAlign: 'top',
            ...props.iconStyle,
        },
    };

    const avail = props.availability.status ?
        props.availability :
        {status: 'PENDING', type: 'PENDING', message: "This data provider's availability is being checked."};


    let StatusIcon;
    let title;
    let message;
    const makeMessage = (prefix: string, useMessage = true) => prefix + ((useMessage) ? avail.message : '');
    let otherProps = {};
    let status = avail.status as STATUS;

    if (status === STATUS.FATAL && avail.type !== 'SELECTION_TOO_LARGE') {
        style.icon.color = 'rgba(128, 0, 0, 0.87)';
        StatusIcon = AlertError;
        message = makeMessage('');
        title = 'CANNOT SELECT';
    } else {
        if (areEstimatesLoading) {
            status = STATUS.ESTIMATES_PENDING;
        } else {
            if (providerHasEstimates) {
                if (props.overSize) {
                    status = STATUS.OVER_DATA_SIZE;
                } else if (status === STATUS.WARN && avail.type === 'SELECTION_TOO_LARGE') {
                    status = STATUS.SUCCESS;
                    message = makeMessage('No problems: Export should proceed without issues.', false);
                }
            } else {
                if (props.overArea) {
                    status = STATUS.OVER_AREA_SIZE;
                }
            }
        }
        switch (status) {
            case STATUS.SUCCESS:
                style.icon.color = 'rgba(0, 192, 0, 0.87)';
                StatusIcon = ActionDone;
                title = 'SUCCESS';
                if (!message) {
                    message = makeMessage('No problems: ');
                }
                break;
            case STATUS.ERR:
                style.icon.color = 'rgba(192, 0, 0, 0.87)';
                StatusIcon = AlertError;
                title = 'ALMOST CERTAIN FAILURE';
                message = makeMessage('Availability unlikely: ');
                break;
            case STATUS.WARN:
                style.icon.color = 'rgba(255, 162, 0, 0.87)';
                StatusIcon = AlertWarning;
                title = 'POSSIBLE FAILURE';
                message = makeMessage('Availability compromised: ');
                break;
            case STATUS.OVER_AREA_SIZE:
                style.icon.color = 'rgba(192, 0, 0, 0.87)';
                StatusIcon = AlertError;
                title = 'AOI TOO LARGE';
                message = makeMessage('The selected AOI is larger than the maximum allowed size for this provider.', false);
                break;
            case STATUS.OVER_DATA_SIZE:
                style.icon.color = 'rgba(192, 0, 0, 0.87)';
                StatusIcon = AlertError;
                title = 'MAX DATA SIZE EXCEEDED';
                if (props.supportsZoomLevels) {
                    message = makeMessage('Estimated size too large. Please adjust zoom levels or your AOI to reduce.', false);
                } else {
                    message = makeMessage('Estimated size too large. Please adjust your AOI to reduce.', false);
                }
                break;
            case STATUS.ESTIMATES_PENDING:
            case STATUS.PENDING:
            default:
                StatusIcon = CircularProgress;
                title = 'CHECKING AVAILABILITY';
                message = makeMessage('');
                otherProps = {thickness: 2, size: 20, color: 'primary'};
                break;
        }
    }

    let popoverBlock;
    const openEl = Boolean(anchorElement);
    const id = open ? 'simple-popover' : undefined;
    if (status !== STATUS.OVER_DATA_SIZE && status !== STATUS.OVER_AREA_SIZE) {
        popoverBlock = (
            <div style={style.base} className="qa-ProviderStatusIcon">
                <StatusIcon
                    style={style.icon}
                    title={props.availability.message}
                    onMouseEnter={handlePopoverOpen}
                    onMouseLeave={handlePopoverClose}
                    {...otherProps}
                />
                <Popover
                    style={{pointerEvents: 'none'}}
                    PaperProps={{
                        style: {padding: '16px'},
                    }}
                    open={!!anchorElement}
                    anchorEl={anchorElement}
                    onClose={handlePopoverClose}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                >
                    <div style={{maxWidth: 400}}>
                        <Typography variant="h6" gutterBottom style={{fontWeight: 600}}>
                            {title}
                        </Typography>
                        <div>{message}</div>
                    </div>
                </Popover>
            </div>
        )
    } else {
        popoverBlock = (
            <div style={style.base} className="qa-ProviderStatusIcon">
                <StatusIcon
                    className="qa-ProviderStatusErrorIcon"
                    style={style.icon}
                    title={props.availability.message}
                    onClick={handlePopoverOpen}
                    {...otherProps}
                />
                <Popover
                    id={id}
                    PaperProps={{
                        style: {padding: '16px'},
                    }}
                    open={openEl}
                    anchorEl={anchorElement}
                    onClose={handlePopoverClose}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                >
                    <div style={{maxWidth: 400, width: 350}}>
                        <Typography variant="h6" gutterBottom style={{fontWeight: 600}}>
                            {title}
                            <IconButton
                                className={classes.iconBtn}
                                type='button'
                                onClick={handlePopoverClose}
                            >
                                <CloseIcon className={classes.closeIcon}/>
                            </IconButton>
                        </Typography>
                        <div>{message}</div>
                        <br/>
                        <span
                            className={classes.popoverTitle}
                            role="button"
                            onClick={handleSubmissionOpen}
                            onKeyPress={handleSubmissionOpen}
                        >
                            Request Larger AOI Limit
                        </span>
                        <span>
                            <BaseDialog
                                actionsStyle={{
                                    margin: 'auto',
                                    flexDirection: 'initial',
                                    justifyContent: 'initial',
                                    paddingBottom: '20px',
                                }}
                                titleStyle={{display: 'None'}}
                                bodyStyle={{padding: '35px 0px', textAlign: 'center', color: '#000'}}
                                buttonText="OK"
                                show={isSubmissionOpen}
                                onClose={handleSubmissionClose}
                            >
                                <div>
                                    {requestStatus !== 'error' && (
                                        <>
                                            {requestStatus === 'pending' && (
                                                <div>Pending Request</div>
                                            )}
                                            {requestStatus === 'success' && (
                                                <div>
                                                    <strong>Your increased data request has been submitted.</strong>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {requestStatus === 'error' && (
                                        <div>
                                            Request Failure due to {handleErrorMessage(response)}.
                                        </div>
                                    )}
                                </div>
                            </BaseDialog>
                        </span>
                    </div>
                </Popover>
            </div>
        )
    }

    return (
        <div style={style.base} className="qa-ProviderStatusIcon">
            {popoverBlock}
        </div>
    );
}

export default withStyles(jss)(ProviderStatusCheck);
