import React, { Component } from 'react';
import PropTypes from 'prop-types';
import css from '../../styles/ol3map.css';

export class ZoomLevelLabel extends Component {
    render() {
        const zoomLevel = Math.floor(this.props.zoomLevel);

        return (
            <div className={css.olZoomLevel}>Zoom Level: {zoomLevel}</div>
        );
    }
}

ZoomLevelLabel.propTypes = {
    zoomLevel: PropTypes.number.isRequired,
};

export default ZoomLevelLabel;
