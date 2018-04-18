import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AlertWarning from 'material-ui/svg-icons/alert/warning';
import AlertError from 'material-ui/svg-icons/alert/error';
import ActionDone from 'material-ui/svg-icons/action/done';
import CircularProgress from 'material-ui/CircularProgress';
import BaseTooltip from '../BaseTooltip';

export class ProviderStatusIcon extends Component {

    constructor(props) {
        super(props);
        this.state = {
            tooltipOpen: false,
        };
    }

    onClick(e) {
        if (typeof this.props.onClick === 'function') {
            this.props.onClick(e);
        }
        this.handleTooltipOpen(e);
    }

    handleTooltipOpen(e) {
        this.setState({ tooltipOpen: true });
        return false;
    }

    handleTooltipClose(e) {
        this.setState({ tooltipOpen: false });
        return false;
    }

    render() {
        var style = {
            base: {
                display: 'inline-block',
                position: 'absolute',
                ...this.props.baseStyle,
            },
            icon: {
                verticalAlign: 'top',
                marginTop: '-5px',
                pointerEvents: 'all',
                ...this.props.iconStyle,
            },
        };

        let avail = this.props.availability.status ?
                this.props.availability :
                {status: "PENDING", type: "PENDING", message: "This data provider's availability is being checked."};

        let StatusIcon;
        let title;
        let messagePrefix;
        let otherProps = {};
        switch (avail.status.toUpperCase()) {
            case 'SUCCESS':
                style.icon['color'] = 'rgba(0, 192, 0, 0.87)';
                StatusIcon = ActionDone;
                title = "Success";
                messagePrefix = "No problems: ";
                break;
            case 'ERR':
                style.icon['color'] = 'rgba(192, 0, 0, 0.87)';
                StatusIcon = AlertError;
                title = "Almost Certain Failure";
                messagePrefix = "Availability unlikely: ";
                break;
            case 'WARN':
                style.icon['color'] = 'rgba(255, 162, 0, 0.87)';
                StatusIcon = AlertWarning;
                title = "Possible Failure";
                messagePrefix = "Availability compromised: ";
                break;
            case 'PENDING':
            default:
                style.icon['color'] = 'rgba(0, 0, 0, 0.87)';
                StatusIcon = CircularProgress;
                title = "Checking Availability"
                messagePrefix = "";
                otherProps = {thickness: 2};
                break;
        }

        let message = messagePrefix + avail.message;
        const tooltipOffset = window.innerWidth<777 ? (777-window.innerWidth)/3+'px' : '0px'

        return (
            <div style={style.base} className='qa-ProviderStatusIcon' >
                <StatusIcon
                    style={style.icon}
                    title={this.props.availability.message}
                    onClick={this.onClick.bind(this)}
                    onMouseOver={this.handleTooltipOpen.bind(this)}
                    onMouseOut={this.handleTooltipClose.bind(this)}
                    onTouchStart={this.handleTooltipOpen.bind(this)}
                    onTouchEnd={this.handleTooltipClose.bind(this)}
                    size={20}  color={style.icon['color']}
                    {...otherProps}
                />
                <BaseTooltip
                    show={this.state.tooltipOpen}
                    title={title}
                    tooltipStyle={{
                        bottom: '36px',
                        left: 'calc(-157px - '+ tooltipOffset + ')',
                        ...this.props.tooltipStyle,
                    }}
                    arrowStyle={{
                        left: 'calc(50% + '+tooltipOffset + ')',
                        ...this.props.arrowStyle,
                    }}
                    onMouseOver={this.handleTooltipOpen.bind(this)}
                    onMouseOut={this.handleTooltipClose.bind(this)}
                    onClick={this.onClick.bind(this)}
                >
                    <div>{message}</div>
                </BaseTooltip>
            </div>
        );
    }
}

ProviderStatusIcon.propTypes = {
    availability: PropTypes.object.isRequired,
}

export default ProviderStatusIcon;
